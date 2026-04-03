"use client";

import { useState, useEffect, useCallback } from "react";

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

const WEBHOOK_EVENTS = [
  "card.created",
  "card.updated",
  "card.moved",
  "card.deleted",
  "card.completed",
  "list.created",
  "comment.added",
];

function IconWebhook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="3,6 5,6 21,6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export default function WebhooksManager({
  boardId,
  isOpen,
  onClose,
}: {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

  const fetchEndpoints = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/webhooks`);
      if (res.ok) setEndpoints(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (isOpen) fetchEndpoints();
  }, [isOpen, fetchEndpoints]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim() || newEvents.length === 0) return;
    setIsCreating(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl.trim(), events: newEvents }),
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedSecret(data.secret);
        setNewUrl("");
        setNewEvents([]);
        setShowCreate(false);
        fetchEndpoints();
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(webhookId: string) {
    await fetch(`/api/boards/${boardId}/webhooks/${webhookId}`, { method: "DELETE" });
    fetchEndpoints();
  }

  async function handleTest(webhookId: string) {
    setTestResults((prev) => ({ ...prev, [webhookId]: null }));
    try {
      const res = await fetch(`/api/boards/${boardId}/webhooks/${webhookId}/test`, { method: "POST" });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [webhookId]: { success: data.success, message: data.success ? `OK (${data.statusCode})` : data.error || "Failed" },
      }));
    } catch {
      setTestResults((prev) => ({ ...prev, [webhookId]: { success: false, message: "Request failed" } }));
    }
  }

  function toggleEvent(event: string) {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  }

  if (!isOpen) return null;

  return (
    <div className="neo-overlay animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="neo-card w-full max-w-2xl p-0 animate-slide-in-right max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-neo-black bg-neo-green/10 rounded-t-[6px] sticky top-0 z-10">
          <h2 className="font-black text-lg flex items-center gap-2"><IconWebhook /> Webhooks</h2>
          <button onClick={onClose} className="w-8 h-8 border-2 border-neo-black rounded-md bg-neo-white flex items-center justify-center hover:bg-gray-100">
            <IconX />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Created secret banner */}
          {createdSecret && (
            <div className="neo-card bg-neo-yellow/20 border-neo-yellow p-4 animate-fade-in">
              <div className="flex items-start justify-between mb-2">
                <p className="font-bold text-sm">Signing secret (save it now — won&apos;t be shown again)</p>
                <button onClick={() => setCreatedSecret(null)}><IconX /></button>
              </div>
              <code className="bg-neo-black text-neo-white px-3 py-1.5 rounded font-mono text-xs break-all block">{createdSecret}</code>
            </div>
          )}

          {/* Create form */}
          {showCreate ? (
            <form onSubmit={handleCreate} className="neo-card-sm p-4 space-y-3 border-dashed">
              <div>
                <label className="block text-sm font-bold mb-1">URL <span className="text-neo-red">*</span></label>
                <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://your-service.com/webhook" className="neo-input" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Events <span className="text-neo-red">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
                      className={`neo-badge cursor-pointer transition-colors ${newEvents.includes(event) ? "bg-neo-blue text-white border-neo-blue" : "bg-neo-bg"}`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="neo-btn neo-btn-ghost flex-1 text-sm">Cancel</button>
                <button type="submit" className="neo-btn neo-btn-primary flex-1 text-sm" disabled={isCreating || !newUrl.trim() || newEvents.length === 0}>
                  {isCreating ? "Creating..." : "Create Webhook"}
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowCreate(true)} className="neo-btn neo-btn-primary w-full">
              <IconWebhook /> Add Webhook Endpoint
            </button>
          )}

          {/* Endpoints list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="neo-card p-4">
                  <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse-neo mb-2" />
                  <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse-neo" />
                </div>
              ))}
            </div>
          ) : endpoints.length === 0 ? (
            <div className="text-center py-8 text-neo-muted text-sm">
              No webhook endpoints configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {endpoints.map((ep) => (
                <div key={ep.id} className="neo-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono break-all">{ep.url}</code>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ep.events.map((ev) => (
                          <span key={ev} className="neo-badge bg-neo-bg text-xs">{ev}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <button onClick={() => handleTest(ep.id)} className="neo-btn neo-btn-ghost text-xs px-2 py-1">
                        <IconPlay /> Test
                      </button>
                      <button onClick={() => handleDelete(ep.id)} className="neo-btn neo-btn-danger text-xs px-2 py-1">
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                  {testResults[ep.id] !== undefined && testResults[ep.id] !== null && (
                    <div className={`text-xs mt-2 font-mono ${testResults[ep.id]!.success ? "text-green-600" : "text-neo-red"}`}>
                      {testResults[ep.id]!.success ? "OK" : "FAIL"}: {testResults[ep.id]!.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
