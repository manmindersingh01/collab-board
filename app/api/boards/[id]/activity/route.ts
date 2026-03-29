import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

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

  const activities = await prisma.activityLog.findMany({
    where: { boardId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(activities);
}
