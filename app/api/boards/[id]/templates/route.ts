import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";
import { Priority } from "@/app/generated/prisma/enums";

// ── GET /api/boards/[id]/templates — list card templates ─

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;

  // Verify membership
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const templates = await prisma.cardTemplate.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(templates);
}

// ── POST /api/boards/[id]/templates — create template ────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;

  // Verify editor+ access
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (membership.role === "viewer") {
    return NextResponse.json(
      { error: "viewers cannot create templates" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const { name, description, priority, labels } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  const validPriorities: Priority[] = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];
  const safePriority = validPriorities.includes(priority) ? priority : "NONE";
  const safeLabels = Array.isArray(labels) ? labels : [];

  const template = await prisma.cardTemplate.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      priority: safePriority as Priority,
      labels: safeLabels,
      boardId,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
