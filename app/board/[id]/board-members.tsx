"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────

interface MemberData {
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface ActivityData {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, string>;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

// ── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function relativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 30) return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

const ACTION_LABELS: Record<string, (meta: Record<string, string>) => string> = {
  "card.created": (m) => `created "${m.title ?? "a card"}" in ${m.listTitle ?? "a list"}`,
  "card.moved": (m) => `moved "${m.cardTitle}" from ${m.fromList} to ${m.toList}`,
  "card.updated": (m) => `updated "${m.cardTitle}"`,
  "comment.created": (m) => `commented on "${m.cardTitle}"`,
  "member.added": (m) => `invited ${m.memberName} as ${m.role}`,
  "member.removed": (m) => `removed ${m.memberName}`,
};

function describeAction(action: string, meta: Record<string, string>) {
  const fn = ACTION_LABELS[action];
  return fn ? fn(meta) : action;
}

const ROLE_DISPLAY: Record<string, string> = {
  owner: "Owner",
  editer: "Editor",
  viewer: "Viewer",
};

// ── Avatar ───────────────────────────────────────────────

function Avatar({ name, url, size = "md" }: { name: string; url: string | null; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-6 h-6 text-[8px]" : "w-8 h-8 text-[10px]";
  if (url) {
    return <img src={url} alt={name} className={`${cls} rounded-full border border-neo-black object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${cls} rounded-full border border-neo-black bg-neo-teal/20 flex items-center justify-center font-bold flex-shrink-0`}>
      {initials(name)}
    </div>
  );
}

// ── BoardMembers Modal ───────────────────────────────────

export default function BoardMembersModal({
  boardId,
  initialMembers,
  userRole,
  currentUserId,
  onClose,
  onMembersChanged,
}: {
  boardId: string;
  initialMembers: MemberData[];
  userRole: string;
  currentUserId: string;
  onClose: () => void;
  onMembersChanged: (members: MemberData[]) => void;
}) {
  const isOwner = userRole === "owner";
  const [tab, setTab] = useState<"members" | "activity">("members");
  const [members, setMembers] = useState(initialMembers);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // ─ Invite form ────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editer");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // ─ Fetch activity on tab switch ───────────────────────
  const fetchActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/activity`);
      if (res.ok) setActivities(await res.json());
    } catch { /* ignore */ } finally {
      setLoadingActivity(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (tab === "activity" && activities.length === 0) fetchActivity();
  }, [tab, activities.length, fetchActivity]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ─ Invite handler ─────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviteLoading(true);
    setInviteError(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite");
      const updated = [...members, data];
      setMembers(updated);
      onMembersChanged(updated);
      setEmail("");
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed");
    } finally {
      setInviteLoading(false);
    }
  }

  // ─ Role change ────────────────────────────────────────
  async function handleRoleChange(userId: string, role: string) {
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) return;
      const updated = members.map((m) =>
        m.userId === userId ? { ...m, role } : m,
      );
      setMembers(updated);
      onMembersChanged(updated);
    } catch { /* ignore */ }
  }

  // ─ Remove member ──────────────────────────────────────
  async function handleRemove(userId: string) {
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      const updated = members.filter((m) => m.userId !== userId);
      setMembers(updated);
      onMembersChanged(updated);
    } catch { /* ignore */ }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 animate-fade-in" onClick={onClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg neo-card p-0 animate-slide-up max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-neo-black bg-neo-yellow rounded-t-[6px] flex-shrink-0">
          <h2 className="font-black text-lg">Board Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-neo-black rounded-md bg-neo-white flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-neo-black/15 flex-shrink-0">
          <button
            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${tab === "members" ? "bg-neo-black text-neo-white" : "hover:bg-gray-100"}`}
            onClick={() => setTab("members")}
          >
            Members ({members.length})
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${tab === "activity" ? "bg-neo-black text-neo-white" : "hover:bg-gray-100"}`}
            onClick={() => setTab("activity")}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "members" && (
            <div className="p-5 space-y-4">
              {/* Invite form (owner only) */}
              {isOwner && (
                <form onSubmit={handleInvite} className="space-y-2">
                  <input
                    type="email"
                    placeholder="Enter email address to invite..."
                    className="neo-input text-sm w-full"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setInviteError(null); }}
                    disabled={inviteLoading}
                  />
                  <div className="flex gap-2">
                    <select
                      className="neo-input text-sm flex-1"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="editer">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviteLoading || !email.trim()}
                      className="neo-btn neo-btn-primary text-xs py-1.5 px-4"
                      style={{ boxShadow: "2px 2px 0 #000" }}
                    >
                      {inviteLoading ? "..." : "Invite"}
                    </button>
                  </div>
                  {inviteError && (
                    <p className="text-xs text-neo-red font-semibold">{inviteError}</p>
                  )}
                </form>
              )}

              {/* Member list */}
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Avatar name={m.user.name} url={m.user.avatarUrl} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{m.user.name}</p>
                      <p className="text-xs text-neo-muted truncate">{m.user.email}</p>
                    </div>

                    {isOwner && m.userId !== currentUserId ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          className="text-xs border-2 border-neo-black rounded px-1 py-0.5 font-semibold bg-neo-white"
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                        >
                          <option value="editer">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          className="text-xs text-neo-red font-bold hover:underline"
                          onClick={() => handleRemove(m.userId)}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <span className="neo-badge text-[10px] bg-neo-blue/15 flex-shrink-0">
                        {ROLE_DISPLAY[m.role] ?? m.role}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div className="p-5">
              {loadingActivity && (
                <div className="space-y-3 animate-pulse-neo">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-gray-200" />
                      <div className="flex-1">
                        <div className="h-3 w-3/4 bg-gray-200 rounded mb-1" />
                        <div className="h-2 w-1/3 bg-gray-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loadingActivity && activities.length === 0 && (
                <p className="text-sm text-neo-muted text-center py-8">No activity yet</p>
              )}

              {!loadingActivity && activities.length > 0 && (
                <div className="space-y-3">
                  {activities.map((a) => (
                    <div key={a.id} className="flex gap-3">
                      <Avatar name={a.user.name} url={a.user.avatarUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-bold">{a.user.name}</span>{" "}
                          <span className="text-neo-muted">
                            {describeAction(a.action, a.metadata)}
                          </span>
                        </p>
                        <p className="text-[10px] text-neo-muted font-mono">
                          {relativeTime(a.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
