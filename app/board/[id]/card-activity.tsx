"use client";

import { useState, useEffect } from "react";

interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

const ACTION_LABELS: Record<string, string> = {
  "card.created": "created this card",
  "card.updated": "updated this card",
  "card.moved": "moved this card",
  "card.completed": "marked this card as done",
  "card.assigned": "was assigned to this card",
  "comment.added": "added a comment",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatMetadata(
  action: string,
  metadata: Record<string, unknown> | null,
): string | null {
  if (!metadata) return null;

  if (action === "card.updated" && metadata.changes) {
    const changes = metadata.changes as Record<string, unknown>;
    const fields = Object.keys(changes);
    if (fields.length > 0) {
      return `Changed: ${fields.join(", ")}`;
    }
  }

  if (action === "card.moved" && metadata.fromList && metadata.toList) {
    return `${metadata.fromList} \u2192 ${metadata.toList}`;
  }

  return null;
}

export default function CardActivity({ cardId }: { cardId: string }) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/cards/${cardId}/activity`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setActivities(data);
      } catch {
        // Non-critical — fail silently
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  if (loading) {
    return (
      <div className="py-4">
        <div className="h-4 w-32 bg-neo-black/10 rounded animate-pulse-neo" />
        <div className="mt-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-neo-black/10 animate-pulse-neo shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-48 bg-neo-black/10 rounded animate-pulse-neo" />
                <div className="h-2 w-24 bg-neo-black/10 rounded animate-pulse-neo" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-4 text-sm text-neo-muted text-center">
        No activity yet
      </div>
    );
  }

  return (
    <div className="py-4">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        Activity
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[13px] top-4 bottom-4 w-0.5 bg-neo-black/10" />

        <div className="space-y-4">
          {activities.map((entry) => (
            <div key={entry.id} className="flex gap-3 relative animate-fade-in">
              {/* Avatar */}
              {entry.user.avatarUrl ? (
                <img
                  src={entry.user.avatarUrl}
                  alt={entry.user.name}
                  className="w-7 h-7 rounded-full border-2 border-neo-black shrink-0 relative z-10 bg-neo-bg"
                />
              ) : (
                <div className="w-7 h-7 rounded-full border-2 border-neo-black bg-neo-yellow flex items-center justify-center text-[10px] font-bold shrink-0 relative z-10">
                  {entry.user.name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs">
                  <span className="font-bold">{entry.user.name}</span>{" "}
                  <span className="text-neo-muted">
                    {ACTION_LABELS[entry.action] || entry.action}
                  </span>
                </p>

                {/* Metadata detail */}
                {formatMetadata(entry.action, entry.metadata) && (
                  <p className="text-[11px] text-neo-muted mt-0.5 truncate">
                    {formatMetadata(entry.action, entry.metadata)}
                  </p>
                )}

                <span className="text-[10px] text-neo-muted mt-0.5 block">
                  {timeAgo(entry.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
