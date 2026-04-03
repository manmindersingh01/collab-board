"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface AnalyticsData {
  totalCards: number;
  completedCards: number;
  overdueCards: number;
  cardsByPriority: { priority: string; count: number }[];
  cardsByList: { listTitle: string; count: number }[];
  cardsCompletedPerWeek: { week: string; count: number }[];
  averageCycleTime: number;
  topMembers: { name: string; avatarUrl: string | null; completed: number }[];
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-neo-red",
  HIGH: "bg-neo-orange",
  MEDIUM: "bg-neo-yellow",
  LOW: "bg-neo-teal",
  NONE: "bg-neo-muted/40",
};

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workspaces/${slug}/analytics`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="neo-card p-6 animate-pulse-neo">
              <div className="h-8 bg-neo-black/10 rounded w-16 mb-2" />
              <div className="h-4 bg-neo-black/10 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="neo-card p-8 text-center">
          <p className="text-lg font-bold mb-2">Could not load analytics</p>
          <Link href="/dashboard" className="neo-btn neo-btn-ghost text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const maxWeekly = Math.max(...data.cardsCompletedPerWeek.map((w) => w.count), 1);
  const maxPriority = Math.max(...data.cardsByPriority.map((p) => p.count), 1);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/workspace/${slug}/settings`}
            className="text-sm text-neo-muted hover:text-neo-black transition-colors"
          >
            ← Workspace Settings
          </Link>
          <h1 className="text-2xl font-black mt-1">Analytics</h1>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-grid">
        <div className="neo-card p-5">
          <p className="text-3xl font-black">{data.totalCards}</p>
          <p className="text-sm text-neo-muted font-medium">Total Cards</p>
        </div>
        <div className="neo-card p-5">
          <p className="text-3xl font-black text-neo-teal">{data.completedCards}</p>
          <p className="text-sm text-neo-muted font-medium">Completed</p>
        </div>
        <div className="neo-card p-5">
          <p className="text-3xl font-black text-neo-red">{data.overdueCards}</p>
          <p className="text-sm text-neo-muted font-medium">Overdue</p>
        </div>
        <div className="neo-card p-5">
          <p className="text-3xl font-black">{data.averageCycleTime}d</p>
          <p className="text-sm text-neo-muted font-medium">Avg Cycle Time</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Cards by Priority */}
        <div className="neo-card p-6">
          <h2 className="text-lg font-black mb-4">Cards by Priority</h2>
          {data.cardsByPriority.length === 0 ? (
            <p className="text-sm text-neo-muted">No card data yet</p>
          ) : (
            <div className="space-y-3">
              {data.cardsByPriority.map((item) => (
                <div key={item.priority} className="flex items-center gap-3">
                  <span className="text-xs font-bold w-16 text-right">
                    {item.priority}
                  </span>
                  <div className="flex-1 h-8 bg-neo-bg border-2 border-neo-black rounded overflow-hidden">
                    <div
                      className={`h-full ${
                        PRIORITY_COLORS[item.priority] || "bg-neo-blue"
                      } transition-all duration-500`}
                      style={{ width: `${(item.count / maxPriority) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-black w-8">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cards Completed per Week */}
        <div className="neo-card p-6">
          <h2 className="text-lg font-black mb-4">Completed per Week</h2>
          {data.cardsCompletedPerWeek.length === 0 ? (
            <p className="text-sm text-neo-muted">No completions yet</p>
          ) : (
            <div>
              <div className="h-40 flex items-end gap-2">
                {data.cardsCompletedPerWeek.map((w) => (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold">{w.count}</span>
                    <div
                      className="w-full bg-neo-blue border-2 border-neo-black rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.max((w.count / maxWeekly) * 100, 4)}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                {data.cardsCompletedPerWeek.map((w) => (
                  <div key={w.week} className="flex-1 text-center">
                    <span className="text-[10px] text-neo-muted">
                      {new Date(w.week).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cards by List */}
      {data.cardsByList.length > 0 && (
        <div className="neo-card p-6">
          <h2 className="text-lg font-black mb-4">Cards by List</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.cardsByList.map((item) => (
              <div key={item.listTitle} className="neo-card-sm p-3 text-center">
                <p className="text-xl font-black">{item.count}</p>
                <p className="text-xs text-neo-muted truncate">{item.listTitle}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Contributors */}
      {data.topMembers.length > 0 && (
        <div className="neo-card p-6">
          <h2 className="text-lg font-black mb-4">Top Contributors</h2>
          <div className="space-y-2">
            {data.topMembers.map((member, i) => (
              <div key={member.name} className="flex items-center gap-3 p-3 neo-card-sm">
                <span className="text-sm font-black text-neo-muted w-6">
                  #{i + 1}
                </span>
                <div className="w-8 h-8 rounded-full border-2 border-neo-black bg-neo-yellow flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    member.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{member.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black">{member.completed}</span>
                  <span className="text-xs text-neo-muted">cards</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
