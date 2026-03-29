import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

// ── POST /api/cards/[id]/comments — create comment ──────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: cardId } = await params;
  const body = await req.json();
  const { message } = body;

  if (!message?.trim()) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 },
    );
  }

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

  const comment = await prisma.comment.create({
    data: {
      message: message.trim(),
      cardId,
      authorid: user.id,
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  // Activity log (fire-and-forget)
  logActivity({
    boardId: card.list.boardId,
    userId: user.id,
    action: "comment.created",
    entityType: "comment",
    entityId: comment.id,
    metadata: {
      cardId,
      cardTitle: card.title,
      preview: message.trim().slice(0, 80),
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
