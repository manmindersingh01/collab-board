"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────

interface ActiveTimerData {
  id: string;
  startedAt: string;
  card: {
    id: string;
    title: string;
    list: { boardId: string };
  };
}

// ── Helpers ──────────────────────────────────────────────

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ── Component ───────────────────────────────────────────

/**
 * Integration: Add `<ActiveTimerBadge />` to layout.tsx header
 */
export default function ActiveTimerBadge() {
  const [timer, setTimer] = useState<ActiveTimerData | null>(null);
  const [elapsed, setElapsed] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for active timer every 30s
  useEffect(() => {
    const fetchTimer = async () => {
      try {
        const res = await fetch("/api/me/timer");
        if (res.ok) {
          const data = await res.json();
          setTimer(data);
        }
      } catch {
        // Silently ignore - badge is non-critical
      }
    };

    fetchTimer();
    const poll = setInterval(fetchTimer, 30000);
    return () => clearInterval(poll);
  }, []);

  // Live ticking
  useEffect(() => {
    if (timer) {
      const tick = () => setElapsed(formatElapsed(timer.startedAt));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsed("");
    }
  }, [timer]);

  if (!timer) return null;

  return (
    <Link
      href={`/board/${timer.card.list.boardId}?card=${timer.card.id}`}
      className="neo-badge flex items-center gap-2 px-2 py-1 bg-neo-blue/10 border-2 border-neo-blue text-xs font-bold hover:shadow-neo-sm transition-shadow animate-pulse-neo"
    >
      <span className="w-2 h-2 rounded-full bg-neo-red animate-pulse" />
      <span className="truncate max-w-[120px]">{timer.card.title}</span>
      <span className="font-mono">{elapsed}</span>
    </Link>
  );
}
