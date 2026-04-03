"use client";

import { useState, useEffect, useCallback } from "react";

// ── Types ────────────────────────────────────────────────

interface AutomationData {
  id: string;
  name: string;
  isActive: boolean;
  trigger: { event: string; conditions?: Record<string, string> };
  actions: ActionConfig[];
  createdAt: string;
}

interface ActionConfig {
  type: string;
  field?: string;
  value?: string;
  listId?: string;
  userId?: string;
  label?: string;
  message?: string;
}

interface ListData {
  id: string;
  title: string;
}

interface MemberData {
  userId: string;
  user: { id: string; name: string };
}

interface AutomationsManagerProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
  lists: ListData[];
  members: MemberData[];
  isOwner: boolean;
}

// ── Constants ────────────────────────────────────────────

const TRIGGER_EVENTS = [
  { value: "card.created", label: "Card created" },
  { value: "card.moved", label: "Card moved" },
  { value: "card.updated", label: "Card updated" },
  { value: "card.completed", label: "Card completed" },
  { value: "due.approaching", label: "Due date approaching (24h)" },
  { value: "due.overdue", label: "Due date overdue" },
];

const ACTION_TYPES = [
  { value: "set_field", label: "Set field" },
  { value: "move_to_list", label: "Move to list" },
  { value: "assign", label: "Assign to user" },
  { value: "unassign", label: "Unassign" },
  { value: "add_label", label: "Add label" },
  { value: "remove_label", label: "Remove label" },
  { value: "notify", label: "Send notification" },
  { value: "add_comment", label: "Add comment" },
];

const SETTABLE_FIELDS = [
  { value: "priority", label: "Priority" },
];

const PRIORITY_VALUES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];

function eventLabel(event: string) {
  return TRIGGER_EVENTS.find((e) => e.value === event)?.label ?? event;
}

function actionLabel(type: string) {
  return ACTION_TYPES.find((a) => a.value === type)?.label ?? type;
}

// ── Component ────────────────────────────────────────────

