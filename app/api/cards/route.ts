import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, listId } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!listId) {
    return NextResponse.json({ error: "listId is required" }, { status: 400 });
  }

  const list = await prisma.list.findUnique({
    where: { id: listId },
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
  });

  if (!list || list.board.members.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (list.board.members[0].role === "viewer") {
    return NextResponse.json(
      { error: "viewers cannot create cards" },
      { status: 403 },
    );
  }

  // Atomic: find max position + insert card via raw SQL
  // (Prisma's `create` is blocked at runtime by the Unsupported vector column)
  const card = await prisma.$transaction(async (tx) => {
    const agg = await tx.card.aggregate({
      where: { listId },
      _max: { position: true },
    });

    const position = (agg._max.position ?? 0) + 1;
    const id = crypto.randomUUID();
    const now = new Date();

    await tx.$executeRaw`
      INSERT INTO "Card" ("id", "title", "position", "listId", "createdAt", "updatedAt")
      VALUES (${id}, ${title.trim()}, ${position}, ${listId}, ${now}, ${now})
    `;

    return tx.card.findUniqueOrThrow({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });
  });

  // Activity log (fire-and-forget)
  logActivity({
    boardId: list.board.id,
    userId: user.id,
    action: "card.created",
    entityType: "card",
    entityId: card.id,
    metadata: { title: title.trim(), listTitle: list.title },
  });

  return NextResponse.json(card, { status: 201 });
}
