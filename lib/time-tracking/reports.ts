import prisma from "@/lib/prisma";

export interface TimeReport {
  totalMinutes: number;
  byUser: { userId: string; name: string; minutes: number }[];
  byCard: { cardId: string; title: string; minutes: number }[];
  byDay: { date: string; minutes: number }[];
}

export async function generateTimeReport(
  boardId: string,
  from: Date,
  to: Date,
  userId?: string,
): Promise<TimeReport> {
  const where: Record<string, unknown> = {
    card: { list: { boardId } },
    startedAt: { gte: from, lte: to },
    duration: { not: null },
  };
  if (userId) where.userId = userId;

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      card: { select: { id: true, title: true } },
    },
  });

  let totalMinutes = 0;
  const userMap = new Map<string, { name: string; minutes: number }>();
  const cardMap = new Map<string, { title: string; minutes: number }>();
  const dayMap = new Map<string, number>();

  for (const entry of entries) {
    const dur = entry.duration ?? 0;
    totalMinutes += dur;

    // Aggregate by user
    const existing = userMap.get(entry.userId);
    if (existing) {
      existing.minutes += dur;
    } else {
      userMap.set(entry.userId, { name: (entry as any).user.name, minutes: dur });
    }

    // Aggregate by card
    const cardExisting = cardMap.get(entry.cardId);
    if (cardExisting) {
      cardExisting.minutes += dur;
    } else {
      cardMap.set(entry.cardId, { title: (entry as any).card.title, minutes: dur });
    }

    // Aggregate by day
    const dayKey = entry.startedAt.toISOString().split("T")[0];
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + dur);
  }

  return {
    totalMinutes,
    byUser: Array.from(userMap.entries()).map(([userId, v]) => ({ userId, ...v })),
    byCard: Array.from(cardMap.entries()).map(([cardId, v]) => ({ cardId, ...v })),
    byDay: Array.from(dayMap.entries())
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
