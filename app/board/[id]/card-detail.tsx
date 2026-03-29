"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Markdown from "react-markdown";

// ── Types ────────────────────────────────────────────────

interface AssigneeData {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface CommentData {
  id: string;
  message: string;
  createdAt: string;
  author: AssigneeData;
}

interface CardFull {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  labels: string[];
  completionListId: string | null;
  assignee: AssigneeData | null;
  list: { id: string; title: string };
  comments: CommentData[];
}

interface MemberData {
  userId: string;
  role: string;
  user: AssigneeData & { email: string };
}

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

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Inline Editable Title ────────────────────────────────

function EditableTitle({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
  }

  if (!editing) {
    return (
      <h2
        className="font-black text-xl cursor-text hover:bg-neo-yellow/20 rounded px-1 -mx-1 transition-colors"
        onClick={() => setEditing(true)}
      >
        {value}
      </h2>
    );
  }

  return (
    <input
      ref={inputRef}
      className="neo-input font-black text-xl px-1 -mx-1"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      maxLength={100}
    />
  );
}

// ── Priority Selector ────────────────────────────────────

const PRIORITIES = [
  { value: "NONE", label: "None", color: "#7a7a7a" },
  { value: "LOW", label: "Low", color: "#155DFC" },
  { value: "MEDIUM", label: "Medium", color: "#FF8A00" },
  { value: "HIGH", label: "High", color: "#FF5252" },
  { value: "URGENT", label: "Urgent", color: "#FF5252" },
];

function PrioritySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = PRIORITIES.find((p) => p.value === value) ?? PRIORITIES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="neo-badge cursor-pointer hover:shadow-neo-sm transition-shadow"
        style={{
          borderColor: current.color,
          color: current.color,
          backgroundColor: `${current.color}18`,
        }}
      >
        {current.label}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 neo-card p-1 min-w-[140px]">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              className="w-full text-left px-3 py-1.5 text-sm font-semibold rounded hover:bg-gray-100 transition-colors flex items-center gap-2"
              onClick={() => {
                onChange(p.value);
                setOpen(false);
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Labels Editor ────────────────────────────────────────

function LabelsEditor({
  labels,
  onChange,
}: {
  labels: string[];
  onChange: (labels: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function addLabel() {
    const trimmed = input.trim();
    if (trimmed && !labels.includes(trimmed)) {
      onChange([...labels, trimmed]);
    }
    setInput("");
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {labels.map((label) => (
        <span
          key={label}
          className="neo-badge bg-neo-yellow/30 text-xs group cursor-pointer"
          onClick={() => onChange(labels.filter((l) => l !== label))}
        >
          {label}
          <span className="opacity-0 group-hover:opacity-100 text-neo-red ml-0.5 transition-opacity">&times;</span>
        </span>
      ))}
      <input
        className="text-xs border-b-2 border-dashed border-neo-black/30 bg-transparent outline-none py-0.5 px-1 w-20 focus:border-neo-black transition-colors"
        placeholder="+ add"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addLabel();
          }
        }}
        onBlur={addLabel}
      />
    </div>
  );
}

// ── Description Editor ───────────────────────────────────

function DescriptionEditor({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (v: string | null) => void;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [draft, setDraft] = useState(value ?? "");
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      setDraft(value ?? "");
      prevValue.current = value;
    }
  }, [value]);

  function handleBlur() {
    const trimmed = draft.trim() || null;
    if (trimmed !== value) onSave(trimmed);
  }

