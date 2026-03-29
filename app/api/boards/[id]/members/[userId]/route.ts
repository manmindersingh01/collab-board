import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { logActivity } from "@/lib/activity";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; userId: string }> };

// ── PATCH — change member role (Owner only) ─────────────

export async function PATCH(req: Request, { params }: Params) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId, userId: targetUserId } = await params;
  const body = await req.json();
  const { role } = body;

  const validRoles = ["editer", "viewer"];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      { error: "role must be 'editer' or 'viewer'" },
      { status: 400 },
    );
  }

  // Only owner can change roles
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  }

  // Can't change your own role (owner)
  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "cannot change your own role" },
      { status: 400 },
    );
  }

  const updated = await prisma.boardMember.update({
    where: { boardId_userId: { boardId, userId: targetUserId } },
    data: { role },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  return NextResponse.json(updated);
}

// ── DELETE — remove member (Owner only) ─────────────────

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId, userId: targetUserId } = await params;

  // Only owner can remove
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  }

  // Can't remove yourself (the owner)
  if (targetUserId === user.id) {
    return NextResponse.json(
      { error: "cannot remove yourself" },
      { status: 400 },
    );
  }

  // Get member info before deleting (for the log)
  const target = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: targetUserId } },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!target) {
    return NextResponse.json({ error: "member not found" }, { status: 404 });
  }

  await prisma.boardMember.delete({
    where: { boardId_userId: { boardId, userId: targetUserId } },
  });

  logActivity({
    boardId,
    userId: user.id,
    action: "member.removed",
    entityType: "board",
    entityId: boardId,
    metadata: { memberName: target.user.name, memberEmail: target.user.email },
  });

  return NextResponse.json({ success: true });
}
