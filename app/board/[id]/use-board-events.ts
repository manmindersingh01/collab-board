"use client";

import { useEffect, useRef, useCallback } from "react";
import type { BoardEvent } from "@/lib/realtime";

export type { BoardEvent };

/**
 * Subscribe to real-time board events via SSE.
 *
 * @param boardId  — the board to watch
 * @param userId   — current user id; events from this user are skipped
 * @param onEvent  — callback invoked for every remote event
 *
 * Integration: import this hook in board-view.tsx and call it inside BoardView:
 *
 *   useBoardEvents(board.id, currentUserId, (event) => {
 *     // update local state based on event.type / event.payload
 *   });
 */
export function useBoardEvents(
  boardId: string,
  userId: string,
  onEvent: (event: BoardEvent) => void,
) {
  // Use a ref so the latest callback is always called without
  // needing to tear down and re-create the EventSource.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    const es = new EventSource(`/api/boards/${boardId}/events`);

    es.onmessage = (msg) => {
      try {
        const event: BoardEvent = JSON.parse(msg.data);

        // Skip the initial "connected" handshake
        if ((event as unknown as { type: string }).type === "connected") return;

        // Don't replay our own mutations
        if (event.userId === userId) return;

        onEventRef.current(event);
      } catch {
        // Ignore malformed messages
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects on error.
      // Close explicitly only if CLOSED state (no auto-reconnect).
      if (es.readyState === EventSource.CLOSED) {
        es.close();
      }
    };

    return es;
  }, [boardId, userId]);

  useEffect(() => {
    const es = connect();
    return () => es.close();
  }, [connect]);
}
