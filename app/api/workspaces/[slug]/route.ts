import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// GET /api/workspaces/[slug] — Get workspace details
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
    include: {
      _count: {
        select: {
          members: true,
          boards: { where: { isArchived: false } },
        },
      },
      members: {
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
      },
    },
  });

  if (!workspace) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Check that the current user is a member
  const currentMember = workspace.members.find(
    (m) => m.userId === user.id
  );

  if (!currentMember) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const members = workspace.members.map((m) => ({
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    name: m.user.name,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
  }));

  return NextResponse.json({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    logoUrl: workspace.logoUrl,
    plan: workspace.plan,
    stripeCustomerId: workspace.stripeCustomerId,
    stripeSubscriptionId: workspace.stripeSubscriptionId,
    createdAt: workspace.createdAt,
    memberCount: workspace._count.members,
    boardCount: workspace._count.boards,
    role: currentMember.role,
    members,
  });
}

// PATCH /api/workspaces/[slug] — Update workspace (admin only)
export async function PATCH(
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
  const { name, logoUrl } = body;

  const data: Record<string, string | null> = {};
  if (name !== undefined) {
    data.name = name;
  }
  if (logoUrl !== undefined) {
    data.logoUrl = logoUrl;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data,
  });

  return NextResponse.json({ success: true });
}
