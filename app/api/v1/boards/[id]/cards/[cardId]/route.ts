import prisma from "@/lib/prisma";
import { authenticateAndLimit, apiSuccess, apiError } from "@/lib/api-keys/v1-helpers";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string; cardId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await authenticateAndLimit(req);
  if ("error" in auth) return auth.error;

  const { id: boardId, cardId } = await ctx.params;

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board || board.workspaceId !== auth.workspaceId) {
    return apiError("NOT_FOUND", "Board not found", 404);
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      comments: { orderBy: { createdAt: "desc" } },
      list: { select: { boardId: true } },
    },
  });

  if (!card || card.list === undefined) {
    // Verify card belongs to this board
    const cardWithList = await prisma.card.findUnique({
      where: { id: cardId },
      include: { list: true },
    });
    if (!cardWithList || cardWithList.list.boardId !== boardId) {
      return apiError("NOT_FOUND", "Card not found", 404);
    }
  }

  return apiSuccess(card, auth.rateLimit);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await authenticateAndLimit(req);
  if ("error" in auth) return auth.error;

  const { id: boardId, cardId } = await ctx.params;

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board || board.workspaceId !== auth.workspaceId) {
    return apiError("NOT_FOUND", "Board not found", 404);
  }

  const existing = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: true },
  });
  if (!existing || existing.list.boardId !== boardId) {
    return apiError("NOT_FOUND", "Card not found", 404);
  }

  const body = await req.json();
  const { title, description, priority, labels, dueDate, assigneeId } = body;

  const sets: string[] = [];
  const values: unknown[] = [];

  if (title !== undefined) { sets.push(`"title" = $${values.length + 1}`); values.push(title); }
  if (description !== undefined) { sets.push(`"description" = $${values.length + 1}`); values.push(description); }
  if (priority !== undefined) { sets.push(`"priority" = $${values.length + 1}::"Priority"`); values.push(priority); }
  if (labels !== undefined) { sets.push(`"labels" = $${values.length + 1}`); values.push(labels); }
  if (dueDate !== undefined) { sets.push(`"dueDate" = $${values.length + 1}`); values.push(dueDate ? new Date(dueDate) : null); }
  if (assigneeId !== undefined) { sets.push(`"assigneeId" = $${values.length + 1}`); values.push(assigneeId); }

  if (sets.length === 0) {
    return apiError("VALIDATION", "No fields to update", 400);
  }

  sets.push(`"updatedAt" = $${values.length + 1}`);
  values.push(new Date());

  const sql = `UPDATE "Card" SET ${sets.join(", ")} WHERE "id" = $${values.length + 1}`;
  values.push(cardId);

  await prisma.$executeRawUnsafe(sql, ...values);

  const updated = await prisma.card.findUniqueOrThrow({
    where: { id: cardId },
    include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
  });

  logActivity({
    boardId,
    userId: auth.userId,
    action: "card.updated",
    entityType: "card",
    entityId: cardId,
    metadata: { source: "api" },
  });

  return apiSuccess(updated, auth.rateLimit);
}