export default function AutomationsManager({
  boardId,
  isOpen,
  onClose,
  lists,
  members,
  isOwner,
}: AutomationsManagerProps) {
  const [automations, setAutomations] = useState<AutomationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEvent, setFormEvent] = useState("card.created");
  const [formConditions, setFormConditions] = useState<Record<string, string>>(
    {},
  );
  const [formActions, setFormActions] = useState<ActionConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchAutomations = useCallback(async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/automations`);
      if (res.ok) {
        setAutomations(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchAutomations();
    }
  }, [isOpen, fetchAutomations]);

  function resetForm() {
    setFormName("");
    setFormEvent("card.created");
    setFormConditions({});
    setFormActions([]);
    setError("");
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setView("create");
  }

  function openEdit(auto: AutomationData) {
    setFormName(auto.name);
    setFormEvent(auto.trigger.event);
    setFormConditions(auto.trigger.conditions ?? {});
    setFormActions(auto.actions);
    setEditingId(auto.id);
    setView("edit");
  }

  async function handleSave() {
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      name: formName.trim(),
      trigger: {
        event: formEvent,
        conditions: Object.keys(formConditions).length ? formConditions : undefined,
      },
      actions: formActions,
    };

    try {
      const isEdit = view === "edit" && editingId;
      const url = isEdit
        ? `/api/boards/${boardId}/automations/${editingId}`
        : `/api/boards/${boardId}/automations`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      await fetchAutomations();
      setView("list");
      resetForm();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/boards/${boardId}/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a)),
    );
  }

  async function handleDelete(id: string) {
    await fetch(`/api/boards/${boardId}/automations/${id}`, {
      method: "DELETE",
    });
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    if (view === "edit") {
      setView("list");
      resetForm();
    }
  }

  function addAction() {
    setFormActions([...formActions, { type: "set_field" }]);
  }

  function updateAction(index: number, updates: Partial<ActionConfig>) {
    setFormActions((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...updates } : a)),
    );
  }

  function removeAction(index: number) {
    setFormActions((prev) => prev.filter((_, i) => i !== index));
  }

  if (!isOpen) return null;

  const showConditionFields =
    formEvent === "card.moved" || formEvent === "card.updated";

  return (
    <div className="neo-overlay" onClick={onClose}>
      <div
        className="neo-card animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          bottom: 0,
          width: "min(480px, 90vw)",
          borderRadius: 0,
          borderLeft: "3px solid #000",
          overflowY: "auto",
          zIndex: 60,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "3px solid #000",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
            {view === "list"
              ? "Automations"
              : view === "create"
                ? "New Rule"
                : "Edit Rule"}
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            {view !== "list" && (
              <button
                className="neo-btn neo-btn-ghost"
                onClick={() => {
                  setView("list");
                  resetForm();
                }}
              >
                Back
              </button>
            )}
            <button className="neo-btn neo-btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* ── List View ───────────────────────────── */}
          {view === "list" && (
            <>
              {isOwner && (
                <button
                  className="neo-btn neo-btn-primary"
                  onClick={openCreate}
                  style={{ width: "100%", marginBottom: 16 }}
                >
                  + Create Rule
                </button>
              )}

              {loading && (
                <p style={{ textAlign: "center", color: "#666" }}>Loading...</p>
              )}

              {!loading && automations.length === 0 && (
                <p style={{ textAlign: "center", color: "#666" }}>
                  No automations yet.{" "}
                  {isOwner && "Create your first rule above."}
                </p>
              )}

              {automations.map((auto) => (
                <div
                  key={auto.id}
                  className="neo-card-sm"
                  style={{ marginBottom: 12, padding: 16 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{auto.name}</span>
                    {isOwner && (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={auto.isActive}
                          onChange={() => handleToggle(auto.id, auto.isActive)}
                        />
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: auto.isActive ? "#00A676" : "#999",
                          }}
                        >
                          {auto.isActive ? "Active" : "Off"}
                        </span>
                      </label>
                    )}
                  </div>

                  <div
                    style={{ fontSize: "0.85rem", color: "#555", marginBottom: 8 }}
                  >
                    <strong>When:</strong> {eventLabel(auto.trigger.event)}
                    {auto.actions.length > 0 && (
                      <>
                        {" "}
                        → <strong>Then:</strong>{" "}
                        {auto.actions.map((a) => actionLabel(a.type)).join(", ")}
                      </>
                    )}
                  </div>

                  {isOwner && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="neo-btn neo-btn-ghost"
                        style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                        onClick={() => openEdit(auto)}
                      >
                        Edit
                      </button>
                      <button
                        className="neo-btn neo-btn-danger"
                        style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                        onClick={() => handleDelete(auto.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {/* ── Create / Edit Form ──────────────────── */}
          {(view === "create" || view === "edit") && (
            <>
              {error && (
                <div
                  className="neo-badge"
                  style={{
                    background: "rgba(255,82,82,0.15)",
                    color: "#FF5252",
                    marginBottom: 16,
                    padding: "8px 12px",
                    display: "block",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontWeight: 700,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Rule name
                </label>
                <input
                  className="neo-input"
                  placeholder="e.g. Auto-assign on create"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Trigger */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontWeight: 700,
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  When (trigger event)
                </label>
                <select
                  className="neo-input"
                  value={formEvent}
                  onChange={(e) => {
                    setFormEvent(e.target.value);
                    setFormConditions({});
                  }}
                  style={{ width: "100%" }}
                >
                  {TRIGGER_EVENTS.map((ev) => (
                    <option key={ev.value} value={ev.value}>
                      {ev.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditions */}
              {showConditionFields && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    border: "2px solid #ddd",
                    borderRadius: 8,
                  }}
                >
                  <label
                    style={{
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Conditions (optional)
                  </label>

                  {formEvent === "card.moved" && (
                    <>
                      <div style={{ marginBottom: 8 }}>
                        <label
                          style={{
                            fontSize: "0.85rem",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          From list
                        </label>
                        <select
                          className="neo-input"
                          value={formConditions.fromList ?? ""}
                          onChange={(e) =>
                            setFormConditions((c) => ({
                              ...c,
                              fromList: e.target.value || undefined!,
                            }))
                          }
                          style={{ width: "100%" }}
                        >
                          <option value="">Any list</option>
                          {lists.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: "0.85rem",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          To list
                        </label>
                        <select
                          className="neo-input"
                          value={formConditions.toList ?? ""}
                          onChange={(e) =>
                            setFormConditions((c) => ({
                              ...c,
                              toList: e.target.value || undefined!,
                            }))
                          }
                          style={{ width: "100%" }}
                        >
                          <option value="">Any list</option>
                          {lists.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {formEvent === "card.updated" && (
                    <div>
                      <label
                        style={{
                          fontSize: "0.85rem",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Field changed
                      </label>
                      <select
                        className="neo-input"
                        value={formConditions.field ?? ""}
                        onChange={(e) =>
                          setFormConditions((c) => ({
                            ...c,
                            field: e.target.value || undefined!,
                          }))
                        }
                        style={{ width: "100%" }}
                      >
                        <option value="">Any field</option>
                        <option value="priority">Priority</option>
                        <option value="title">Title</option>
                        <option value="description">Description</option>
                        <option value="dueDate">Due date</option>
                        <option value="labels">Labels</option>
                        <option value="assigneeId">Assignee</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontWeight: 700,
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Then (actions)
                </label>

                {formActions.map((action, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      border: "2px solid #ddd",
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <select
                        className="neo-input"
                        value={action.type}
                        onChange={(e) =>
                          updateAction(idx, { type: e.target.value })
                        }
                        style={{ flex: 1 }}
                      >
                        {ACTION_TYPES.map((at) => (
                          <option key={at.value} value={at.value}>
                            {at.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="neo-btn neo-btn-danger"
                        style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                        onClick={() => removeAction(idx)}
                      >
                        X
                      </button>
                    </div>

                    {/* Type-specific fields */}
                    {action.type === "set_field" && (
                      <div style={{ display: "flex", gap: 8 }}>
                        <select
                          className="neo-input"
                          value={action.field ?? "priority"}
                          onChange={(e) =>
                            updateAction(idx, { field: e.target.value })
                          }
                          style={{ flex: 1 }}
                        >
                          {SETTABLE_FIELDS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        {(action.field === "priority" || !action.field) && (
                          <select
                            className="neo-input"
                            value={(action.value as string) ?? "NONE"}
                            onChange={(e) =>
                              updateAction(idx, { value: e.target.value })
                            }
                            style={{ flex: 1 }}
                          >
                            {PRIORITY_VALUES.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {action.type === "move_to_list" && (
                      <select
                        className="neo-input"
                        value={action.listId ?? ""}
                        onChange={(e) =>
                          updateAction(idx, { listId: e.target.value })
                        }
                        style={{ width: "100%" }}
                      >
                        <option value="">Select list...</option>
                        {lists.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.title}
                          </option>
                        ))}
                      </select>
                    )}

                    {action.type === "assign" && (
                      <select
                        className="neo-input"
                        value={action.userId ?? ""}
                        onChange={(e) =>
                          updateAction(idx, { userId: e.target.value })
                        }
                        style={{ width: "100%" }}
                      >
                        <option value="">Select member...</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {(action.type === "add_label" ||
                      action.type === "remove_label") && (
                      <input
                        className="neo-input"
                        placeholder="Label name"
                        value={action.label ?? ""}
                        onChange={(e) =>
                          updateAction(idx, { label: e.target.value })
                        }
                        style={{ width: "100%" }}
                      />
                    )}

                    {action.type === "notify" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <select
                          className="neo-input"
                          value={action.userId ?? ""}
                          onChange={(e) =>
                            updateAction(idx, { userId: e.target.value })
                          }
                        >
                          <option value="">Select user...</option>
                          <option value="assignee">Card assignee</option>
                          <option value="owner">Board owner</option>
                          {members.map((m) => (
                            <option key={m.userId} value={m.userId}>
                              {m.user.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="neo-input"
                          placeholder="Notification message"
                          value={action.message ?? ""}
                          onChange={(e) =>
                            updateAction(idx, { message: e.target.value })
                          }
                        />
                      </div>
                    )}

                    {action.type === "add_comment" && (
                      <input
                        className="neo-input"
                        placeholder="Comment message"
                        value={action.message ?? ""}
                        onChange={(e) =>
                          updateAction(idx, { message: e.target.value })
                        }
                        style={{ width: "100%" }}
                      />
                    )}
                  </div>
                ))}

                <button
                  className="neo-btn neo-btn-secondary"
                  onClick={addAction}
                  style={{ width: "100%" }}
                >
                  + Add Action
                </button>
              </div>

              {/* Save */}
              <button
                className="neo-btn neo-btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ width: "100%" }}
              >
                {saving
                  ? "Saving..."
                  : view === "edit"
                    ? "Update Rule"
                    : "Create Rule"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
