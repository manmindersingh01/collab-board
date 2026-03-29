import prisma from "./prisma";

/**
 * Fire-and-forget activity log entry.
 * Failures are logged to stderr but never throw — a failed log
 * must not break the operation that triggered it.
 */
export async function logActivity(data: {
  boardId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: object;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        boardId: data.boardId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: (data.metadata ?? {}) as Record<string, string>,
      },
    });
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}
