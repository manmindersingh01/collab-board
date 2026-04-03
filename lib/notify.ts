import prisma from "./prisma";

/**
 * Create an in-app notification for a user.
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
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link ?? null,
      },
    });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}
