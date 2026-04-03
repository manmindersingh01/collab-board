import prisma from "@/lib/prisma";
import { authenticateAndLimit, apiSuccess, apiError } from "@/lib/api-keys/v1-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const auth = await authenticateAndLimit(req);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      list: {
        orderBy: { position: "asc" },
        include: {
          card: {
            orderBy: { position: "asc" },
            include: {
              assignee: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });

  if (!board || board.workspaceId !== auth.workspaceId) {
    return apiError("NOT_FOUND", "Board not found", 404);
  }

  return apiSuccess(board, auth.rateLimit);
}
