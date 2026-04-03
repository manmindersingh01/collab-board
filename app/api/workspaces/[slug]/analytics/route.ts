import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";

// GET /api/workspaces/[slug]/analytics — Workspace-wide analytics
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  // Verify membership
  const workspace = await prisma.$queryRawUnsafe<
    { id: string; role: string }[]
  >(
    `SELECT w."id", wm."role"
     FROM "Workspace" w
     JOIN "WorkspaceMember" wm ON wm."workspaceId" = w."id"
     WHERE w."slug" = $1 AND wm."userId" = $2`,
    slug,
    user.id
  );

  if (!workspace.length) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const workspaceId = workspace[0].id;

  // Summary stats
  const summary = await prisma.$queryRawUnsafe<
    { total: number; completed: number; overdue: number }[]
  >(
    `SELECT
       COUNT(*)::int as total,
       COUNT(*) FILTER (WHERE l."title" ILIKE '%done%')::int as completed,
       COUNT(*) FILTER (WHERE c."dueDate" < NOW() AND l."title" NOT ILIKE '%done%')::int as overdue
     FROM "Card" c
     JOIN "List" l ON c."listId" = l."id"
     JOIN "Board" b ON l."boardId" = b."id"
     WHERE b."workspaceId" = $1 AND b."isArchived" = false`,
    workspaceId
  );

  // Cards by priority
  const cardsByPriority = await prisma.$queryRawUnsafe<
    { priority: string; count: number }[]
  >(
    `SELECT c."priority"::text as priority, COUNT(*)::int as count
     FROM "Card" c
     JOIN "List" l ON c."listId" = l."id"
     JOIN "Board" b ON l."boardId" = b."id"
     WHERE b."workspaceId" = $1 AND b."isArchived" = false
     GROUP BY c."priority"
     ORDER BY count DESC`,
    workspaceId
  );

  // Cards by list (across all boards)
  const cardsByList = await prisma.$queryRawUnsafe<
    { listTitle: string; count: number }[]
  >(
    `SELECT l."title" as "listTitle", COUNT(*)::int as count
     FROM "Card" c
     JOIN "List" l ON c."listId" = l."id"
     JOIN "Board" b ON l."boardId" = b."id"
     WHERE b."workspaceId" = $1 AND b."isArchived" = false
     GROUP BY l."title"
     ORDER BY count DESC
     LIMIT 20`,
    workspaceId
  );

  // Cards completed per week (last 8 weeks)
  const cardsCompletedPerWeek = await prisma.$queryRawUnsafe<
    { week: string; count: number }[]
  >(
    `SELECT
       TO_CHAR(DATE_TRUNC('week', c."updatedAt"), 'YYYY-MM-DD') as week,
       COUNT(*)::int as count
     FROM "Card" c
     JOIN "List" l ON c."listId" = l."id"
     JOIN "Board" b ON l."boardId" = b."id"
     WHERE b."workspaceId" = $1
       AND b."isArchived" = false
       AND l."title" ILIKE '%done%'
       AND c."updatedAt" >= NOW() - INTERVAL '8 weeks'
     GROUP BY DATE_TRUNC('week', c."updatedAt")
     ORDER BY week ASC`,
    workspaceId
  );

  // Average cycle time (days from creation to moving to Done list)
  const cycleTime = await prisma.$queryRawUnsafe<
    { avgDays: number | null }[]
  >(
    `SELECT
       AVG(EXTRACT(EPOCH FROM (c."updatedAt" - c."createdAt")) / 86400)::float as "avgDays"
     FROM "Card" c
     JOIN "List" l ON c."listId" = l."id"
     JOIN "Board" b ON l."boardId" = b."id"
     WHERE b."workspaceId" = $1
       AND b."isArchived" = false
       AND l."title" ILIKE '%done%'`,
    workspaceId
  );

  // Top members by completed cards
  const topMembers = await prisma.$queryRawUnsafe<
    { name: string; avatarUrl: string | null; completed: number }[]
  >(
    `SELECT u."name", u."avatarUrl", COUNT(*)::int as completed
     FROM "Card" c
     JOIN "List" l ON c."listId" = l."id"
     JOIN "Board" b ON l."boardId" = b."id"
     JOIN "User" u ON u."id" = c."assigneeId"
     WHERE b."workspaceId" = $1
       AND b."isArchived" = false
       AND l."title" ILIKE '%done%'
     GROUP BY u."id", u."name", u."avatarUrl"
     ORDER BY completed DESC
     LIMIT 10`,
    workspaceId
  );

  return NextResponse.json({
    totalCards: summary[0]?.total ?? 0,
    completedCards: summary[0]?.completed ?? 0,
    overdueCards: summary[0]?.overdue ?? 0,
    cardsByPriority,
    cardsByList,
    cardsCompletedPerWeek,
    averageCycleTime: Math.round((cycleTime[0]?.avgDays ?? 0) * 10) / 10,
    topMembers,
  });
}
