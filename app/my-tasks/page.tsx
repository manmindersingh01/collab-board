"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────

interface TaskCard {
  id: string;
  title: string;
  description: string | null;
  position: number;
  priority: string;
  dueDate: string | null;
  labels: string[];
  completionListId: string | null;
  completionListTitle: string | null;
  createdAt: string;
  list: {
    id: string;
    title: string;
    board: { id: string; name: string };
  };
}

// ── Constants ────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

const PRIORITY_STYLE: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  URGENT: { label: "Urgent", color: "#FF5252", bg: "rgba(255,82,82,0.3)" },
  HIGH: { label: "High", color: "#FF5252", bg: "rgba(255,82,82,0.15)" },
  MEDIUM: { label: "Medium", color: "#FF8A00", bg: "rgba(255,138,0,0.15)" },
  LOW: { label: "Low", color: "#155DFC", bg: "rgba(21,93,252,0.15)" },
  NONE: { label: "None", color: "#7a7a7a", bg: "rgba(122,122,122,0.1)" },
};

// ── Helpers ──────────────────────────────────────────────

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 30)
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

function isDueOverdue(dueDate: string) {
  return new Date(dueDate) < new Date();
}

function formatDueDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Page ─────────────────────────────────────────────────

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "urgent" | "overdue">("all");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/my-tasks");
      if (!res.ok) {
        if (res.status === 401) throw new Error("Please sign in to view your tasks");
        throw new Error("Failed to load tasks");
      }
      setTasks(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Sort by priority (urgent first), then by due date
  const sorted = [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 4;
    const pb = PRIORITY_ORDER[b.priority] ?? 4;
    if (pa !== pb) return pa - pb;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  // Apply filter
  const filtered = sorted.filter((t) => {
    if (filter === "urgent") return t.priority === "URGENT" || t.priority === "HIGH";
    if (filter === "overdue") return t.dueDate && isDueOverdue(t.dueDate);
    return true;
  });

  // Group by board
  const grouped = filtered.reduce<Record<string, { boardName: string; boardId: string; cards: TaskCard[] }>>(
    (acc, card) => {
      const key = card.list.board.id;
      if (!acc[key]) {
        acc[key] = { boardName: card.list.board.name, boardId: key, cards: [] };
      }
      acc[key].cards.push(card);
      return acc;
    },
    {},
  );

  const overdueCount = tasks.filter((t) => t.dueDate && isDueOverdue(t.dueDate)).length;
  const urgentCount = tasks.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").length;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-black text-3xl sm:text-4xl tracking-tight mb-1">
          My Tasks
        </h1>
        <p className="text-neo-muted text-sm">
          Cards assigned to you across all boards
        </p>
      </div>

      {/* Stats */}
      {!loading && !error && tasks.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`neo-badge text-sm py-1 px-3 cursor-pointer transition-shadow ${filter === "all" ? "shadow-neo-sm bg-neo-yellow/40" : "hover:shadow-neo-sm"}`}
          >
            All ({tasks.length})
          </button>
          {urgentCount > 0 && (
            <button
              onClick={() => setFilter("urgent")}
              className={`neo-badge text-sm py-1 px-3 cursor-pointer transition-shadow ${filter === "urgent" ? "shadow-neo-sm bg-neo-red/20" : "hover:shadow-neo-sm"}`}
              style={{ borderColor: "#FF5252", color: "#FF5252" }}
            >
              Urgent/High ({urgentCount})
            </button>
          )}
          {overdueCount > 0 && (
            <button
              onClick={() => setFilter("overdue")}
              className={`neo-badge text-sm py-1 px-3 cursor-pointer transition-shadow ${filter === "overdue" ? "shadow-neo-sm bg-neo-orange/20" : "hover:shadow-neo-sm"}`}
              style={{ borderColor: "#FF8A00", color: "#FF8A00" }}
            >
              Overdue ({overdueCount})
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="neo-card p-4 animate-pulse-neo">
              <div className="h-5 w-2/3 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-1/3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 bg-neo-red/20 border-2 border-neo-black rounded-xl shadow-neo flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF5252" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-neo-red font-semibold mb-4">{error}</p>
          <button onClick={fetchTasks} className="neo-btn neo-btn-ghost">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && tasks.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-20 h-20 bg-neo-teal/20 border-2 border-neo-black rounded-xl shadow-neo-lg flex items-center justify-center mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 className="font-black text-2xl mb-2">All clear!</h3>
          <p className="text-neo-muted text-sm max-w-xs">
            No cards are assigned to you right now. When someone assigns you a card, it will show up here.
          </p>
        </div>
      )}

      {/* No filter results */}
      {!loading && !error && tasks.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-neo-muted font-semibold">No tasks match this filter</p>
          <button
            onClick={() => setFilter("all")}
            className="text-sm text-neo-blue font-bold mt-2 hover:underline"
          >
            Show all tasks
          </button>
        </div>
      )}

      {/* Task list grouped by board */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-8">
          {Object.values(grouped).map((group) => (
            <div key={group.boardId}>
              {/* Board header */}
              <div className="flex items-center gap-2 mb-3">
                <Link
                  href={`/board/${group.boardId}`}
                  className="font-black text-base hover:underline decoration-2 underline-offset-4"
                >
                  {group.boardName}
                </Link>
                <span className="text-xs text-neo-muted font-mono">
                  ({group.cards.length})
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2.5">
                {group.cards.map((card) => {
                  const pri = PRIORITY_STYLE[card.priority];
                  const overdue = card.dueDate && isDueOverdue(card.dueDate);
                  const isDone = card.list.title.toLowerCase() === "done";

                  return (
                    <div
                      key={card.id}
                      className="neo-card neo-card-interactive p-4 flex items-start gap-3"
                    >
                      {/* Complete button */}
                      <button
                        title={isDone ? "Already done" : card.completionListTitle ? `Complete → ${card.completionListTitle}` : "Mark as done"}
                        disabled={isDone}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isDone) return;
                          try {
                            const res = await fetch(`/api/cards/${card.id}/complete`, { method: "POST" });
                            if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== card.id));
                          } catch { /* ignore */ }
                        }}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          isDone
                            ? "border-neo-teal bg-neo-teal text-neo-white"
                            : "border-neo-black/30 hover:border-neo-teal hover:bg-neo-teal/20"
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>

                      <Link
                        href={`/board/${card.list.board.id}?card=${card.id}`}
                        className="flex-1 min-w-0"
                      >
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3">
                          <h3 className={`font-bold text-sm leading-snug ${isDone ? "line-through text-neo-muted" : ""}`}>
                            {card.title}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {pri.label !== "None" && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-current"
                                style={{ color: pri.color, backgroundColor: pri.bg }}
                              >
                                {pri.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs text-neo-muted font-mono">
                            {card.list.title}
                          </span>

                          {card.dueDate && (
                            <span
                              className={`text-xs font-semibold ${overdue ? "text-neo-red" : "text-neo-muted"}`}
                            >
                              {formatDueDate(card.dueDate)}
                            </span>
                          )}

                          {card.labels.length > 0 && (
                            <div className="flex gap-1">
                              {card.labels.slice(0, 3).map((l) => (
                                <span
                                  key={l}
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neo-yellow/30 border border-neo-black/20"
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
