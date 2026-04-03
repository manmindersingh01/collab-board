import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

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

  // Check user is ADMIN of this workspace
  const membership = await prisma.$queryRawUnsafe<
    { role: string; workspaceId: string }[]
  >(
    `SELECT wm."role", wm."workspaceId"
     FROM "WorkspaceMember" wm
     JOIN "Workspace" w ON w."id" = wm."workspaceId"
     WHERE w."slug" = $1 AND wm."userId" = $2`,
    slug,
    user.id
  );

  if (!membership.length || membership[0].role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role } = body;

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const validRoles = ["ADMIN", "MEMBER", "GUEST"];
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
  const existing = await prisma.$queryRawUnsafe<{ userId: string }[]>(
    `SELECT "userId" FROM "WorkspaceMember"
     WHERE "workspaceId" = $1 AND "userId" = $2`,
    membership[0].workspaceId,
    targetUser.id
  );

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "User is already a workspace member" },
      { status: 409 }
    );
  }

  // Add member
  await prisma.$executeRawUnsafe(
    `INSERT INTO "WorkspaceMember" ("workspaceId", "userId", "role", "joinedAt")
     VALUES ($1, $2, $3::"WorkspaceRole", NOW())`,
    membership[0].workspaceId,
    targetUser.id,
    memberRole
  );

  return NextResponse.json(
    { userId: targetUser.id, name: targetUser.name, email: targetUser.email, role: memberRole },
    { status: 201 }
  );
}
