import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { startTimer } from "@/lib/time-tracking/timer";
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

  // Verify card exists and user has editor+ access or is assignee
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

  const role = card.list.board.members[0].role;
  const isAssignee = card.assigneeId === user.id;

  if (role === "viewer" && !isAssignee) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const entry = await startTimer(user.id, cardId);

  logActivity({
    boardId: card.list.boardId,
    userId: user.id,
    action: "timer.started",
    entityType: "card",
    entityId: cardId,
    metadata: { cardTitle: card.title },
  });

  return NextResponse.json(entry, { status: 201 });
}
