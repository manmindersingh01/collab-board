import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// GET /api/workspaces/[slug]/members — List members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Check caller is a member
  const callerMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    select: { role: true },
  });

  if (!callerMembership) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const result = members.map((m) => ({
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    name: m.user.name,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
  }));

  return NextResponse.json(result);
}

// POST /api/workspaces/[slug]/members — Invite member (admin only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  // Find workspace and check user is ADMIN
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    select: { role: true },
  });

  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role } = body;

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const validRoles = ["ADMIN", "MEMBER", "GUEST"] as const;
  const memberRole = validRoles.includes(role) ? role : "MEMBER";

  // Find user by email
  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found. They need to sign up first." },
      { status: 404 }
    );
  }

  // Check if already a member
  const existing = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: targetUser.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "User is already a workspace member" },
      { status: 409 }
    );
  }

  // Add member
  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: targetUser.id,
      role: memberRole,
    },
  });

  return NextResponse.json(
    { userId: targetUser.id, name: targetUser.name, email: targetUser.email, role: memberRole },
    { status: 201 }
  );
}
