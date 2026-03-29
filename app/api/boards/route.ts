import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { error } from "console";
import { NextResponse } from "next/server";

// route for getting all the boards
export async function GET() {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const boards = await prisma.board.findMany({
    where: {
      members: {
        some: { userId: user.id },
      },
    },
    include: {
      owner: {
        select: { id: true, avatarUrl: true, name: true },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(boards, { status: 200 });
}

//route for creating a board
export async function POST(req: Request) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { name, description } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // ── THE TRANSACTION ──
  // This is the key learning moment. Three things happen atomically:
  // 1. Board is created
  // 2. Creator is added as OWNER in BoardMembers
  // 3. Three default lists are created
  //
  // If ANY of these fail, ALL of them roll back.
  // You never end up with a board that has no owner,
  // or an owner membership pointing to a nonexistent board.

  const board = await prisma.$transaction(async (tx) => {
    //create a new board
    const newBoard = await tx.board.create({
      data: {
        name,
        description,
        ownerId: user.id,
      },
    });

    //adding admin member to the board members

    await tx.boardMember.create({
      data: {
        boardId: newBoard.id,
        userId: user.id,
        role: "owner",
      },
    });
    await tx.list.createMany({
      data: [
        { boardId: newBoard.id, title: "To Do", position: 1.0 },
        { boardId: newBoard.id, title: "In Progress", position: 2.0 },
        { boardId: newBoard.id, title: "Done", position: 3.0 },
      ],
    });

    return tx.board.findUnique({
      where: { id: newBoard.id },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        list: { orderBy: { position: "asc" } },
        _count: { select: { members: true } },
      },
    });
  });

  return NextResponse.json(board, { status: 201 });
}
