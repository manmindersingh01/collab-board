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
  const approachingCards = await prisma.card.findMany({
    where: {
      dueDate: { gt: now, lte: tomorrow },
      assigneeId: { not: null },
      completionListId: null,
      NOT: {
        assignee: {
          notifications: {
            some: {
              type: "due.approaching",
            },
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      assigneeId: true,
      list: { select: { boardId: true } },
    },
  });

  // Filter out cards that already have a matching notification for this specific card
  const approachingFiltered = await filterAlreadyNotified(
    approachingCards,
    "due.approaching",
  );

  // ── Cards that are overdue ──
  const overdueCards = await prisma.card.findMany({
    where: {
      dueDate: { lt: now },
      assigneeId: { not: null },
      completionListId: null,
    },
    select: {
      id: true,
      title: true,
      assigneeId: true,
      list: { select: { boardId: true } },
    },
  });

  // Filter out cards that already have a matching notification for this specific card
  const overdueFiltered = await filterAlreadyNotified(
    overdueCards,
    "due.overdue",
  );

  // Create notifications
  const results = { approaching: 0, overdue: 0 };

  await Promise.all(
    approachingFiltered.map(async (card) => {
      await notifyDueApproaching(
        card.assigneeId!,
        { id: card.id, title: card.title },
        card.list.boardId,
      );
      results.approaching++;
    }),
  );

  await Promise.all(
    overdueFiltered.map(async (card) => {
      await notifyDueOverdue(
        card.assigneeId!,
        { id: card.id, title: card.title },
        card.list.boardId,
      );
      results.overdue++;
    }),
  );

  return NextResponse.json({
    success: true,
    notified: results,
  });
}

// ── Helper: filter out cards that already have a notification ──
// The original SQL used NOT EXISTS with a LIKE match on the notification link.
// We replicate that by checking for existing notifications whose link contains the card id.

async function filterAlreadyNotified(
  cards: {
    id: string;
    title: string;
    assigneeId: string | null;
    list: { boardId: string };
  }[],
  notificationType: string,
) {
  if (cards.length === 0) return cards;

  const filtered = await Promise.all(
    cards.map(async (card) => {
      const existing = await prisma.notification.findFirst({
        where: {
          type: notificationType,
          userId: card.assigneeId!,
          link: { contains: `card=${card.id}` },
        },
      });
      return existing ? null : card;
    }),
  );

  return filtered.filter(Boolean) as typeof cards;
}
