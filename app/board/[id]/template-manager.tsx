"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────

interface CardTemplate {
  id: string;
  name: string;
  description: string | null;
  priority: string;
  labels: string[];
  createdAt: string;
}

const VALID_PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];

const PRIORITY_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: "Low", color: "#155DFC", bg: "rgba(21,93,252,0.15)" },
  MEDIUM: { label: "Medium", color: "#FF8A00", bg: "rgba(255,138,0,0.15)" },
  HIGH: { label: "High", color: "#FF5252", bg: "rgba(255,82,82,0.15)" },
  URGENT: { label: "Urgent", color: "#FF5252", bg: "rgba(255,82,82,0.3)" },
};

// ── Icons ────────────────────────────────────────────────

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ── TemplateManager Modal ────────────────────────────────

export default function TemplateManager({
  boardId,
  isOwner,
  onClose,
}: {
  boardId: string;
  isOwner: boolean;
  onClose: () => void;
}) {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("NONE");
  const [labelsInput, setLabelsInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/templates`);
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setCreateError("Name is required");
      return;
    }

    setCreating(true);
    setCreateError(null);

    const labels = labelsInput
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/boards/${boardId}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
          priority,
          labels,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create template");
      }

      const template = await res.json();
      setTemplates((prev) => [...prev, template]);
      setName("");
      setDescription("");
      setPriority("NONE");
      setLabelsInput("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(templateId: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));

    try {
      const res = await fetch(`/api/boards/${boardId}/templates/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        fetchTemplates(); // Rollback by refetching
      }
    } catch {
      fetchTemplates();
    }
  }

  return (
    <div
      className="neo-overlay animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="neo-card w-full max-w-lg p-0 animate-slide-up max-h-[80vh] flex flex-col"
        role="dialog"
        aria-labelledby="template-manager-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-neo-black bg-neo-yellow rounded-t-[6px] flex-shrink-0">
          <h2 id="template-manager-title" className="font-black text-lg">
            Card Templates
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-neo-black rounded-md bg-neo-white flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <IconX />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Template list */}
          <div className="p-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="neo-card-sm p-4 animate-pulse-neo">
                    <div className="h-4 w-1/2 bg-gray-200 rounded mb-2" />
                    <div className="h-3 w-3/4 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <p className="text-sm text-neo-red font-semibold">{error}</p>
                <button onClick={fetchTemplates} className="neo-btn neo-btn-ghost text-xs mt-3">
                  Retry
                </button>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-neo-muted text-sm mb-1">No templates yet</p>
                <p className="text-neo-muted text-xs">Create one below to speed up card creation</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {templates.map((t) => {
                  const pri = PRIORITY_STYLE[t.priority];
                  return (
                    <div key={t.id} className="neo-card-sm p-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{t.name}</p>
                        {t.description && (
                          <p className="text-xs text-neo-muted mt-0.5 line-clamp-2">{t.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {pri && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0 rounded border border-current"
                              style={{ color: pri.color, backgroundColor: pri.bg }}
                            >
                              {pri.label}
                            </span>
                          )}
                          {t.labels.map((l) => (
                            <span
                              key={l}
                              className="text-[10px] font-semibold px-1.5 py-0 rounded bg-neo-yellow/30 border border-neo-black/20"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </div>

                      {isOwner && (
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-neo-muted hover:text-neo-red hover:bg-neo-red/10 rounded transition-colors flex-shrink-0"
                          title="Delete template"
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create form */}
          <div className="px-6 pb-6 border-t-2 border-neo-black/10 pt-5">
            <h3 className="font-bold text-sm mb-3">Create Template</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1">
                  Name <span className="text-neo-red">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="e.g. Bug Report, Feature Request"
                  className="neo-input text-sm"
                  maxLength={100}
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  Description <span className="text-neo-muted font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Default description for cards using this template"
                  className="neo-input text-sm resize-none"
                  rows={2}
                  maxLength={2000}
                  disabled={creating}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="neo-input text-sm"
                    disabled={creating}
                  >
                    {VALID_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p === "NONE" ? "None" : p.charAt(0) + p.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-bold mb-1">
                    Labels <span className="text-neo-muted font-normal">(comma sep.)</span>
                  </label>
                  <input
                    type="text"
                    value={labelsInput}
                    onChange={(e) => setLabelsInput(e.target.value)}
                    placeholder="bug, frontend, urgent"
                    className="neo-input text-sm"
                    disabled={creating}
                  />
                </div>
              </div>

              {createError && (
                <p className="text-xs text-neo-red font-semibold">{createError}</p>
              )}

              <button
                type="submit"
                disabled={creating || !name.trim()}
                className="neo-btn neo-btn-primary text-sm w-full"
              >
                {creating ? "Creating..." : "Create Template"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
