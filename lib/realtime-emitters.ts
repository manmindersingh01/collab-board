import { publishBoardEvent, type BoardEvent } from "./realtime";

/**
 * Emit helpers for each mutation type.
 *
 * These are NOT called from existing API routes (those are shared/read-only).
 * Instead, the human coordinator will wire these calls into the existing
 * routes during the merge phase. See README.md for integration instructions.
 */

export function emitCardCreated(
  boardId: string,
  userId: string,
  card: {
    id: string;
    title: string;
    listId: string;
    position: number;
    priority: string;
    labels: string[];
    description: string | null;
    dueDate: string | null;
    assignee: { id: string; name: string; avatarUrl: string | null } | null;
  },
) {
  const event: BoardEvent = {
    type: "card.created",
    payload: { card },
    userId,
    timestamp: Date.now(),
  };
  return publishBoardEvent(boardId, event);
}

export function emitCardMoved(
  boardId: string,
  userId: string,
  cardId: string,
  fromListId: string,
  toListId: string,
  position: number,
) {
  const event: BoardEvent = {
    type: "card.moved",
    payload: { cardId, fromListId, toListId, position },
    userId,
    timestamp: Date.now(),
  };
  return publishBoardEvent(boardId, event);
}

export function emitCardUpdated(
  boardId: string,
  userId: string,
  cardId: string,
  updates: Record<string, unknown>,
) {
  const event: BoardEvent = {
    type: "card.updated",
    payload: { cardId, updates },
    userId,
    timestamp: Date.now(),
  };
  return publishBoardEvent(boardId, event);
}

export function emitCardDeleted(
  boardId: string,
  userId: string,
  cardId: string,
  listId: string,
) {
  const event: BoardEvent = {
    type: "card.deleted",
    payload: { cardId, listId },
    userId,
    timestamp: Date.now(),
  };
  return publishBoardEvent(boardId, event);
}

export function emitListCreated(
  boardId: string,
  userId: string,
  list: { id: string; title: string; position: number },
) {
  const event: BoardEvent = {
    type: "list.created",
    payload: { list },
    userId,
    timestamp: Date.now(),
  };
  return publishBoardEvent(boardId, event);
}
