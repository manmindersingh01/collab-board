import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// ── Ensure CardTemplate table exists ─────────────────────

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CardTemplate" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "priority" "Priority" NOT NULL DEFAULT 'NONE',
      "labels" TEXT[] DEFAULT '{}',
      "boardId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CardTemplate_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "CardTemplate_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "CardTemplate_boardId_idx" ON "CardTemplate"("boardId")
  `);
}

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

  await ensureTable();

  const templates = await prisma.$queryRawUnsafe<
    {
      id: string;
      name: string;
      description: string | null;
      priority: string;
      labels: string[];
      boardId: string;
      createdAt: Date;
    }[]
  >(
    `SELECT "id", "name", "description", "priority"::TEXT, "labels", "boardId", "createdAt"
     FROM "CardTemplate"
     WHERE "boardId" = $1
     ORDER BY "createdAt" ASC`,
    boardId,
  );

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

  const validPriorities = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];
  const safePriority = validPriorities.includes(priority) ? priority : "NONE";
  const safeLabels = Array.isArray(labels) ? labels : [];

  await ensureTable();

  const result = await prisma.$queryRawUnsafe<
    {
      id: string;
      name: string;
      description: string | null;
      priority: string;
      labels: string[];
      boardId: string;
      createdAt: Date;
    }[]
  >(
    `INSERT INTO "CardTemplate" ("name", "description", "priority", "labels", "boardId")
     VALUES ($1, $2, $3::"Priority", $4::TEXT[], $5)
     RETURNING "id", "name", "description", "priority"::TEXT, "labels", "boardId", "createdAt"`,
    name.trim(),
    description?.trim() || null,
    safePriority,
    safeLabels,
    boardId,
  );

  return NextResponse.json(result[0], { status: 201 });
}
