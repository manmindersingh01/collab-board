import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: cardId, entryId } = await params;

  // Find the time entry
  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
    include: {
      card: {
        include: {
          list: {
            select: {
              board: {
                select: {
                  ownerId: true,
                  members: {
                    where: { userId: user.id },
                    select: { role: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!entry || entry.cardId !== cardId || entry.card.list.board.members.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Only entry owner or board owner can delete
  const isBoardOwner = entry.card.list.board.ownerId === user.id;
  const isEntryOwner = entry.userId === user.id;

  if (!isBoardOwner && !isEntryOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.timeEntry.delete({ where: { id: entryId } });

  return NextResponse.json({ success: true });
}
