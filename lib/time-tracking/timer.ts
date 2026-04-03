import prisma from "@/lib/prisma";

export function computeDuration(startedAt: Date, stoppedAt: Date): number {
  const ms = stoppedAt.getTime() - startedAt.getTime();
  const minutes = Math.round(ms / 60000);
  return Math.max(1, minutes);
}

export async function getActiveTimer(userId: string) {
  return prisma.timeEntry.findFirst({
    where: { userId, stoppedAt: null },
    include: {
      card: {
        select: { id: true, title: true, list: { select: { boardId: true } } },
      },
    },
  });
}

export async function startTimer(userId: string, cardId: string) {
  // Check for an existing active timer on any card
  const existing = await prisma.timeEntry.findFirst({
    where: { userId, stoppedAt: null },
  });

  // Auto-stop the existing timer if one is running
  if (existing) {
    const now = new Date();
    await prisma.timeEntry.update({
      where: { id: existing.id },
      data: {
        stoppedAt: now,
        duration: computeDuration(existing.startedAt, now),
      },
    });
  }

  return prisma.timeEntry.create({
    data: {
      userId,
      cardId,
      startedAt: new Date(),
    },
  });
}

export async function stopTimer(userId: string, cardId: string) {
  const active = await prisma.timeEntry.findFirst({
    where: { userId, cardId, stoppedAt: null },
  });

  if (!active) {
    throw new Error("No active timer for this card");
  }

  const now = new Date();
  return prisma.timeEntry.update({
    where: { id: active.id },
    data: {
      stoppedAt: now,
      duration: computeDuration(active.startedAt, now),
    },
  });
}
