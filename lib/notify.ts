import prisma from "./prisma";

/**
 * Create an in-app notification for a user.
 * Uses raw SQL since the Notification table is not in the Prisma schema yet.
 * Fire-and-forget — failures log to stderr but never throw.
 */
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const id =
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "Notification" ("id", "type", "title", "message", "link", "isRead", "createdAt", "userId")
       VALUES ($1, $2, $3, $4, $5, false, NOW(), $6)`,
      id,
      data.type,
      data.title,
      data.message,
      data.link ?? null,
      data.userId,
    );
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}
