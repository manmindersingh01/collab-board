import prisma from "@/lib/prisma";
import { authenticateAndLimit, apiSuccess, apiError } from "@/lib/api-keys/v1-helpers";
import { logActivity } from "@/lib/activity";

type Ctx = { params: Promise<{ id: string; cardId: string }> };

export async function POST(req: Request, ctx: Ctx) {
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
  const { listId, position } = body;

  if (!listId) return apiError("VALIDATION", "listId is required", 400);
  if (position === undefined) return apiError("VALIDATION", "position is required", 400);

  const targetList = await prisma.list.findUnique({ where: { id: listId } });
  if (!targetList || targetList.boardId !== boardId) {
    return apiError("NOT_FOUND", "Target list not found in this board", 404);
  }

  await prisma.$executeRaw`
    UPDATE "Card" SET "listId" = ${listId}, "position" = ${position}, "updatedAt" = NOW() WHERE "id" = ${cardId}
  `;

  const moved = await prisma.card.findUniqueOrThrow({
    where: { id: cardId },
    include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
  });

  logActivity({
    boardId,
    userId: auth.userId,
    action: "card.moved",
    entityType: "card",
    entityId: cardId,
    metadata: { fromListId: existing.listId, toListId: listId, source: "api" },
  });

  return apiSuccess(moved, auth.rateLimit);
}
