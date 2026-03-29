import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

// ── GET /api/boards/[id]/members — list all members ─────

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

  const members = await prisma.boardMember.findMany({
    where: { boardId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

// ── POST /api/boards/[id]/members — invite member ───────

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
  const { email, role } = body;

  if (!email?.trim()) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const validRoles = ["editer", "viewer"];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: "role must be 'editer' or 'viewer'" },
      { status: 400 },
    );
  }

  // Only owner can invite
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "only the board owner can invite members" },
      { status: 403 },
    );
  }

  // Look up the invitee by email
  const invitee = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!invitee) {
    return NextResponse.json(
      { error: "no user found with that email" },
      { status: 404 },
    );
  }

  // Check if already a member
  const existing = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: invitee.id } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "user is already a member" },
      { status: 409 },
    );
  }

  const member = await prisma.boardMember.create({
    data: { boardId, userId: invitee.id, role },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  logActivity({
    boardId,
    userId: user.id,
    action: "member.added",
    entityType: "board",
    entityId: boardId,
    metadata: { memberName: invitee.name, memberEmail: invitee.email, role },
  });

  return NextResponse.json(member, { status: 201 });
}