  return (
    <div>
      <div className="flex gap-1 mb-2">
        <button
          className={`text-xs font-bold px-2 py-1 rounded transition-colors ${tab === "write" ? "bg-neo-black text-neo-white" : "hover:bg-gray-100"}`}
          onClick={() => setTab("write")}
        >
          Write
        </button>
        <button
          className={`text-xs font-bold px-2 py-1 rounded transition-colors ${tab === "preview" ? "bg-neo-black text-neo-white" : "hover:bg-gray-100"}`}
          onClick={() => setTab("preview")}
        >
          Preview
        </button>
      </div>

      {tab === "write" ? (
        <textarea
          className="neo-input resize-none text-sm font-mono"
          rows={6}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          placeholder="Add a description (Markdown supported)..."
        />
      ) : (
        <div className="border-2 border-neo-black rounded-lg p-3 min-h-[120px] text-sm prose prose-sm max-w-none prose-headings:font-black prose-headings:mb-1 prose-p:my-1 prose-code:bg-neo-yellow/20 prose-code:px-1 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']">
          {draft ? (
            <Markdown>{draft}</Markdown>
          ) : (
            <p className="text-neo-muted italic">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Comment Item ─────────────────────────────────────────

function CommentItem({ comment }: { comment: CommentData }) {
  return (
    <div className="flex gap-3">
      {comment.author.avatarUrl ? (
        <img
          src={comment.author.avatarUrl}
          alt={comment.author.name}
          className="w-7 h-7 rounded-full border border-neo-black flex-shrink-0 object-cover"
        />
      ) : (
        <div className="w-7 h-7 rounded-full border border-neo-black bg-neo-blue/20 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
          {initials(comment.author.name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold">{comment.author.name}</span>
          <span className="text-[10px] text-neo-muted font-mono">
            {relativeTime(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">
          {comment.message}
        </p>
      </div>
    </div>
  );
}

// ── Add Comment Input ────────────────────────────────────

function AddCommentInput({
  cardId,
  currentUser,
  onCommentAdded,
}: {
  cardId: string;
  currentUser: AssigneeData;
  onCommentAdded: (comment: CommentData) => void;
}) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) return;

    setSubmitting(true);

    // Optimistic: add to list immediately
    const optimistic: CommentData = {
      id: `temp-${Date.now()}`,
      message: trimmed,
      createdAt: new Date().toISOString(),
      author: currentUser,
    };
    onCommentAdded(optimistic);
    setMessage("");

    try {
      const res = await fetch(`/api/cards/${cardId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) throw new Error();
      // Server comment replaces optimistic on next full fetch
    } catch {
      // Comment will be corrected on next fetch
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex gap-2">
      <textarea
        className="neo-input resize-none text-sm flex-1"
        rows={2}
        placeholder="Add a comment..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
        disabled={submitting}
      />
      <button
        onClick={handleSubmit}
        disabled={submitting || !message.trim()}
        className="neo-btn neo-btn-primary self-end text-xs py-1.5 px-3"
        style={{ boxShadow: "2px 2px 0 #000" }}
      >
        Send
      </button>
    </div>
  );
}

// ── CardDetail (main export) ─────────────────────────────

export default function CardDetail({
  cardId,
  boardId,
  members,
  boardLists,
  currentUserId,
  canEdit,
  onClose,
  onCardUpdated,
  onMarkDone,
}: {
  cardId: string;
  boardId: string;
  members: MemberData[];
  boardLists: { id: string; title: string }[];
  currentUserId: string;
  canEdit: boolean;
  onClose: () => void;
  onCardUpdated: (cardId: string, updates: Record<string, unknown>) => void;
  onMarkDone: (cardId: string) => void;
}) {
  const [card, setCard] = useState<CardFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Current user info for comments
  const currentMember = members.find((m) => m.userId === currentUserId);
  const currentUser: AssigneeData = currentMember
    ? { id: currentMember.user.id, name: currentMember.user.name, avatarUrl: currentMember.user.avatarUrl }
    : { id: currentUserId, name: "You", avatarUrl: null };

  // Fetch full card data
  const fetchCard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}`);
      if (!res.ok) throw new Error("Failed to load card");
      const data = await res.json();
      setCard(data);
    } catch {
      setError("Could not load card details");
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ─ Save field to API ──────────────────────────────────
  async function saveField(field: string, value: unknown) {
    if (!card) return;
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setCard((prev) => (prev ? { ...prev, ...updated } : prev));
      onCardUpdated(cardId, { [field]: value, ...updated });
    } catch {
      // Revert — re-fetch from server
      fetchCard();
    }
  }

  // ─ Assignee dropdown ──────────────────────────────────
  const [assigneeOpen, setAssigneeOpen] = useState(false);

  function renderAssignee() {
    return (
      <div className="relative">
        <button
          onClick={() => canEdit && setAssigneeOpen(!assigneeOpen)}
          className={`flex items-center gap-2 text-sm ${canEdit ? "hover:bg-neo-yellow/20 cursor-pointer" : ""} rounded px-1 -mx-1 py-0.5 transition-colors`}
        >
          {card?.assignee ? (
            <>
              {card.assignee.avatarUrl ? (
                <img src={card.assignee.avatarUrl} alt="" className="w-5 h-5 rounded-full border border-neo-black object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full border border-neo-black bg-neo-blue/20 flex items-center justify-center text-[8px] font-bold">
                  {initials(card.assignee.name)}
                </div>
              )}
              <span className="font-semibold">{card.assignee.name}</span>
            </>
          ) : (
            <span className="text-neo-muted">Unassigned</span>
          )}
        </button>

        {assigneeOpen && (
          <div className="absolute top-full left-0 mt-1 z-10 neo-card p-1 min-w-[200px] max-h-[200px] overflow-y-auto">
            <button
              className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors text-neo-muted"
              onClick={() => {
                saveField("assigneeId", null);
                setAssigneeOpen(false);
              }}
            >
              Unassigned
            </button>
            {members.map((m) => (
              <button
                key={m.userId}
                className="w-full text-left px-3 py-1.5 text-sm font-semibold rounded hover:bg-gray-100 transition-colors flex items-center gap-2"
                onClick={() => {
                  saveField("assigneeId", m.userId);
                  setAssigneeOpen(false);
                }}
              >
                {m.user.avatarUrl ? (
                  <img src={m.user.avatarUrl} alt="" className="w-5 h-5 rounded-full border border-neo-black object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-neo-black bg-neo-teal/20 flex items-center justify-center text-[8px] font-bold">
                    {initials(m.user.name)}
                  </div>
                )}
                {m.user.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─ Render ─────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Side panel */}
      <div
        ref={panelRef}
        className="fixed top-16 right-0 bottom-0 w-full max-w-[500px] bg-neo-white border-l-2 border-neo-black z-50 flex flex-col animate-slide-in-right"
        style={{ boxShadow: "-4px 0 0 0 #000" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b-2 border-neo-black/15 flex-shrink-0">
          <div className="flex items-center gap-2">
            {card && (
              <span className="neo-badge bg-neo-yellow/30 text-xs">
                {card.list.title}
              </span>
            )}
            {card && card.list.title.toLowerCase() !== "done" && (canEdit || card.assignee?.id === currentUserId) && (() => {
              const targetName = card.completionListId
                ? boardLists.find((l) => l.id === card.completionListId)?.title
                : null;
              return (
                <button
                  onClick={() => { onMarkDone(cardId); onClose(); }}
                  className="neo-btn neo-btn-ghost text-xs py-1 px-2.5 bg-neo-teal/15 border-neo-teal text-neo-teal hover:bg-neo-teal hover:text-neo-white"
                  style={{ boxShadow: "2px 2px 0 #00D4AA" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {targetName ? `Complete → ${targetName}` : "Mark Done"}
                </button>
              );
            })()}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-neo-black rounded-md bg-neo-white flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading && (
            <div className="space-y-4 animate-pulse-neo">
              <div className="h-7 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-1/2 bg-gray-100 rounded" />
              <div className="h-32 w-full bg-gray-100 rounded" />
              <div className="h-20 w-full bg-gray-100 rounded" />
            </div>
          )}

          {error && (
            <div className="text-center py-10">
              <p className="text-neo-red font-semibold mb-3">{error}</p>
              <button onClick={fetchCard} className="neo-btn neo-btn-ghost text-sm">
                Retry
              </button>
            </div>
          )}

          {card && !loading && (
            <>
              {/* Title */}
              {canEdit ? (
                <EditableTitle
                  value={card.title}
                  onSave={(v) => saveField("title", v)}
                />
              ) : (
                <h2 className="font-black text-xl">{card.title}</h2>
              )}

              {/* Fields grid */}
              <div className="grid grid-cols-[100px_1fr] gap-y-3 gap-x-4 text-sm items-center">
                {/* Priority */}
                <span className="text-neo-muted font-semibold">Priority</span>
                {canEdit ? (
                  <PrioritySelector
                    value={card.priority}
                    onChange={(v) => saveField("priority", v)}
                  />
                ) : (
                  <span className="font-semibold">{card.priority}</span>
                )}

                {/* Due Date */}
                <span className="text-neo-muted font-semibold">Due Date</span>
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      className="neo-input text-sm py-1 px-2 w-auto"
                      value={
                        card.dueDate
                          ? new Date(card.dueDate).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        saveField(
                          "dueDate",
                          e.target.value ? new Date(e.target.value).toISOString() : null,
                        )
                      }
                    />
                    {card.dueDate && (
                      <button
                        className="text-xs text-neo-red font-semibold hover:underline"
                        onClick={() => saveField("dueDate", null)}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                ) : (
                  <span>
                    {card.dueDate
                      ? new Date(card.dueDate).toLocaleDateString()
                      : "—"}
                  </span>
                )}

                {/* Assignee */}
                <span className="text-neo-muted font-semibold">Assignee</span>
                {renderAssignee()}

                {/* Labels */}
                <span className="text-neo-muted font-semibold self-start pt-0.5">
                  Labels
                </span>
                {canEdit ? (
                  <LabelsEditor
                    labels={card.labels}
                    onChange={(v) => saveField("labels", v)}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {card.labels.length > 0
                      ? card.labels.map((l) => (
                          <span key={l} className="neo-badge bg-neo-yellow/30 text-xs">{l}</span>
                        ))
                      : <span className="text-neo-muted">—</span>}
                  </div>
                )}

                {/* On completion, move to */}
                {canEdit && (
                  <>
                    <span className="text-neo-muted font-semibold self-start pt-1">On complete</span>
                    <select
                      className="neo-input text-sm py-1 px-2"
                      value={card.completionListId ?? ""}
                      onChange={(e) =>
                        saveField(
                          "completionListId",
                          e.target.value || null,
                        )
                      }
                    >
                      <option value="">Default (Done list)</option>
                      {boardLists.map((l) => (
                        <option key={l.id} value={l.id}>
                          → {l.title}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-bold mb-2">Description</h3>
                {canEdit ? (
                  <DescriptionEditor
                    value={card.description}
                    onSave={(v) => saveField("description", v)}
                  />
                ) : (
                  <div className="border-2 border-neo-black/20 rounded-lg p-3 text-sm prose prose-sm max-w-none">
                    {card.description ? (
                      <Markdown>{card.description}</Markdown>
                    ) : (
                      <p className="text-neo-muted italic">No description</p>
                    )}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div>
                <h3 className="text-sm font-bold mb-3">
                  Comments
                  {card.comments.length > 0 && (
                    <span className="text-neo-muted font-mono ml-1">
                      ({card.comments.length})
                    </span>
                  )}
                </h3>

                <div className="space-y-4 mb-4">
                  {card.comments.length === 0 && (
                    <p className="text-xs text-neo-muted">No comments yet</p>
                  )}
                  {card.comments.map((c) => (
                    <CommentItem key={c.id} comment={c} />
                  ))}
                </div>

                <AddCommentInput
                  cardId={card.id}
                  currentUser={currentUser}
                  onCommentAdded={(comment) =>
                    setCard((prev) =>
                      prev
                        ? { ...prev, comments: [...prev.comments, comment] }
                        : prev,
                    )
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
