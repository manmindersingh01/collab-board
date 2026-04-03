import prisma from "@/lib/prisma";
import { authenticateAndLimit, apiSuccess, apiError } from "@/lib/api-keys/v1-helpers";

export async function GET(req: Request) {
  const auth = await authenticateAndLimit(req);
  if ("error" in auth) return auth.error;

  const boards = await prisma.board.findMany({
    where: { workspaceId: auth.workspaceId, isArchived: false },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { members: true, list: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return apiSuccess(boards, auth.rateLimit);
}
