import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// GET /api/workspaces — List workspaces the current user belongs to
export async function GET() {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    include: {
      workspace: {
        include: {
          _count: {
            select: {
              members: true,
              boards: { where: { isArchived: false } },
            },
          },
        },
      },
    },
    orderBy: { workspace: { createdAt: "desc" } },
  });

  const workspaces = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    logoUrl: m.workspace.logoUrl,
    plan: m.workspace.plan,
    role: m.role,
    memberCount: m.workspace._count.members,
    boardCount: m.workspace._count.boards,
    createdAt: m.workspace.createdAt,
  }));

  return NextResponse.json(workspaces);
}

// POST /api/workspaces — Create a workspace + add current user as ADMIN
export async function POST(req: Request) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Generate slug from name
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Ensure slug uniqueness by appending random suffix if needed
  const existing = await prisma.workspace.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });

  const slug = existing
    ? `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`
    : baseSlug;

  // Create workspace + add creator as ADMIN in a transaction
  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name: name.trim(),
        slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        createdAt: true,
      },
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: ws.id,
        userId: user.id,
        role: "ADMIN",
      },
    });

    return ws;
  });

  return NextResponse.json(workspace, { status: 201 });
}
