"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

// ── Types ────────────────────────────────────────────────

interface AssigneeData {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface CardData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  priority: string;
  dueDate: Date | string | null;
  labels: string[];
  completionListId: string | null;
  assignee: AssigneeData | null;
}

interface ListData {
  id: string;
  title: string;
  position: number;
  card: CardData[];
}

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

interface TableRow {
  card: CardData;
  listId: string;
  listTitle: string;
  createdAt: string | null;
}

type SortField = "title" | "list" | "priority" | "assignee" | "dueDate" | "labels" | "createdAt";
type SortDir = "asc" | "desc";

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  NONE: 0,
};

const PRIORITY_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: "Low", color: "#155DFC", bg: "rgba(21,93,252,0.15)" },
  MEDIUM: { label: "Medium", color: "#FF8A00", bg: "rgba(255,138,0,0.15)" },
  HIGH: { label: "High", color: "#FF5252", bg: "rgba(255,82,82,0.15)" },
  URGENT: { label: "Urgent", color: "#FF5252", bg: "rgba(255,82,82,0.3)" },
};

const VALID_PRIORITIES = ["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"];

// ── Icons ────────────────────────────────────────────────

function IconSort({ dir }: { dir: SortDir | null }) {
  if (!dir) {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-30">
        <polyline points="6 9 12 3 18 9" />
        <polyline points="6 15 12 21 18 15" />
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      {dir === "asc" ? (
        <polyline points="6 15 12 9 18 15" />
      ) : (
        <polyline points="6 9 12 15 18 9" />
      )}
    </svg>
  );
}

// ── Inline Editable Cell ─────────────────────────────────

