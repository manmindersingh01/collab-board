"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface ApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
}

function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
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

export default function ApiKeysPage() {
  const params = useParams<{ slug: string }>();
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${params.slug}/api-keys`);
      if (!res.ok) throw new Error("Failed to load API keys");
      setKeys(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [params.slug]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${params.slug}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresAt: newKeyExpiry || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create API key");
      const data = await res.json();
      setCreatedKey(data.key);
      setNewKeyName("");
      setNewKeyExpiry("");
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      await fetch(`/api/workspaces/${params.slug}/api-keys/${keyId}`, { method: "DELETE" });
      fetchKeys();
    } catch {
      setError("Failed to revoke key");
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-black text-3xl tracking-tight mb-1">API Keys</h1>
          <p className="text-neo-muted text-sm">Manage API keys for external integrations</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="neo-btn neo-btn-primary">
          <IconKey /> Create Key
        </button>
      </div>

      {/* Created key banner */}
      {createdKey && (
        <div className="neo-card bg-neo-yellow/20 border-neo-yellow mb-6 p-4 animate-fade-in">
          <div className="flex items-start justify-between mb-2">
            <p className="font-bold text-sm">Your new API key (copy it now — it won&apos;t be shown again)</p>
            <button onClick={() => setCreatedKey(null)} className="ml-2"><IconX /></button>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-neo-black text-neo-white px-3 py-1.5 rounded font-mono text-sm flex-1 break-all">
              {createdKey}
            </code>
            <button
              onClick={() => copyToClipboard(createdKey)}
              className="neo-btn neo-btn-ghost text-sm px-3"
            >
              <IconCopy /> {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="neo-overlay animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="neo-card w-full max-w-md p-0 animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-neo-black bg-neo-blue/10 rounded-t-[6px]">
              <h2 className="font-black text-lg">Create API Key</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 border-2 border-neo-black rounded-md bg-neo-white flex items-center justify-center hover:bg-gray-100">
                <IconX />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label htmlFor="key-name" className="block text-sm font-bold mb-1.5">Name <span className="text-neo-red">*</span></label>
                <input id="key-name" type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder='e.g. "CI/CD Pipeline", "Zapier"' className="neo-input" autoFocus />
              </div>
              <div>
                <label htmlFor="key-expiry" className="block text-sm font-bold mb-1.5">Expires at <span className="text-neo-muted font-normal">(optional)</span></label>
                <input id="key-expiry" type="date" value={newKeyExpiry} onChange={(e) => setNewKeyExpiry(e.target.value)} className="neo-input" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="neo-btn neo-btn-ghost flex-1">Cancel</button>
                <button type="submit" className="neo-btn neo-btn-primary flex-1" disabled={isCreating || !newKeyName.trim()}>
                  {isCreating ? "Creating..." : "Create Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keys list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="neo-card p-4">
              <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse-neo mb-2" />
              <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse-neo" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="neo-card p-6 text-center">
          <p className="text-neo-red font-semibold mb-3">{error}</p>
          <button onClick={fetchKeys} className="neo-btn neo-btn-ghost">Retry</button>
        </div>
      ) : keys.length === 0 ? (
        <div className="neo-card p-8 text-center">
          <div className="w-14 h-14 bg-neo-bg border-2 border-neo-black rounded-xl shadow-neo flex items-center justify-center mx-auto mb-4">
            <IconKey />
          </div>
          <h3 className="font-bold text-lg mb-1">No API keys yet</h3>
          <p className="text-neo-muted text-sm mb-4">Create an API key to integrate external services</p>
          <button onClick={() => setShowCreate(true)} className="neo-btn neo-btn-primary">
            <IconKey /> Create your first key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={key.id} className={`neo-card p-4 ${key.isRevoked ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{key.name}</span>
                    {key.isRevoked && <span className="neo-badge bg-neo-red/20 text-neo-red text-xs">Revoked</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neo-muted font-mono">
                    <span>{key.keyPrefix}...****</span>
                    <span>Created {relativeTime(key.createdAt)}</span>
                    {key.lastUsedAt && <span>Last used {relativeTime(key.lastUsedAt)}</span>}
                    {key.expiresAt && <span>Expires {new Date(key.expiresAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                {!key.isRevoked && (
                  <button onClick={() => handleRevoke(key.id)} className="neo-btn neo-btn-danger text-sm px-3">
                    <IconTrash /> Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
