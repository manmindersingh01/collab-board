import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// PATCH /api/workspaces/[slug]/members/[userId] — Change member role (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug, userId: targetUserId } = await params;

  // Find workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Check caller is ADMIN
  const callerMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    select: { role: true },
  });

  if (!callerMembership || callerMembership.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { role } = body;

  const validRoles = ["ADMIN", "MEMBER", "GUEST"] as const;
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }

  // Check the target member exists
  const targetMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: targetUserId,
      },
    },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "member not found" }, { status: 404 });
  }

  // Prevent demoting yourself if you're the only ADMIN
  if (targetUserId === user.id && role !== "ADMIN") {
    const adminCount = await prisma.workspaceMember.count({
      where: {
        workspaceId: workspace.id,
        role: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last admin. Promote another member first." },
        { status: 400 }
      );
    }
  }

  await prisma.workspaceMember.update({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: targetUserId,
      },
    },
    data: { role },
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/workspaces/[slug]/members/[userId] — Remove member (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug, userId: targetUserId } = await params;

  // Find workspace
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Check caller is ADMIN
  const callerMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    select: { role: true },
  });

  if (!callerMembership || callerMembership.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Prevent removing yourself if you're the only ADMIN
  if (targetUserId === user.id) {
    const adminCount = await prisma.workspaceMember.count({
      where: {
        workspaceId: workspace.id,
        role: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last admin. Transfer ownership first." },
        { status: 400 }
      );
    }
  }

  await prisma.workspaceMember.delete({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: targetUserId,
      },
    },
  });

  return NextResponse.json({ success: true });
}
