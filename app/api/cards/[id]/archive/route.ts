import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

// PATCH /api/cards/[id]/archive — Toggle isArchived on a card. Editor+ only.
// Requires the `isArchived` column on Card (see docs/schema-changes/search-filters-archive.prisma).
// Uses raw SQL because Prisma's update is blocked by the vector column.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify access — Editor+
  const card = await prisma.card.findUnique({
    where: { id },
    include: {
      list: {
        select: {
          title: true,
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

  if (card.list.board.members[0].role === "viewer") {
    return NextResponse.json(
      { error: "viewers cannot archive cards" },
      { status: 403 },
    );
  }

  // Toggle isArchived via raw SQL (Card has Unsupported vector column)
  await prisma.$executeRawUnsafe(
    `UPDATE "Card" SET "isArchived" = NOT "isArchived", "updatedAt" = NOW() WHERE "id" = $1`,
    id,
  );

  // Read back to determine new state
  const updated = await prisma.card.findUniqueOrThrow({ where: { id } });

  // We read isArchived via raw SQL since Prisma doesn't know this column yet
  const rows = await prisma.$queryRawUnsafe<{ isArchived: boolean }[]>(
    `SELECT "isArchived" FROM "Card" WHERE "id" = $1`,
    id,
  );
  const isArchived = rows[0]?.isArchived ?? false;

  logActivity({
    boardId: card.list.boardId,
    userId: user.id,
    action: isArchived ? "card.archived" : "card.restored",
    entityType: "card",
    entityId: id,
    metadata: { cardTitle: card.title },
  });

  return NextResponse.json({ ...updated, isArchived });
}

// DELETE /api/cards/[id]/archive — Permanently delete a card. Owner only.
// Using this route path since app/api/cards/[id]/route.ts is an existing file we don't own.
// The coordinator can move this DELETE handler into the main route during merge.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const card = await prisma.card.findUnique({
    where: { id },
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

  if (card.list.board.members[0].role !== "owner") {
    return NextResponse.json(
      { error: "only the board owner can permanently delete cards" },
      { status: 403 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.comment.deleteMany({ where: { cardId: id } });
    await tx.$executeRawUnsafe(`DELETE FROM "Card" WHERE "id" = $1`, id);
  });

  logActivity({
    boardId: card.list.boardId,
    userId: user.id,
    action: "card.deleted",
    entityType: "card",
    entityId: id,
    metadata: { cardTitle: card.title },
  });

  return NextResponse.json({ deleted: true });
}
