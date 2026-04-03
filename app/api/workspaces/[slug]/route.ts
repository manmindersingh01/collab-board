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

  const workspace = await prisma.$queryRawUnsafe<
    {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      plan: string;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      createdAt: Date;
      memberCount: number;
      boardCount: number;
      role: string;
    }[]
  >(
    `SELECT w."id", w."name", w."slug", w."logoUrl", w."plan",
            w."stripeCustomerId", w."stripeSubscriptionId",
            w."createdAt",
            (SELECT COUNT(*)::int FROM "WorkspaceMember" WHERE "workspaceId" = w."id") as "memberCount",
            (SELECT COUNT(*)::int FROM "Board" WHERE "workspaceId" = w."id" AND "isArchived" = false) as "boardCount",
            wm."role"
     FROM "Workspace" w
     JOIN "WorkspaceMember" wm ON wm."workspaceId" = w."id" AND wm."userId" = $2
     WHERE w."slug" = $1`,
    slug,
    user.id
  );

  if (!workspace.length) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Get members list
  const members = await prisma.$queryRawUnsafe<
    {
      userId: string;
      role: string;
      joinedAt: Date;
      name: string;
      email: string;
      avatarUrl: string | null;
    }[]
  >(
    `SELECT wm."userId", wm."role", wm."joinedAt",
            u."name", u."email", u."avatarUrl"
     FROM "WorkspaceMember" wm
     JOIN "User" u ON u."id" = wm."userId"
     WHERE wm."workspaceId" = $1
     ORDER BY wm."joinedAt" ASC`,
    workspace[0].id
  );

  return NextResponse.json({ ...workspace[0], members });
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

  // Check user is ADMIN
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
  const { name, logoUrl } = body;

  const updates: string[] = [];
  const values: (string | null)[] = [];
  let paramIdx = 1;

  if (name !== undefined) {
    updates.push(`"name" = $${paramIdx++}`);
    values.push(name);
  }
  if (logoUrl !== undefined) {
    updates.push(`"logoUrl" = $${paramIdx++}`);
    values.push(logoUrl);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  updates.push(`"updatedAt" = NOW()`);

  await prisma.$executeRawUnsafe(
    `UPDATE "Workspace" SET ${updates.join(", ")} WHERE "id" = $${paramIdx}`,
    ...values,
    membership[0].workspaceId
  );

  return NextResponse.json({ success: true });
}
