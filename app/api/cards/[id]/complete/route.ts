import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
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

  // Fetch card with board membership info
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

  const role = card.list.board.members[0].role;
  const isAssignee = card.assigneeId === user.id;

  // Permission: editor/owner can complete anything; assignee can complete own card
  if (role === "viewer" && !isAssignee) {
    return NextResponse.json(
      { error: "you can only complete cards assigned to you" },
      { status: 403 },
    );
  }

  // Determine target list:
  // 1. Use card's completionListId if set (assigner's choice)
  // 2. Fallback to list titled "Done"
  // 3. Fallback to last list by position
  let targetList: { id: string; title: string } | null = null;

  if (card.completionListId) {
    const specified = await prisma.list.findUnique({
      where: { id: card.completionListId },
      select: { id: true, title: true, boardId: true },
    });
    if (specified && specified.boardId === card.list.boardId) {
      targetList = specified;
    }
  }

  if (!targetList) {
    const allLists = await prisma.list.findMany({
      where: { boardId: card.list.boardId },
      orderBy: { position: "asc" },
    });
    const done = allLists.find((l) => l.title.toLowerCase() === "done");
    targetList = done ?? allLists[allLists.length - 1] ?? null;
  }

  if (!targetList) {
    return NextResponse.json(
      { error: "no lists on this board" },
      { status: 400 },
    );
  }

  // Already there
  if (card.listId === targetList.id) {
    return NextResponse.json(
      { error: `card is already in "${targetList.title}"` },
      { status: 400 },
    );
  }

  // Calculate position at the end of the target list
  const maxPos = await prisma.card.aggregate({
    where: { listId: targetList.id },
    _max: { position: true },
  });
  const newPosition = (maxPos._max.position ?? 0) + 1;

  // Move the card (raw SQL — vector column)
  await prisma.$executeRaw`
    UPDATE "Card"
    SET "listId" = ${targetList.id}, "position" = ${newPosition}, "updatedAt" = NOW()
    WHERE "id" = ${cardId}
  `;

  logActivity({
    boardId: card.list.boardId,
    userId: user.id,
    action: "card.moved",
    entityType: "card",
    entityId: cardId,
    metadata: {
      cardTitle: card.title,
      fromList: card.list.title,
      toList: targetList.title,
    },
  });

  return NextResponse.json({
    success: true,
    listId: targetList.id,
    listTitle: targetList.title,
    position: newPosition,
  });
}
