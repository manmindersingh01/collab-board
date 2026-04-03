"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create workspace");
      }

      const workspace = await res.json();
      router.push(`/workspace/${workspace.slug}/settings`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="neo-card p-8 animate-slide-up">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="text-sm text-neo-muted hover:text-neo-black transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>

          <div className="w-12 h-12 bg-neo-yellow border-2 border-neo-black rounded-xl shadow-neo-sm flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>

          <h1 className="text-2xl font-black mb-1">Create Workspace</h1>
          <p className="text-sm text-neo-muted mb-6">
            A workspace is where your team organizes boards and collaborates.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-bold mb-1.5">
                Workspace Name
              </label>
              <input
                id="name"
                type="text"
                className="neo-input"
                placeholder="e.g., Acme Engineering"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={50}
              />
            </div>

            {slug && (
              <div className="text-xs text-neo-muted">
                URL: collabboard.app/<span className="font-mono font-bold text-neo-black">{slug}</span>
              </div>
            )}

            {error && (
              <div className="neo-badge bg-neo-red text-white text-xs py-1 px-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="neo-btn neo-btn-primary w-full"
            >
              {loading ? (
                <span className="animate-pulse-neo">Creating...</span>
              ) : (
                "Create Workspace"
              )}
            </button>
          </form>

          <p className="text-xs text-neo-muted mt-4 text-center">
            You&apos;ll start on the <span className="font-bold">Free plan</span> (3 boards, 5 members/board).
            Upgrade anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
