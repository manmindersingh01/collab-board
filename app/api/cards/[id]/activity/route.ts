import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// ── GET /api/cards/[id]/activity — per-card activity history ──

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: cardId } = await params;

  // Verify user has access to this card's board
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      list: {
        select: {
          boardId: true,
          board: {
            select: {
              members: {
                where: { userId: user.id },
                select: { role: true },
              },
            },
          },
        },
      },
    },
  });

  if (!card || card.list.board.members.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const activities = await prisma.activityLog.findMany({
    where: { entityId: cardId, entityType: "card" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(activities);
}
