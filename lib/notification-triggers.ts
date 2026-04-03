import { createNotification } from "./notify";

/**
 * Notification trigger functions.
 * Each function creates a notification for the appropriate user.
 * These are designed to be called from API routes after mutations.
 *
 * Integration: call these from the relevant API routes:
 * - notifyCardAssigned → PATCH /api/cards/[id] (when assigneeId changes)
 * - notifyCommentAdded → POST /api/cards/[id]/comments
 * - notifyRoleChanged → PATCH /api/boards/[id]/members/[userId]
 * - notifyDueApproaching / notifyDueOverdue → GET /api/cron/due-reminders
 */

export async function notifyCardAssigned(
  assigneeId: string,
  card: { id: string; title: string },
  boardId: string,
  assigner: { name: string },
) {
  await createNotification({
    userId: assigneeId,
    type: "card.assigned",
    title: "Card assigned to you",
    message: `${assigner.name} assigned you to "${card.title}"`,
    link: `/board/${boardId}?card=${card.id}`,
  });
}

export async function notifyCommentAdded(
  recipientIds: string[],
  card: { id: string; title: string },
  boardId: string,
  commenter: { id: string; name: string },
) {
  const targets = recipientIds.filter((id) => id !== commenter.id);
  await Promise.all(
    targets.map((userId) =>
      createNotification({
        userId,
        type: "comment.added",
        title: "New comment",
        message: `${commenter.name} commented on "${card.title}"`,
        link: `/board/${boardId}?card=${card.id}`,
      }),
    ),
  );
}

export async function notifyRoleChanged(
  userId: string,
  boardName: string,
  newRole: string,
  changedBy: { name: string },
) {
  const roleLabel =
    newRole === "editer" ? "Editor" : newRole === "viewer" ? "Viewer" : newRole;
  await createNotification({
    userId,
    type: "role.changed",
    title: "Role updated",
    message: `${changedBy.name} changed your role to ${roleLabel} on "${boardName}"`,
  });
}

export async function notifyDueApproaching(
  userId: string,
  card: { id: string; title: string },
  boardId: string,
) {
  await createNotification({
    userId,
    type: "due.approaching",
    title: "Due date approaching",
    message: `"${card.title}" is due tomorrow`,
    link: `/board/${boardId}?card=${card.id}`,
  });
}

export async function notifyDueOverdue(
  userId: string,
  card: { id: string; title: string },
  boardId: string,
) {
  await createNotification({
    userId,
    type: "due.overdue",
    title: "Card overdue",
    message: `"${card.title}" is overdue`,
    link: `/board/${boardId}?card=${card.id}`,
  });
}
