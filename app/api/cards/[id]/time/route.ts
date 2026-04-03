import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

// ── GET /api/cards/[id]/time — list time entries ──────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: cardId } = await params;

  // Verify card exists and user is a board member
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: {
        select: {
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

  const entries = await prisma.timeEntry.findMany({
    where: { cardId },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(entries);
}

// ── POST /api/cards/[id]/time — manual time entry ─────

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
  const { duration, description, date } = body;

  if (!duration || typeof duration !== "number" || duration <= 0) {
    return NextResponse.json(
      { error: "duration must be a positive number (minutes)" },
      { status: 400 },
    );
  }

  // Verify card exists and user has editor+ access
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
  if (role === "viewer") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const startedAt = date ? new Date(date) : new Date();
  const stoppedAt = new Date(startedAt.getTime() + duration * 60000);

  const entry = await prisma.timeEntry.create({
    data: {
      cardId,
      userId: user.id,
      startedAt,
      stoppedAt,
      duration: Math.round(duration),
      isManual: true,
      description: description?.trim() || null,
    },
  });

  logActivity({
    boardId: card.list.boardId,
    userId: user.id,
    action: "time.logged",
    entityType: "card",
    entityId: cardId,
    metadata: { cardTitle: card.title, duration: Math.round(duration) },
  });

  return NextResponse.json(entry, { status: 201 });
}
