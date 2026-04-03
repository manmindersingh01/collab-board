"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// ── Types ────────────────────────────────────────────────

interface CardData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  priority: string;
  dueDate: Date | string | null;
  labels: string[];
  completionListId: string | null;
  assignee: { id: string; name: string; avatarUrl: string | null } | null;
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

export interface FilterState {
  assigneeIds: string[];
  priorities: string[];
  labels: string[];
  dueDateFilter: string | null;
}

interface BoardFiltersProps {
  cards: CardData[];
  members: MemberData[];
  onFilterChange: (filters: FilterState) => void;
}

// ── Constants ────────────────────────────────────────────

const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW", "NONE"] as const;

const PRIORITY_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  URGENT: { label: "Urgent", color: "#FF5252", bg: "rgba(255,82,82,0.15)" },
  HIGH: { label: "High", color: "#FF8A00", bg: "rgba(255,138,0,0.15)" },
  MEDIUM: { label: "Medium", color: "#155DFC", bg: "rgba(21,93,252,0.15)" },
  LOW: { label: "Low", color: "#00D4AA", bg: "rgba(0,212,170,0.15)" },
  NONE: { label: "None", color: "#7a7a7a", bg: "rgba(122,122,122,0.1)" },
};

const DUE_DATE_OPTIONS = [
  { value: "overdue", label: "Overdue" },
  { value: "this-week", label: "Due this week" },
  { value: "this-month", label: "Due this month" },
  { value: "no-date", label: "No date" },
] as const;

// ── Icons ────────────────────────────────────────────────

