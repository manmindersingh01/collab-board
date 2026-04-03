import redis, { createSubscriber } from "./redis";
import type Redis from "ioredis";

// ── Event types ─────────────────────────────────────────

export type BoardEventType =
  | "card.created"
  | "card.moved"
  | "card.updated"
  | "card.deleted"
  | "list.created";

export interface BoardEvent {
  type: BoardEventType;
  payload: Record<string, unknown>;
  /** The user who triggered the mutation — clients skip their own events. */
  userId: string;
  timestamp: number;
}

// ── Channel helpers ─────────────────────────────────────

function channelName(boardId: string) {
  return `board:${boardId}`;
}

// ── Publish ─────────────────────────────────────────────

/**
 * Publish a real-time event to all SSE clients watching this board.
 * Fire-and-forget — errors are logged, never thrown.
 */
export async function publishBoardEvent(
  boardId: string,
  event: BoardEvent,
): Promise<void> {
  try {
    const channel = channelName(boardId);
    const listeners = await redis.publish(channel, JSON.stringify(event));
    if (process.env.NODE_ENV !== "production") {
      console.log(`[realtime] Published ${event.type} to ${channel} (${listeners} listeners)`);
    }
  } catch (e) {
    console.error("[realtime] Failed to publish event:", e);
  }
}

// ── Subscribe / Unsubscribe ─────────────────────────────

export interface Subscription {
  subscriber: Redis;
  unsubscribe: () => Promise<void>;
}

/**
 * Subscribe to real-time events for a board.
 * Returns a Subscription handle with an `unsubscribe()` method.
 *
 * Each call creates its own Redis subscriber client because
 * ioredis dedicates a connection once subscribe() is called.
 */
export async function subscribeBoardEvents(
  boardId: string,
  onEvent: (event: BoardEvent) => void,
): Promise<Subscription> {
  const subscriber = createSubscriber();
  const channel = channelName(boardId);

  subscriber.on("message", (_ch: string, message: string) => {
    try {
      const event = JSON.parse(message) as BoardEvent;
      onEvent(event);
    } catch (e) {
      console.error("[realtime] Failed to parse event:", e);
    }
  });

  await subscriber.subscribe(channel);

  return {
    subscriber,
    async unsubscribe() {
      try {
        await subscriber.unsubscribe(channel);
        subscriber.disconnect();
      } catch {
        // Connection may already be closed
      }
    },
  };
}
