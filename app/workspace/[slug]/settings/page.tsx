"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { PLAN_LIMITS } from "@/lib/plan-limits";

interface Member {
  userId: string;
  role: string;
  joinedAt: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  memberCount: number;
  boardCount: number;
  role: string;
  members: Member[];
}

export default function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/workspaces/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setWorkspace(data);
        setEditName(data.name);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSaveName() {
    if (!editName.trim() || editName === workspace?.name) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspaces/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setWorkspace((prev) => (prev ? { ...prev, name: editName.trim() } : prev));
        setMessage("Name updated!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMessage("");

    try {
      const res = await fetch(`/api/workspaces/${slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Add to members list
      setWorkspace((prev) =>
        prev
          ? {
              ...prev,
              members: [
                ...prev.members,
                {
                  userId: data.userId,
                  role: data.role,
                  joinedAt: new Date().toISOString(),
                  name: data.name,
                  email: data.email,
                  avatarUrl: null,
                },
              ],
              memberCount: prev.memberCount + 1,
            }
          : prev
      );
      setInviteEmail("");
      setMessage(`Added ${data.name}!`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      const res = await fetch(`/api/workspaces/${slug}/members/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWorkspace((prev) =>
          prev
            ? {
                ...prev,
                members: prev.members.filter((m) => m.userId !== userId),
                memberCount: prev.memberCount - 1,
              }
            : prev
        );
      }
    } catch {
      setMessage("Failed to remove member");
    }
  }

  async function handleUpgrade() {
    if (!workspace) return;
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setMessage("Failed to create checkout session");
    }
  }

  async function handleManageBilling() {
    if (!workspace) return;
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          workspaceSlug: workspace.slug,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setMessage("Failed to open billing portal");
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="neo-card p-8 animate-pulse-neo">
          <div className="h-8 bg-neo-black/10 rounded w-48 mb-4" />
          <div className="h-4 bg-neo-black/10 rounded w-64" />
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="neo-card p-8 text-center">
          <p className="text-lg font-bold mb-2">Workspace not found</p>
          <Link href="/dashboard" className="neo-btn neo-btn-ghost text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = workspace.role === "ADMIN";
  const planLimits = PLAN_LIMITS[workspace.plan];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black">{workspace.name}</h1>
            <span className="neo-badge bg-neo-yellow text-neo-black">{workspace.plan}</span>
          </div>
          <p className="text-sm text-neo-muted">/{workspace.slug}</p>
        </div>
        <Link
          href={`/workspace/${slug}/analytics`}
          className="neo-btn neo-btn-ghost text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Analytics
        </Link>
      </div>

      {message && (
        <div className="neo-badge bg-neo-teal text-neo-black py-1.5 px-4 text-sm animate-fade-in">
          {message}
        </div>
      )}

      {/* Workspace Info */}
      {isAdmin && (
        <div className="neo-card p-6">
          <h2 className="text-lg font-black mb-4">Workspace Settings</h2>
          <div className="flex gap-3">
            <input
              type="text"
              className="neo-input flex-1"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Workspace name"
              maxLength={50}
            />
            <button
              onClick={handleSaveName}
              disabled={saving || editName === workspace.name}
              className="neo-btn neo-btn-primary"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Plan & Billing */}
      <div className="neo-card p-6">
        <h2 className="text-lg font-black mb-4">Plan & Billing</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="neo-card-sm p-4 text-center">
            <p className="text-2xl font-black">{workspace.boardCount}</p>
            <p className="text-xs text-neo-muted">
              / {planLimits.boards === -1 ? "∞" : planLimits.boards} boards
            </p>
          </div>
          <div className="neo-card-sm p-4 text-center">
            <p className="text-2xl font-black">{workspace.memberCount}</p>
            <p className="text-xs text-neo-muted">members</p>
          </div>
          <div className="neo-card-sm p-4 text-center">
            <p className="text-2xl font-black">
              {planLimits.fileStorageMb >= 1000
                ? `${planLimits.fileStorageMb / 1000}GB`
                : `${planLimits.fileStorageMb}MB`}
            </p>
            <p className="text-xs text-neo-muted">storage</p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-3">
            {workspace.plan === "FREE" ? (
              <>
                <button onClick={handleUpgrade} className="neo-btn neo-btn-secondary text-sm">
                  Upgrade to Pro — $8/mo
                </button>
                <Link href="/pricing" className="neo-btn neo-btn-ghost text-sm">
                  Compare Plans
                </Link>
              </>
            ) : (
              <button onClick={handleManageBilling} className="neo-btn neo-btn-ghost text-sm">
                Manage Billing
              </button>
            )}
          </div>
        )}
      </div>

      {/* Members */}
      <div className="neo-card p-6">
        <h2 className="text-lg font-black mb-4">
          Members ({workspace.members.length})
        </h2>

        {isAdmin && (
          <form onSubmit={handleInvite} className="flex gap-3 mb-4">
            <input
              type="email"
              className="neo-input flex-1"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="neo-input w-32"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="GUEST">Guest</option>
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="neo-btn neo-btn-primary"
            >
              {inviting ? "Adding..." : "Invite"}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {workspace.members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-3 p-3 neo-card-sm"
            >
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
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{member.name}</p>
                <p className="text-xs text-neo-muted truncate">{member.email}</p>
              </div>
              <span className="neo-badge bg-neo-bg text-[10px]">{member.role}</span>
              {isAdmin && member.role !== "ADMIN" && (
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="neo-btn neo-btn-danger text-xs py-1 px-2 shadow-neo-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      {isAdmin && (
        <div className="neo-card p-6 border-neo-red">
          <h2 className="text-lg font-black text-neo-red mb-2">Danger Zone</h2>
          <p className="text-sm text-neo-muted mb-4">
            Deleting a workspace removes all boards, cards, and member associations permanently.
          </p>
          <button className="neo-btn neo-btn-danger text-sm" disabled>
            Delete Workspace (coming soon)
          </button>
        </div>
      )}
    </div>
  );
}