function IconFilter() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function IconX({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function parseFiltersFromParams(params: URLSearchParams): FilterState {
  const assigneeIds = params.get("assignee")?.split(",").filter(Boolean) ?? [];
  const priorities = params.get("priority")?.split(",").filter(Boolean) ?? [];
  const labels = params.get("labels")?.split(",").filter(Boolean) ?? [];
  const dueDateFilter = params.get("due") || null;
  return { assigneeIds, priorities, labels, dueDateFilter };
}

function filtersToParams(filters: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.assigneeIds.length) p.set("assignee", filters.assigneeIds.join(","));
  if (filters.priorities.length) p.set("priority", filters.priorities.join(","));
  if (filters.labels.length) p.set("labels", filters.labels.join(","));
  if (filters.dueDateFilter) p.set("due", filters.dueDateFilter);
  return p;
}

// ── Dropdown Wrapper ─────────────────────────────────────

function FilterDropdown({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className={`neo-btn text-xs py-1.5 px-3 shadow-neo-sm flex items-center gap-1.5 ${
          count > 0 ? "neo-btn-primary" : "neo-btn-ghost"
        }`}
      >
        {label}
        {count > 0 && (
          <span className="w-4 h-4 rounded-full bg-neo-black text-neo-white text-[10px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
        <IconChevron open={isOpen} />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-30 neo-card p-3 min-w-[200px] animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Board Filters Component ─────────────────────────────

export default function BoardFilters({ cards, members, onFilterChange }: BoardFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<FilterState>(() =>
    parseFiltersFromParams(searchParams),
  );

  // Collect all unique labels from cards
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    for (const card of cards) {
      for (const label of card.labels) set.add(label);
    }
    return Array.from(set).sort();
  }, [cards]);

  // Sync filter changes to URL and callback
  const updateFilters = useCallback(
    (next: FilterState) => {
      setFilters(next);
      onFilterChange(next);

      // Update URL params without full navigation
      const params = filtersToParams(next);
      // Preserve non-filter params (like ?card=...)
      const existing = new URLSearchParams(searchParams.toString());
      existing.delete("assignee");
      existing.delete("priority");
      existing.delete("labels");
      existing.delete("due");
      params.forEach((v, k) => existing.set(k, v));
      const qs = existing.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [onFilterChange, router, pathname, searchParams],
  );

  // Notify parent on mount with initial filter state
  useEffect(() => {
    onFilterChange(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle helpers
  function toggleAssignee(id: string) {
    const next = filters.assigneeIds.includes(id)
      ? filters.assigneeIds.filter((a) => a !== id)
      : [...filters.assigneeIds, id];
    updateFilters({ ...filters, assigneeIds: next });
  }

  function togglePriority(p: string) {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p];
    updateFilters({ ...filters, priorities: next });
  }

  function toggleLabel(l: string) {
    const next = filters.labels.includes(l)
      ? filters.labels.filter((x) => x !== l)
      : [...filters.labels, l];
    updateFilters({ ...filters, labels: next });
  }

  function setDueDate(value: string | null) {
    updateFilters({
      ...filters,
      dueDateFilter: filters.dueDateFilter === value ? null : value,
    });
  }

  function clearAll() {
    updateFilters({ assigneeIds: [], priorities: [], labels: [], dueDateFilter: null });
  }

  const activeCount =
    filters.assigneeIds.length +
    filters.priorities.length +
    filters.labels.length +
    (filters.dueDateFilter ? 1 : 0);

  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      <span className="flex items-center gap-1.5 text-xs font-bold text-neo-muted uppercase tracking-wide mr-1">
        <IconFilter />
        Filters
        {activeCount > 0 && (
          <span className="neo-badge bg-neo-yellow text-neo-black text-[10px] py-0 px-1.5">
            {activeCount}
          </span>
        )}
      </span>

      {/* Assignee filter */}
      <FilterDropdown label="Assignee" count={filters.assigneeIds.length}>
        <div className="space-y-1">
          {members.map((m) => (
            <button
              key={m.userId}
              onClick={() => toggleAssignee(m.user.id)}
              className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filters.assigneeIds.includes(m.user.id)
                  ? "bg-neo-yellow/30 font-bold"
                  : "hover:bg-gray-100"
              }`}
            >
              {m.user.avatarUrl ? (
                <img
                  src={m.user.avatarUrl}
                  alt={m.user.name}
                  className="w-5 h-5 rounded-full border border-neo-black object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full border border-neo-black bg-neo-yellow/30 flex items-center justify-center text-[9px] font-bold">
                  {initials(m.user.name)}
                </div>
              )}
              {m.user.name}
              {filters.assigneeIds.includes(m.user.id) && (
                <span className="ml-auto text-neo-blue font-bold">&#10003;</span>
              )}
            </button>
          ))}
          {members.length === 0 && (
            <p className="text-xs text-neo-muted px-2 py-1">No members</p>
          )}
        </div>
      </FilterDropdown>

      {/* Priority filter */}
      <FilterDropdown label="Priority" count={filters.priorities.length}>
        <div className="space-y-1">
          {PRIORITIES.map((p) => {
            const style = PRIORITY_STYLE[p];
            return (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filters.priorities.includes(p)
                    ? "font-bold"
                    : "hover:bg-gray-100"
                }`}
                style={filters.priorities.includes(p) ? { backgroundColor: style.bg } : undefined}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-neo-black/20"
                  style={{ backgroundColor: style.color }}
                />
                {style.label}
                {filters.priorities.includes(p) && (
                  <span className="ml-auto font-bold" style={{ color: style.color }}>
                    &#10003;
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </FilterDropdown>

      {/* Labels filter */}
      {allLabels.length > 0 && (
        <FilterDropdown label="Labels" count={filters.labels.length}>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {allLabels.map((label) => (
              <button
                key={label}
                onClick={() => toggleLabel(label)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filters.labels.includes(label)
                    ? "bg-neo-yellow/30 font-bold"
                    : "hover:bg-gray-100"
                }`}
              >
                <span className="neo-badge text-[10px] py-0 px-1.5 bg-gray-100">
                  {label}
                </span>
                {filters.labels.includes(label) && (
                  <span className="ml-auto text-neo-blue font-bold">&#10003;</span>
                )}
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

      {/* Due date filter */}
      <FilterDropdown label="Due Date" count={filters.dueDateFilter ? 1 : 0}>
        <div className="space-y-1">
          {DUE_DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDueDate(opt.value)}
              className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filters.dueDateFilter === opt.value
                  ? "bg-neo-yellow/30 font-bold"
                  : "hover:bg-gray-100"
              }`}
            >
              {opt.label}
              {filters.dueDateFilter === opt.value && (
                <span className="ml-auto text-neo-blue font-bold">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      </FilterDropdown>

      {/* Clear all */}
      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs font-bold text-neo-red hover:underline underline-offset-2 ml-1"
        >
          <IconX size={10} />
          Clear all
        </button>
      )}
    </div>
  );
}

// ── Filter matching utility ──────────────────────────────
// Export this so board-view can use it to dim/hide cards.

export function cardMatchesFilters(card: CardData, filters: FilterState): boolean {
  // Assignee filter
  if (filters.assigneeIds.length > 0) {
    if (!card.assignee || !filters.assigneeIds.includes(card.assignee.id)) {
      return false;
    }
  }

  // Priority filter
  if (filters.priorities.length > 0) {
    if (!filters.priorities.includes(card.priority)) {
      return false;
    }
  }

  // Labels filter
  if (filters.labels.length > 0) {
    if (!filters.labels.some((l) => card.labels.includes(l))) {
      return false;
    }
  }

  // Due date filter
  if (filters.dueDateFilter) {
    const now = new Date();
    const dueDate = card.dueDate ? new Date(card.dueDate) : null;

    switch (filters.dueDateFilter) {
      case "overdue":
        if (!dueDate || dueDate >= now) return false;
        break;
      case "this-week": {
        if (!dueDate) return false;
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);
        if (dueDate > endOfWeek) return false;
        break;
      }
      case "this-month": {
        if (!dueDate) return false;
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        if (dueDate > endOfMonth) return false;
        break;
      }
      case "no-date":
        if (dueDate) return false;
        break;
    }
  }

  return true;
}
