import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

// PATCH /api/boards/[id]/archive — Toggle isArchived. Owner only.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const board = await prisma.board.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId: user.id },
        select: { role: true },
      },
    },
  });

  if (!board || board.members.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (board.members[0].role !== "owner") {
    return NextResponse.json(
      { error: "only the board owner can archive/restore" },
      { status: 403 },
    );
  }

  const updated = await prisma.board.update({
    where: { id },
    data: { isArchived: !board.isArchived },
  });

  logActivity({
    boardId: id,
    userId: user.id,
    action: updated.isArchived ? "board.archived" : "board.restored",
    entityType: "board",
    entityId: id,
    metadata: { boardName: board.name },
  });

  return NextResponse.json(updated);
}
