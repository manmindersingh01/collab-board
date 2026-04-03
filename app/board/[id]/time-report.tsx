"use client";

import { useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────

interface TimeReportData {
  totalMinutes: number;
  byUser: { userId: string; name: string; minutes: number }[];
  byCard: { cardId: string; title: string; minutes: number }[];
  byDay: { date: string; minutes: number }[];
}

interface MemberData {
  userId: string;
  user: { id: string; name: string };
}

// ── Helpers ──────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1) + "h";
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ── Component ───────────────────────────────────────────

/**
 * Integration: Add time report button to board header.
 * Render: <TimeReport boardId={boardId} members={members} />
 */
export default function TimeReport({
  boardId,
  members,
}: {
  boardId: string;
  members: MemberData[];
}) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<TimeReportData | null>(null);
  const [loading, setLoading] = useState(false);

  // Default: last 7 days
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const [from, setFrom] = useState(toISODate(weekAgo));
  const [to, setTo] = useState(toISODate(today));
  const [filterUser, setFilterUser] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (filterUser) params.set("userId", filterUser);
    const res = await fetch(`/api/boards/${boardId}/time-report?${params}`);
    if (res.ok) {
      setReport(await res.json());
    }
    setLoading(false);
  }, [boardId, from, to, filterUser]);

  const handleOpen = () => {
    setOpen(true);
    fetchReport();
  };

  if (!open) {
    return (
      <button onClick={handleOpen} className="neo-btn neo-btn-ghost text-xs px-3 py-1">
        Time Report
      </button>
    );
  }

  const maxByUser = report ? Math.max(...report.byUser.map((u) => u.minutes), 1) : 1;
  const maxByDay = report ? Math.max(...report.byDay.map((d) => d.minutes), 1) : 1;

  return (
    <>
      {/* Overlay */}
      <div className="neo-overlay" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="neo-card w-full max-w-2xl max-h-[80vh] overflow-y-auto animate-fade-in p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Time Report</h2>
            <button
              onClick={() => setOpen(false)}
              className="neo-btn neo-btn-ghost text-xs px-2 py-1"
            >
              Close
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div>
              <label className="text-xs font-bold block mb-1">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="neo-input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="neo-input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">User</label>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="neo-input text-sm"
              >
                <option value="">All</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="neo-btn neo-btn-primary text-xs px-4 py-1.5"
              >
                {loading ? "Loading..." : "Generate"}
              </button>
            </div>
          </div>

          {report && (
            <>
              {/* Summary */}
              <div className="neo-card-sm p-4 mb-6 text-center">
                <p className="text-3xl font-bold">{formatHours(report.totalMinutes)}</p>
                <p className="text-xs text-neo-muted">Total time logged</p>
              </div>

              {/* By User */}
              {report.byUser.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-sm mb-2">By User</h3>
                  <div className="space-y-2">
                    {report.byUser.map((u) => (
                      <div key={u.userId} className="flex items-center gap-3">
                        <span className="text-xs w-24 truncate">{u.name}</span>
                        <div className="flex-1 h-5 border-2 border-black rounded overflow-hidden bg-white">
                          <div
                            className="h-full bg-neo-blue transition-all"
                            style={{ width: `${(u.minutes / maxByUser) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-16 text-right">
                          {formatDuration(u.minutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By Day */}
              {report.byDay.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-sm mb-2">By Day</h3>
                  <div className="space-y-2">
                    {report.byDay.map((d) => (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="text-xs w-24 font-mono">{d.date}</span>
                        <div className="flex-1 h-5 border-2 border-black rounded overflow-hidden bg-white">
                          <div
                            className="h-full bg-neo-teal transition-all"
                            style={{ width: `${(d.minutes / maxByDay) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono w-16 text-right">
                          {formatDuration(d.minutes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* By Card */}
              {report.byCard.length > 0 && (
                <div>
                  <h3 className="font-bold text-sm mb-2">By Card</h3>
                  <div className="border-2 border-black rounded overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b-2 border-black bg-neo-yellow/20">
                          <th className="text-left px-3 py-2 font-bold">Card</th>
                          <th className="text-right px-3 py-2 font-bold">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.byCard.map((c) => (
                          <tr key={c.cardId} className="border-b border-black/10">
                            <td className="px-3 py-2 truncate max-w-[300px]">{c.title}</td>
                            <td className="px-3 py-2 text-right font-mono">
                              {formatDuration(c.minutes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {report.totalMinutes === 0 && (
                <p className="text-center text-neo-muted text-sm py-8">
                  No time entries for this period.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
