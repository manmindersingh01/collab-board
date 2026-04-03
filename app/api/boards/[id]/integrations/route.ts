import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// GET /api/boards/[id]/integrations — list integrations for a board
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;

  // Verify membership
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const integrations = await prisma.integration.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(integrations);
}
