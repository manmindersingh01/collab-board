import prisma from "@/lib/prisma";
import { authenticateAndLimit, apiSuccess, apiCreated, apiError } from "@/lib/api-keys/v1-helpers";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await authenticateAndLimit(req);
  if ("error" in auth) return auth.error;

  const { id: boardId } = await ctx.params;

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board || board.workspaceId !== auth.workspaceId) {
    return apiError("NOT_FOUND", "Board not found", 404);
  }

  const url = new URL(req.url);
  const listId = url.searchParams.get("listId");
  const priority = url.searchParams.get("priority");
  const assigneeId = url.searchParams.get("assigneeId");
  const label = url.searchParams.get("label");

  const where: Record<string, unknown> = {
    list: { boardId },
  };
  if (listId) where.listId = listId;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (label) where.labels = { has: label };

  const cards = await prisma.card.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { position: "asc" },
  });

  return apiSuccess(cards, auth.rateLimit);
}

export async function POST(req: Request, ctx: Ctx) {
  const auth = await authenticateAndLimit(req);
  if ("error" in auth) return auth.error;

  const { id: boardId } = await ctx.params;

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board || board.workspaceId !== auth.workspaceId) {
    return apiError("NOT_FOUND", "Board not found", 404);
  }

  const body = await req.json();
  const { title, listId, description, priority, labels, dueDate } = body;

  if (!title?.trim()) return apiError("VALIDATION", "title is required", 400);
  if (!listId) return apiError("VALIDATION", "listId is required", 400);

  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list || list.boardId !== boardId) {
    return apiError("NOT_FOUND", "List not found in this board", 404);
  }

  const agg = await prisma.card.aggregate({
    where: { listId },
    _max: { position: true },
  });
  const position = (agg._max.position ?? 0) + 1;
  const id = crypto.randomUUID();
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "Card" ("id", "title", "description", "position", "priority", "labels", "dueDate", "listId", "createdAt", "updatedAt")
    VALUES (${id}, ${title.trim()}, ${description ?? null}, ${position}, ${priority ?? "NONE"}::"Priority", ${labels ?? []}, ${dueDate ? new Date(dueDate) : null}, ${listId}, ${now}, ${now})
  `;

  const card = await prisma.card.findUniqueOrThrow({
    where: { id },
    include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
  });

  logActivity({
    boardId,
    userId: auth.userId,
    action: "card.created",
    entityType: "card",
    entityId: id,
    metadata: { title: title.trim(), source: "api" },
  });

  return apiCreated(card, auth.rateLimit);
}
