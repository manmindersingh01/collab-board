import prisma from "@/lib/prisma";
import {
  notifyDueApproaching,
  notifyDueOverdue,
} from "@/lib/notification-triggers";
import { NextResponse } from "next/server";

// ── GET /api/cron/due-reminders — scan for due/overdue cards ──
// Secured with CRON_SECRET header. Called by external cron service.

export async function GET(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // ── Cards due within the next 24 hours (approaching) ──
  const approaching = await prisma.$queryRawUnsafe<
    { id: string; title: string; assigneeId: string; boardId: string }[]
  >(
    `SELECT c."id", c."title", c."assigneeId", l."boardId"
     FROM "Card" c
     JOIN "List" l ON c."listId" = l.id
     WHERE c."dueDate" IS NOT NULL
       AND c."dueDate" > $1
       AND c."dueDate" <= $2
       AND c."assigneeId" IS NOT NULL
       AND c."completionListId" IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM "Notification" n
         WHERE n."type" = 'due.approaching'
           AND n."userId" = c."assigneeId"
           AND n."link" LIKE '%card=' || c."id"
       )`,
    now,
    tomorrow,
  );

  // ── Cards that are overdue ──
  const overdue = await prisma.$queryRawUnsafe<
    { id: string; title: string; assigneeId: string; boardId: string }[]
  >(
    `SELECT c."id", c."title", c."assigneeId", l."boardId"
     FROM "Card" c
     JOIN "List" l ON c."listId" = l.id
     WHERE c."dueDate" IS NOT NULL
       AND c."dueDate" < $1
       AND c."assigneeId" IS NOT NULL
       AND c."completionListId" IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM "Notification" n
         WHERE n."type" = 'due.overdue'
           AND n."userId" = c."assigneeId"
           AND n."link" LIKE '%card=' || c."id"
       )`,
    now,
  );

  // Create notifications
  const results = { approaching: 0, overdue: 0 };

  await Promise.all(
    approaching.map(async (card) => {
      await notifyDueApproaching(
        card.assigneeId,
        { id: card.id, title: card.title },
        card.boardId,
      );
      results.approaching++;
    }),
  );

  await Promise.all(
    overdue.map(async (card) => {
      await notifyDueOverdue(
        card.assigneeId,
        { id: card.id, title: card.title },
        card.boardId,
      );
      results.overdue++;
    }),
  );

  return NextResponse.json({
    success: true,
    notified: results,
  });
}
