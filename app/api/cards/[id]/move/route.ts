import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { emitCardMoved } from "@/lib/realtime-emitters";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: cardId } = await params;
  const body = await req.json();
  const { listId, position } = body;

  if (!listId || typeof position !== "number") {
    return NextResponse.json(
      { error: "listId and position are required" },
      { status: 400 },
    );
  }

  // Verify the card exists and user has Editor+ access on its CURRENT board
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: {
        include: {
          board: {
            include: {
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

  if (card.list.board.members[0].role === "viewer") {
    return NextResponse.json(
      { error: "viewers cannot move cards" },
      { status: 403 },
    );
  }

  // If moving to a different list, verify it belongs to the same board
  if (listId !== card.listId) {
    const targetList = await prisma.list.findUnique({
      where: { id: listId },
      select: { boardId: true },
    });

    if (!targetList || targetList.boardId !== card.list.board.id) {
      return NextResponse.json(
        { error: "target list not found" },
        { status: 404 },
      );
    }
  }

  // Raw SQL update (Prisma update is blocked by Unsupported vector column)
  await prisma.$executeRaw`
    UPDATE "Card"
    SET "listId" = ${listId}, "position" = ${position}, "updatedAt" = NOW()
    WHERE "id" = ${cardId}
  `;

  // Log cross-list moves
  if (listId !== card.listId) {
    const targetList = await prisma.list.findUnique({
      where: { id: listId },
      select: { title: true },
    });
    logActivity({
      boardId: card.list.board.id,
      userId: user.id,
      action: "card.moved",
      entityType: "card",
      entityId: cardId,
      metadata: {
        cardTitle: card.title,
        fromList: card.list.title,
        toList: targetList?.title ?? "Unknown",
      },
    });
  }

  // Real-time broadcast (fire-and-forget)
  emitCardMoved(card.list.board.id, user.id, cardId, card.listId, listId, position);

  return NextResponse.json({ success: true }, { status: 200 });
}