function EditableTitle({
  value,
  onSave,
  disabled,
}: {
  value: string;
  onSave: (v: string) => void;
  disabled: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (disabled) {
    return <span className="text-sm font-semibold">{value}</span>;
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm font-semibold text-left w-full hover:bg-neo-yellow/20 px-1 -mx-1 py-0.5 rounded transition-colors truncate"
      >
        {value}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        const trimmed = draft.trim();
        if (trimmed && trimmed !== value) onSave(trimmed);
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="neo-input text-sm py-0.5 px-1"
      maxLength={200}
    />
  );
}

// ── Dropdown Cell ────────────────────────────────────────

function DropdownCell({
  value,
  options,
  onChange,
  disabled,
  renderValue,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled: boolean;
  renderValue?: (v: string) => React.ReactNode;
}) {
  if (disabled) {
    return <span className="text-sm">{renderValue ? renderValue(value) : options.find((o) => o.value === value)?.label ?? value}</span>;
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm bg-transparent border-2 border-transparent hover:border-neo-black/20 rounded px-1 py-0.5 cursor-pointer transition-colors font-semibold w-full"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ── Date Cell ────────────────────────────────────────────

function DateCell({
  value,
  onChange,
  disabled,
}: {
  value: string | Date | null;
  onChange: (v: string | null) => void;
  disabled: boolean;
}) {
  const dateStr = value ? new Date(value).toISOString().split("T")[0] : "";

  if (disabled) {
    return (
      <span className="text-sm text-neo-muted font-mono">
        {dateStr
          ? new Date(value!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "—"}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={dateStr}
        onChange={(e) => onChange(e.target.value || null)}
        className="text-sm bg-transparent border-2 border-transparent hover:border-neo-black/20 rounded px-1 py-0.5 cursor-pointer transition-colors font-mono"
      />
      {dateStr && (
        <button
          onClick={() => onChange(null)}
          className="text-neo-muted hover:text-neo-red text-xs font-bold"
          title="Clear date"
        >
          x
        </button>
      )}
    </div>
  );
}

// ── Labels Cell ──────────────────────────────────────────

function LabelsCell({ labels }: { labels: string[] }) {
  if (labels.length === 0) return <span className="text-sm text-neo-muted">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label}
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neo-yellow/30 border border-neo-black/20"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Assignee Cell ────────────────────────────────────────

function AssigneeCell({
  assignee,
  members,
  onChange,
  disabled,
}: {
  assignee: AssigneeData | null;
  members: MemberData[];
  onChange: (userId: string | null) => void;
  disabled: boolean;
}) {
  if (disabled) {
    return (
      <span className="text-sm">
        {assignee?.name ?? <span className="text-neo-muted">—</span>}
      </span>
    );
  }

  return (
    <select
      value={assignee?.id ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="text-sm bg-transparent border-2 border-transparent hover:border-neo-black/20 rounded px-1 py-0.5 cursor-pointer transition-colors font-semibold w-full"
    >
      <option value="">Unassigned</option>
      {members.map((m) => (
        <option key={m.user.id} value={m.user.id}>
          {m.user.name}
        </option>
      ))}
    </select>
  );
}

// ── TableView ────────────────────────────────────────────

export default function TableView({
  lists,
  members,
  canEdit,
  onCardClick,
  onCardUpdated,
}: {
  lists: ListData[];
  members: MemberData[];
  canEdit: boolean;
  onCardClick: (id: string) => void;
  onCardUpdated: (cardId: string, updates: Record<string, unknown>) => void;
}) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Flatten all cards into rows
  const rows: TableRow[] = useMemo(() => {
    const result: TableRow[] = [];
    for (const list of lists) {
      for (const card of list.card) {
        result.push({
          card,
          listId: list.id,
          listTitle: list.title,
          createdAt: null,
        });
      }
    }
    return result;
  }, [lists]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortField) return rows;

    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.card.title.localeCompare(b.card.title);
          break;
        case "list":
          cmp = a.listTitle.localeCompare(b.listTitle);
          break;
        case "priority":
          cmp = (PRIORITY_ORDER[a.card.priority] ?? 0) - (PRIORITY_ORDER[b.card.priority] ?? 0);
          break;
        case "assignee":
          cmp = (a.card.assignee?.name ?? "").localeCompare(b.card.assignee?.name ?? "");
          break;
        case "dueDate": {
          const da = a.card.dueDate ? new Date(a.card.dueDate).getTime() : Infinity;
          const db = b.card.dueDate ? new Date(b.card.dueDate).getTime() : Infinity;
          cmp = da - db;
          break;
        }
        case "labels":
          cmp = a.card.labels.join(",").localeCompare(b.card.labels.join(","));
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortField, sortDir]);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField],
  );

  // ─ Mutation handlers ───────────────────────────────────

  const patchCard = useCallback(
    async (cardId: string, body: Record<string, unknown>) => {
      onCardUpdated(cardId, body);
      try {
        const res = await fetch(`/api/cards/${cardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
      } catch {
        // Optimistic UI - the parent handles rollback
      }
    },
    [onCardUpdated],
  );

  const moveCard = useCallback(
    async (cardId: string, newListId: string) => {
      // Find the card's current data
      const row = rows.find((r) => r.card.id === cardId);
      if (!row || row.listId === newListId) return;

      onCardUpdated(cardId, { listId: newListId });

      try {
        const res = await fetch(`/api/cards/${cardId}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId: newListId, position: row.card.position }),
        });
        if (!res.ok) throw new Error();
      } catch {
        // Rollback handled by parent
      }
    },
    [rows, onCardUpdated],
  );

  // ─ Column headers ──────────────────────────────────────

  const columns: { field: SortField; label: string; width: string }[] = [
    { field: "title", label: "Title", width: "minmax(200px, 2fr)" },
    { field: "list", label: "List", width: "140px" },
    { field: "priority", label: "Priority", width: "120px" },
    { field: "assignee", label: "Assignee", width: "150px" },
    { field: "dueDate", label: "Due Date", width: "160px" },
    { field: "labels", label: "Labels", width: "minmax(120px, 1fr)" },
  ];

  const listOptions = lists.map((l) => ({ value: l.id, label: l.title }));

  const priorityOptions = VALID_PRIORITIES.map((p) => ({
    value: p,
    label: p === "NONE" ? "None" : p.charAt(0) + p.slice(1).toLowerCase(),
  }));

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="font-bold text-lg mb-1">No cards yet</p>
          <p className="text-neo-muted text-sm">Create some cards in the board view to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-x-auto">
      <div className="neo-card overflow-hidden" style={{ boxShadow: "6px 6px 0px #000" }}>
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-neo-yellow">
              {columns.map((col) => (
                <th
                  key={col.field}
                  onClick={() => toggleSort(col.field)}
                  className="text-left text-xs font-black uppercase tracking-wider px-4 py-3 border-b-2 border-r-2 border-neo-black last:border-r-0 cursor-pointer select-none hover:bg-neo-yellow/80 transition-colors"
                  style={{ width: col.width }}
                >
                  <span className="flex items-center gap-1.5">
                    {col.label}
                    <IconSort dir={sortField === col.field ? sortDir : null} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr
                key={row.card.id}
                className={`border-b-2 border-neo-black/10 last:border-b-0 hover:bg-neo-yellow/5 transition-colors ${
                  i % 2 === 1 ? "bg-neo-bg/50" : "bg-neo-white"
                }`}
              >
                {/* Title */}
                <td className="px-4 py-2.5 border-r-2 border-neo-black/10">
                  <div className="flex items-center gap-2">
                    <EditableTitle
                      value={row.card.title}
                      onSave={(title) => patchCard(row.card.id, { title })}
                      disabled={!canEdit}
                    />
                    <button
                      onClick={() => onCardClick(row.card.id)}
                      className="text-neo-muted hover:text-neo-blue text-xs font-bold flex-shrink-0"
                      title="Open card detail"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </button>
                  </div>
                </td>

                {/* List */}
                <td className="px-4 py-2.5 border-r-2 border-neo-black/10">
                  <DropdownCell
                    value={row.listId}
                    options={listOptions}
                    onChange={(v) => moveCard(row.card.id, v)}
                    disabled={!canEdit}
                  />
                </td>

                {/* Priority */}
                <td className="px-4 py-2.5 border-r-2 border-neo-black/10">
                  {canEdit ? (
                    <DropdownCell
                      value={row.card.priority}
                      options={priorityOptions}
                      onChange={(v) => patchCard(row.card.id, { priority: v })}
                      disabled={false}
                      renderValue={(v) => {
                        const s = PRIORITY_STYLE[v];
                        return s ? (
                          <span style={{ color: s.color }} className="font-bold text-sm">
                            {s.label}
                          </span>
                        ) : (
                          <span className="text-neo-muted text-sm">None</span>
                        );
                      }}
                    />
                  ) : (
                    (() => {
                      const s = PRIORITY_STYLE[row.card.priority];
                      return s ? (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded border border-current"
                          style={{ color: s.color, backgroundColor: s.bg }}
                        >
                          {s.label}
                        </span>
                      ) : (
                        <span className="text-sm text-neo-muted">None</span>
                      );
                    })()
                  )}
                </td>

                {/* Assignee */}
                <td className="px-4 py-2.5 border-r-2 border-neo-black/10">
                  <AssigneeCell
                    assignee={row.card.assignee}
                    members={members}
                    onChange={(userId) => patchCard(row.card.id, { assigneeId: userId })}
                    disabled={!canEdit}
                  />
                </td>

                {/* Due Date */}
                <td className="px-4 py-2.5 border-r-2 border-neo-black/10">
                  <DateCell
                    value={row.card.dueDate}
                    onChange={(v) => patchCard(row.card.id, { dueDate: v })}
                    disabled={!canEdit}
                  />
                </td>

                {/* Labels */}
                <td className="px-4 py-2.5">
                  <LabelsCell labels={row.card.labels} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="px-4 py-2 bg-neo-bg/50 border-t-2 border-neo-black/10 text-xs text-neo-muted font-mono">
          {sortedRows.length} card{sortedRows.length !== 1 ? "s" : ""} across {lists.length} list{lists.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
