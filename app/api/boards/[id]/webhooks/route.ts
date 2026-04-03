import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: boardId } = await ctx.params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { members: { where: { userId: user.id }, select: { role: true } } },
  });

  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });

  const member = board.members[0];
  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  }

  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { boardId },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(endpoints);
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getDbUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: boardId } = await ctx.params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { members: { where: { userId: user.id }, select: { role: true } } },
  });

  if (!board) return NextResponse.json({ error: "not found" }, { status: 404 });

  const member = board.members[0];
  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  }

  const body = await req.json();
  const { url, events } = body;

  if (!url?.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  if (!events || !Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "events must be a non-empty array" }, { status: 400 });
  }

  const secret = randomBytes(32).toString("hex");

  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      url: url.trim(),
      secret,
      events,
      boardId,
      createdById: user.id,
    },
  });

  return NextResponse.json(
    {
      id: endpoint.id,
      url: endpoint.url,
      events: endpoint.events,
      secret, // Shown once for the user to save
      isActive: endpoint.isActive,
      createdAt: endpoint.createdAt,
    },
    { status: 201 },
  );
}
