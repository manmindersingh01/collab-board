import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// GET /api/workspaces — List workspaces the current user belongs to
export async function GET() {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const workspaces = await prisma.$queryRawUnsafe<
    {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      plan: string;
      role: string;
      memberCount: number;
      boardCount: number;
      createdAt: Date;
    }[]
  >(
    `SELECT w."id", w."name", w."slug", w."logoUrl", w."plan",
            wm."role",
            (SELECT COUNT(*)::int FROM "WorkspaceMember" WHERE "workspaceId" = w."id") as "memberCount",
            (SELECT COUNT(*)::int FROM "Board" WHERE "workspaceId" = w."id" AND "isArchived" = false) as "boardCount",
            w."createdAt"
     FROM "Workspace" w
     JOIN "WorkspaceMember" wm ON wm."workspaceId" = w."id"
     WHERE wm."userId" = $1
     ORDER BY w."createdAt" DESC`,
    user.id
  );

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
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "Workspace" WHERE "slug" = $1`,
    baseSlug
  );

  const slug = existing.length > 0
    ? `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`
    : baseSlug;

  // Create workspace + add creator as ADMIN in a transaction
  const workspaceId = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Workspace" ("id", "name", "slug", "plan", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'FREE', NOW(), NOW())`,
    workspaceId,
    name.trim(),
    slug
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "WorkspaceMember" ("workspaceId", "userId", "role", "joinedAt")
     VALUES ($1, $2, 'ADMIN', NOW())`,
    workspaceId,
    user.id
  );

  const workspace = await prisma.$queryRawUnsafe<
    { id: string; name: string; slug: string; plan: string; createdAt: Date }[]
  >(
    `SELECT "id", "name", "slug", "plan", "createdAt" FROM "Workspace" WHERE "id" = $1`,
    workspaceId
  );

  return NextResponse.json(workspace[0], { status: 201 });
}
