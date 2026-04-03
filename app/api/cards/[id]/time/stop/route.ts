import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { stopTimer } from "@/lib/time-tracking/timer";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: cardId } = await params;

  // Verify card exists and user is a board member
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
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

  try {
    const entry = await stopTimer(user.id, cardId);

    logActivity({
      boardId: card.list.boardId,
      userId: user.id,
      action: "timer.stopped",
      entityType: "card",
      entityId: cardId,
      metadata: { cardTitle: card.title, duration: entry.duration },
    });

    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: "no active timer for this card" }, { status: 400 });
  }
}
