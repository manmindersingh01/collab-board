import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;
  const body = await req.json();
  const { title } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Only owner can add lists
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "only the board owner can add lists" },
      { status: 403 },
    );
  }

  // Position: after the last list
  const lastList = await prisma.list.findFirst({
    where: { boardId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const position = (lastList?.position ?? 0) + 1;

  const list = await prisma.list.create({
    data: {
      title: title.trim(),
      position,
      boardId,
    },
    include: {
      card: true,
    },
  });

  logActivity({
    boardId,
    userId: user.id,
    action: "list.created",
    entityType: "list",
    entityId: list.id,
    metadata: { title: list.title },
  });

  return NextResponse.json(list, { status: 201 });
}
