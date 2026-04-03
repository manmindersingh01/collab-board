"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────

interface TimeEntryData {
  id: string;
  description: string | null;
  startedAt: string;
  stoppedAt: string | null;
  duration: number | null;
  isManual: boolean;
  userId: string;
  user?: { id: string; name: string; avatarUrl: string | null };
}

// ── Helpers ──────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function relativeDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ───────────────────────────────────────────

/**
 * Integration: Add `<TimeTracker cardId={card.id} />` to card-detail.tsx
 */
export default function TimeTracker({ cardId }: { cardId: string }) {
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntryData | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loading, setLoading] = useState(false);
  const [manualDuration, setManualDuration] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [showManual, setShowManual] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch time entries
  const fetchEntries = useCallback(async () => {
    const res = await fetch(`/api/cards/${cardId}/time`);
    if (res.ok) {
      const data: TimeEntryData[] = await res.json();
      setEntries(data);
      const running = data.find((e) => !e.stoppedAt);
      setActiveTimer(running ?? null);
    }
  }, [cardId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Live ticking for active timer
  useEffect(() => {
    if (activeTimer) {
      const tick = () => setElapsed(formatElapsed(activeTimer.startedAt));
      tick();
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    } else {
      setElapsed("00:00:00");
    }
  }, [activeTimer]);

  const handleStart = async () => {
    setLoading(true);
    const res = await fetch(`/api/cards/${cardId}/time/start`, { method: "POST" });
    if (res.ok) await fetchEntries();
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    const res = await fetch(`/api/cards/${cardId}/time/stop`, { method: "POST" });
    if (res.ok) await fetchEntries();
    setLoading(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dur = parseFloat(manualDuration);
    if (!dur || dur <= 0) return;
    setLoading(true);
    const res = await fetch(`/api/cards/${cardId}/time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duration: dur,
        description: manualDesc || undefined,
      }),
    });
    if (res.ok) {
      setManualDuration("");
      setManualDesc("");
      setShowManual(false);
      await fetchEntries();
    }
    setLoading(false);
  };

  const handleDelete = async (entryId: string) => {
    const res = await fetch(`/api/cards/${cardId}/time/${entryId}`, {
      method: "DELETE",
    });
    if (res.ok) await fetchEntries();
  };

  const completedEntries = entries.filter((e) => e.stoppedAt);
  const totalMinutes = completedEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0);

  return (
    <div className="mt-6 border-t-2 border-black pt-4">
      <h3 className="font-bold text-sm uppercase tracking-wide mb-3">
        Time Tracking
      </h3>

      {/* Active Timer */}
      <div className="flex items-center gap-3 mb-4">
        {activeTimer ? (
          <>
            <span className="font-mono text-lg font-bold text-neo-blue">
              {elapsed}
            </span>
            <button
              onClick={handleStop}
              disabled={loading}
              className="neo-btn neo-btn-danger text-xs px-3 py-1"
            >
              Stop
            </button>
          </>
        ) : (
          <button
            onClick={handleStart}
            disabled={loading}
            className="neo-btn neo-btn-primary text-xs px-3 py-1"
          >
            Start Timer
          </button>
        )}

        <button
          onClick={() => setShowManual(!showManual)}
          className="neo-btn neo-btn-ghost text-xs px-3 py-1 ml-auto"
        >
          + Manual
        </button>
      </div>

      {/* Manual Entry Form */}
      {showManual && (
        <form
          onSubmit={handleManualSubmit}
          className="neo-card-sm p-3 mb-4 flex flex-col gap-2"
        >
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Minutes"
              value={manualDuration}
              onChange={(e) => setManualDuration(e.target.value)}
              className="neo-input text-sm w-24"
              required
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={manualDesc}
              onChange={(e) => setManualDesc(e.target.value)}
              className="neo-input text-sm flex-1"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="neo-btn neo-btn-primary text-xs self-end px-3 py-1"
          >
            Log Time
          </button>
        </form>
      )}

      {/* Total */}
      {totalMinutes > 0 && (
        <p className="text-xs text-neo-muted mb-2">
          Total: <span className="font-bold text-foreground">{formatDuration(totalMinutes)}</span>
        </p>
      )}

      {/* Past Entries */}
      {completedEntries.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {completedEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between text-xs py-1.5 px-2 rounded border border-black/10 hover:bg-black/5 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold">
                  {formatDuration(entry.duration ?? 0)}
                </span>
                {entry.user && (
                  <span className="text-neo-muted truncate">
                    {entry.user.name}
                  </span>
                )}
                {entry.description && (
                  <span className="text-neo-muted truncate italic">
                    {entry.description}
                  </span>
                )}
                {entry.isManual && (
                  <span className="neo-badge text-[10px] px-1 py-0">manual</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neo-muted whitespace-nowrap">
                  {relativeDate(entry.startedAt)}
                </span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="opacity-0 group-hover:opacity-100 text-neo-red hover:underline transition-opacity"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
