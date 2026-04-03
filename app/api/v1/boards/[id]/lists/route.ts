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

  const lists = await prisma.list.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    include: { _count: { select: { card: true } } },
  });

  return apiSuccess(lists, auth.rateLimit);
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
  const { title } = body;

  if (!title?.trim()) return apiError("VALIDATION", "title is required", 400);

  const agg = await prisma.list.aggregate({
    where: { boardId },
    _max: { position: true },
  });
  const position = (agg._max.position ?? 0) + 1;

  const list = await prisma.list.create({
    data: { title: title.trim(), position, boardId },
  });

  logActivity({
    boardId,
    userId: auth.userId,
    action: "list.created",
    entityType: "list",
    entityId: list.id,
    metadata: { title: title.trim(), source: "api" },
  });

  return apiCreated(list, auth.rateLimit);
}
