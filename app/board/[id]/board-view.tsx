"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import CardDetail from "./card-detail";
import BoardMembersModal from "./board-members";
import { useBoardEvents } from "./use-board-events";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";
import ShortcutsModal from "./shortcuts-modal";
import BoardFilters, { cardMatchesFilters, type FilterState } from "./board-filters";
import ViewSwitcher, { type ViewMode } from "./views/view-switcher";
import TableView from "./views/table-view";
import CalendarView from "./views/calendar-view";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface BoardProps {
  id: string;
  name: string;
  description: string | null;
  list: ListData[];
  members: MemberData[];
}

// ── Constants ────────────────────────────────────────────

const LIST_ACCENTS = ["#CCFF00", "#155DFC", "#00D4AA", "#FF8A00", "#FF5252"];

const PRIORITY_STYLE: Record<
  string,
  { label: string; color: string; bg: string } | null
> = {
  NONE: null,
  LOW: { label: "Low", color: "#155DFC", bg: "rgba(21,93,252,0.15)" },
  MEDIUM: { label: "Med", color: "#FF8A00", bg: "rgba(255,138,0,0.15)" },
  HIGH: { label: "High", color: "#FF5252", bg: "rgba(255,82,82,0.15)" },
  URGENT: { label: "Urgent", color: "#FF5252", bg: "rgba(255,82,82,0.3)" },
};

// ── Helpers ──────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Fractional indexing: compute new position from neighbors. */
function calcPosition(
  above: number | null,
  below: number | null,
): number {
  if (above != null && below != null) return (above + below) / 2;
  if (below != null) return below / 2;
  if (above != null) return above + 1;
  return 1;
}

/** Deep-clone lists array for snapshot/rollback. */
function cloneLists(lists: ListData[]): ListData[] {
  return lists.map((l) => ({ ...l, card: l.card.map((c) => ({ ...c })) }));
}

// ── Icons ────────────────────────────────────────────────

function IconArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ── CardItem (presentational) ────────────────────────────

function CardItemContent({ card }: { card: CardData }) {
  const pri = PRIORITY_STYLE[card.priority] ?? null;

  return (
    <>
      {(pri || card.labels.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {pri && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-current"
              style={{ color: pri.color, backgroundColor: pri.bg }}
            >
              {pri.label}
            </span>
          )}
          {card.labels.map((label) => (
            <span
              key={label}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neo-yellow/30 border border-neo-black/20"
            >
              {label}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm font-semibold leading-snug">
        {card.title}
      </p>
      {(card.dueDate || card.assignee) && (
        <div className="flex items-center justify-between mt-2.5">
          {card.dueDate && (
            <span className="text-[11px] text-neo-muted font-mono">
              {new Date(card.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {card.assignee && (
            <div className="ml-auto">
              {card.assignee.avatarUrl ? (
                <img
                  src={card.assignee.avatarUrl}
                  alt={card.assignee.name}
                  title={card.assignee.name}
                  className="w-5 h-5 rounded-full border border-neo-black object-cover"
                />
              ) : (
                <div
                  className="w-5 h-5 rounded-full border border-neo-black bg-neo-blue/20 flex items-center justify-center text-[8px] font-bold"
                  title={card.assignee.name}
                >
                  {initials(card.assignee.name)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ── SortableCard (draggable wrapper) ─────────────────────

function SortableCard({
  card,
  canEdit,
  showComplete,
  completionLabel,
  dimmed,
  onCardClick,
  onMarkDone,
}: {
  card: CardData;
  canEdit: boolean;
  showComplete: boolean;
  completionLabel: string;
  dimmed: boolean;
  onCardClick: (id: string) => void;
  onMarkDone: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : dimmed ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      data-card-id={card.id}
      style={style}
      {...attributes}
      {...(canEdit ? listeners : {})}
      onClick={() => {
        if (!isDragging) onCardClick(card.id);
      }}
      className={`neo-card-sm p-3 relative group ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"} ${dimmed ? "pointer-events-auto" : ""}`}
    >
      <CardItemContent card={card} />
      {showComplete && (
        <button
          title={completionLabel}
          onClick={(e) => {
            e.stopPropagation();
            onMarkDone(card.id);
          }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-neo-teal bg-neo-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-neo-teal hover:text-neo-white transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── AddCardInput ─────────────────────────────────────────

function AddCardInput({
  listId,
  onCardAdded,
}: {
  listId: string;
  onCardAdded: (card: CardData) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed, listId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create card");
      }

      const card = await res.json();
      setTitle("");
      onCardAdded(card);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setTitle("");
      setError(null);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neo-muted font-semibold hover:text-neo-black hover:bg-neo-yellow/20 rounded-lg transition-colors"
      >
        <IconPlus />
        Add a card
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={inputRef}
        value={title}
        onChange={(e) => { setTitle(e.target.value); setError(null); }}
        onKeyDown={handleKeyDown}
        placeholder="Enter a title..."
        className="neo-input resize-none text-sm"
        rows={2}
        disabled={isSubmitting}
        maxLength={200}
      />
      {error && <p className="text-xs text-neo-red font-semibold">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim()}
          className="neo-btn neo-btn-primary text-xs py-1.5 px-3"
          style={{ boxShadow: "2px 2px 0 #000" }}
        >
          {isSubmitting ? "Adding..." : "Add Card"}
        </button>
        <button
          onClick={() => { setIsOpen(false); setTitle(""); setError(null); }}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          aria-label="Cancel"
        >
          <IconX />
        </button>
      </div>
    </div>
  );
}

// ── ListColumn (droppable + sortable context) ────────────

function ListColumn({
  list,
  index,
  canEdit,
  isDoneList,
  currentUserId,
  allLists,
  filterState,
  hasActiveFilters,
  onCardAdded,
  onCardClick,
  onMarkDone,
}: {
  list: ListData;
  index: number;
  canEdit: boolean;
  isDoneList: boolean;
  currentUserId: string;
  allLists: ListData[];
  filterState: FilterState;
  hasActiveFilters: boolean;
  onCardAdded: (listId: string, card: CardData) => void;
  onCardClick: (id: string) => void;
  onMarkDone: (id: string) => void;
}) {
  const accent = LIST_ACCENTS[index % LIST_ACCENTS.length];
  const cardIds = useMemo(() => list.card.map((c) => c.id), [list.card]);

  // Make the entire list a droppable so cards can be dropped into empty lists
  const { setNodeRef: setDropRef } = useDroppable({ id: `list-${list.id}` });

  return (
    <div className="flex-shrink-0 w-[300px] flex flex-col max-h-full">
      <div className="neo-card overflow-hidden flex flex-col max-h-full">
        {/* List header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b-2 border-neo-black flex-shrink-0"
          style={{ backgroundColor: accent }}
        >
          <h3 className="font-black text-sm truncate">{list.title}</h3>
          <span className="text-xs font-mono font-bold bg-neo-white/60 px-1.5 py-0.5 rounded border border-neo-black/30">
            {list.card.length}
          </span>
        </div>

        {/* Cards area — sortable + droppable */}
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div
            ref={setDropRef}
            className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[80px]"
          >
            {list.card.length === 0 && (
              <p className="text-xs text-neo-muted text-center py-6 select-none">
                No cards yet
              </p>
            )}
            {list.card.map((card) => {
              const targetName = card.completionListId
                ? allLists.find((l) => l.id === card.completionListId)?.title
                : null;
              return (
                <SortableCard
                  key={card.id}
                  card={card}
                  canEdit={canEdit}
                  showComplete={!isDoneList && (canEdit || card.assignee?.id === currentUserId)}
                  completionLabel={targetName ? `Complete → ${targetName}` : "Mark as done"}
                  dimmed={hasActiveFilters && !cardMatchesFilters(card, filterState)}
                  onCardClick={onCardClick}
                  onMarkDone={onMarkDone}
                />
              );
            })}
          </div>
        </SortableContext>

        {/* Add card footer */}
        {canEdit && (
          <div className="px-3 py-2.5 border-t-2 border-neo-black/15 flex-shrink-0">
            <AddCardInput
              listId={list.id}
              onCardAdded={(card) => onCardAdded(list.id, card)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── AddListColumn ────────────────────────────────────────

function AddListColumn({
  boardId,
  onListAdded,
}: {
  boardId: string;
  onListAdded: (list: ListData) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create list");
      }

      const list = await res.json();
      setTitle("");
      setIsOpen(false);
      onListAdded(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="flex-shrink-0 w-[300px]">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full neo-card border-dashed flex items-center justify-center gap-2 px-4 py-6 text-sm font-bold text-neo-muted hover:text-neo-black hover:bg-neo-yellow/10 hover:border-solid transition-all cursor-pointer"
        >
          <IconPlus />
          Add List
        </button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-[300px]">
      <div className="neo-card p-4 space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") { setIsOpen(false); setTitle(""); setError(null); }
          }}
          placeholder="Enter list title..."
          className="neo-input text-sm"
          maxLength={50}
          disabled={isSubmitting}
        />
        {error && <p className="text-xs text-neo-red font-semibold">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="neo-btn neo-btn-primary text-xs py-1.5 px-3 flex-1"
            style={{ boxShadow: "2px 2px 0 #000" }}
          >
            {isSubmitting ? "Adding..." : "Add List"}
          </button>
          <button
            onClick={() => { setIsOpen(false); setTitle(""); setError(null); }}
            className="neo-btn neo-btn-ghost text-xs py-1.5 px-3"
            style={{ boxShadow: "2px 2px 0 #000" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast notification ───────────────────────────────────

function Toast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="neo-card px-5 py-3 flex items-center gap-3 bg-neo-red text-neo-white border-neo-black">
        <span className="text-sm font-semibold">{message}</span>
        <button onClick={onDismiss} className="opacity-70 hover:opacity-100">
          <IconX />
        </button>
      </div>
    </div>
  );
}

// ── BoardView (default export) ───────────────────────────

export default function BoardView({
  board,
  userRole,
  currentUserId,
}: {
  board: BoardProps;
  userRole: string;
  currentUserId: string;
}) {
  const canEdit = userRole !== "viewer";
  const searchParams = useSearchParams();
  const router = useRouter();

  // ─ Local state (owns the data for optimistic DnD) ─────
  const [lists, setLists] = useState<ListData[]>(() => board.list);
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [boardMembers, setBoardMembers] = useState<MemberData[]>(board.members);

  const [showFilters, setShowFilters] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({
    assigneeIds: [],
    priorities: [],
    labels: [],
    dueDateFilter: null,
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const activeView = (searchParams.get("view") as ViewMode) || "board";

  // Explicit sensor: pointer must move 8px before a drag starts.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Snapshot for rollback on API failure
  const snapshotRef = useRef<ListData[] | null>(null);

  // Sync when server re-fetches
  useEffect(() => {
    setLists(board.list);
  }, [board.list]);

  // ─ Real-time board events (SSE via Redis pub/sub) ─────
  useBoardEvents(board.id, currentUserId, useCallback((event) => {
    const p = event.payload as Record<string, any>;

    if (event.type === "card.created" && p?.card) {
      const card = p.card as CardData & { listId?: string };
      const targetListId = card.listId ?? p.listId;
      setLists((prev) =>
        prev.map((l) =>
          l.id === targetListId
            ? { ...l, card: [...l.card.filter((c) => c.id !== card.id), card].sort((a, b) => a.position - b.position) }
            : l,
        ),
      );
    } else if (event.type === "card.moved" && p?.cardId) {
      setLists((prev) => {
        let movedCard: CardData | undefined;
        const without = prev.map((l) => {
          const c = l.card.find((c) => c.id === p.cardId);
          if (c) movedCard = { ...c, position: p.position as number };
          return { ...l, card: l.card.filter((c) => c.id !== p.cardId) };
        });
        if (!movedCard) return prev;
        return without.map((l) =>
          l.id === p.toListId
            ? { ...l, card: [...l.card, movedCard!].sort((a, b) => a.position - b.position) }
            : l,
        );
      });
    } else if (event.type === "card.updated" && p?.cardId) {
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          card: l.card.map((c) =>
            c.id === p.cardId ? { ...c, ...p.updates } : c,
          ),
        })),
      );
    } else if (event.type === "list.created" && p?.list) {
      const list = p.list as ListData;
      setLists((prev) =>
        prev.some((l) => l.id === list.id)
          ? prev
          : [...prev, { ...list, card: list.card ?? [] }],
      );
    }
  }, []));

  // ─ Keyboard shortcuts ─────────────────────────────────
  useKeyboardShortcuts({
    onAddCard: () => {
      const firstInput = document.querySelector<HTMLButtonElement>("[data-add-card]");
      firstInput?.click();
    },
    onToggleFilter: () => setShowFilters((p) => !p),
    onFocusSearch: () => setShowFilters(true),
    onEscape: () => {
      if (selectedCardId) setSelectedCardId(null);
      else if (showMembers) setShowMembers(false);
      else if (showFilters) setShowFilters(false);
      else if (showShortcuts) setShowShortcuts(false);
    },
    onShowShortcuts: () => setShowShortcuts((p) => !p),
  });

  // ─ Auto-scroll to card from URL param (?card=xxx) ─────
  useEffect(() => {
    const cardId = searchParams.get("card");
    if (!cardId) return;

    // Open the card detail panel
    setSelectedCardId(cardId);

    // Scroll to the card element after a short delay (let DOM settle)
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-card-id="${cardId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        // Flash highlight
        el.classList.add("ring-4", "ring-neo-yellow");
        setTimeout(() => el.classList.remove("ring-4", "ring-neo-yellow"), 2000);
      }
    }, 300);

    // Clean the URL param so refresh doesn't re-trigger
    router.replace(`/board/${board.id}`, { scroll: false });

    return () => clearTimeout(timer);
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─ Helpers to find list/card by id ────────────────────
  function findListByCardId(cardId: UniqueIdentifier) {
    return lists.find((l) => l.card.some((c) => c.id === cardId));
  }

  function findListByDroppableId(droppableId: UniqueIdentifier) {
    // Droppable ids for lists are prefixed with "list-"
    const id = String(droppableId);
    if (id.startsWith("list-")) {
      return lists.find((l) => l.id === id.slice(5));
    }
    // Otherwise it might be a card id — find its parent list
    return findListByCardId(droppableId);
  }

  // ─ DnD handlers ───────────────────────────────────────

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!canEdit) return; // Viewers cannot drag
      const { active } = event;
      const list = findListByCardId(active.id);
      const card = list?.card.find((c) => c.id === active.id);
      setActiveCard(card ?? null);
      // Save snapshot before any mutations
      snapshotRef.current = cloneLists(lists);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists, canEdit],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeList = findListByCardId(active.id);
      const overList = findListByDroppableId(over.id);

      if (!activeList || !overList || activeList.id === overList.id) return;

      // Move card between lists (visual only — no API call)
      setLists((prev) =>
        prev.map((l) => {
          if (l.id === activeList.id) {
            return { ...l, card: l.card.filter((c) => c.id !== active.id) };
          }
          if (l.id === overList.id) {
            // Card already moved here by a previous onDragOver
            if (l.card.some((c) => c.id === active.id)) return l;

            const movedCard = activeList.card.find(
              (c) => c.id === active.id,
            );
            if (!movedCard) return l;

            // Insert near the "over" card or at end
            const overIndex = l.card.findIndex((c) => c.id === over.id);
            const newCards = [...l.card];
            if (overIndex >= 0) {
              newCards.splice(overIndex, 0, movedCard);
            } else {
              newCards.push(movedCard);
            }
            return { ...l, card: newCards };
          }
          return l;
        }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);

      if (!over) {
        // Dropped outside — revert
        if (snapshotRef.current) setLists(snapshotRef.current);
        snapshotRef.current = null;
        return;
      }

      const cardId = String(active.id);
      const targetList = findListByCardId(active.id) ?? findListByDroppableId(over.id);

      if (!targetList) {
        if (snapshotRef.current) setLists(snapshotRef.current);
        snapshotRef.current = null;
        return;
      }

      // Determine the final index of the card within the target list
      const currentCards = targetList.card;
      let dropIndex = currentCards.findIndex((c) => c.id === cardId);
      if (dropIndex < 0) dropIndex = currentCards.length;

      // If dropped on another card, figure out index relative to it
      if (String(over.id) !== cardId && !String(over.id).startsWith("list-")) {
        const overIdx = currentCards.findIndex((c) => c.id === over.id);
        if (overIdx >= 0) {
          // Reorder: move the active card to the over card's position
          const withoutActive = currentCards.filter((c) => c.id !== cardId);
          const overIdxInFiltered = withoutActive.findIndex(
            (c) => c.id === over.id,
          );
          const insertAt =
            overIdxInFiltered >= 0 ? overIdxInFiltered : withoutActive.length;
          const movedCard = currentCards.find((c) => c.id === cardId);
          if (movedCard) {
            const reordered = [...withoutActive];
            reordered.splice(insertAt, 0, movedCard);
            setLists((prev) =>
              prev.map((l) =>
                l.id === targetList.id ? { ...l, card: reordered } : l,
              ),
            );
            dropIndex = insertAt;
          }
        }
      }

      // Calculate fractional position from neighbors
      const finalCards =
        lists.find((l) => l.id === targetList.id)?.card ?? currentCards;

      // Re-read after the setState above might not reflect yet, so use
      // the reordered array we just computed
      const cardsAfterReorder = (() => {
        const withoutActive = targetList.card.filter(
          (c) => c.id !== cardId,
        );
        const card = targetList.card.find((c) => c.id === cardId);
        if (!card) return finalCards;
        const arr = [...withoutActive];
        arr.splice(
          Math.min(dropIndex, arr.length),
          0,
          card,
        );
        return arr;
      })();

      const idx = cardsAfterReorder.findIndex((c) => c.id === cardId);
      const above = idx > 0 ? cardsAfterReorder[idx - 1].position : null;
      const below =
        idx < cardsAfterReorder.length - 1
          ? cardsAfterReorder[idx + 1].position
          : null;
      const newPosition = calcPosition(above, below);

      // Persist to API (background — don't block the UI)
      try {
        const res = await fetch(`/api/cards/${cardId}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listId: targetList.id,
            position: newPosition,
          }),
        });

        if (!res.ok) throw new Error("Move failed");

        // Update position in local state so future calcs are correct
        setLists((prev) =>
          prev.map((l) => ({
            ...l,
            card: l.card.map((c) =>
              c.id === cardId ? { ...c, position: newPosition, listId: targetList.id as string } : c,
            ),
          })),
        );
      } catch {
        // Rollback
        if (snapshotRef.current) {
          setLists(snapshotRef.current);
          setToast("Move failed — reverted");
        }
      } finally {
        snapshotRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lists],
  );

  // ─ Card detail update handler ──────────────────────────
  const handleCardUpdated = useCallback(
    (cardId: string, updates: Record<string, unknown>) => {
      setLists((prev) =>
        prev.map((l) => ({
          ...l,
          card: l.card.map((c) =>
            c.id === cardId ? { ...c, ...updates } : c,
          ),
        })),
      );
    },
    [],
  );

  // ─ Add card handler (optimistic) ──────────────────────

  const handleCardAdded = useCallback(
    (listId: string, card: CardData) => {
      setLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, card: [...l.card, card] } : l,
        ),
      );
    },
    [],
  );

  // ─ Mark as done handler ───────────────────────────────
  const doneListId = useMemo(() => {
    const done = lists.find((l) => l.title.toLowerCase() === "done");
    return done?.id ?? lists[lists.length - 1]?.id;
  }, [lists]);

  const handleMarkDone = useCallback(
    async (cardId: string) => {
      // Optimistic: move card to done list
      const snapshot = cloneLists(lists);
      setLists((prev) => {
        let movedCard: CardData | undefined;
        const without = prev.map((l) => {
          const card = l.card.find((c) => c.id === cardId);
          if (card) movedCard = card;
          return { ...l, card: l.card.filter((c) => c.id !== cardId) };
        });
        if (!movedCard || !doneListId) return prev;
        return without.map((l) =>
          l.id === doneListId ? { ...l, card: [...l.card, movedCard!] } : l,
        );
      });

      try {
        const res = await fetch(`/api/cards/${cardId}/complete`, {
          method: "POST",
        });
        if (!res.ok) throw new Error();
      } catch {
        setLists(snapshot);
        setToast("Failed to mark as done");
      }
    },
    [lists, doneListId],
  );

  // ─ Add list handler ────────────────────────────────────
  const handleListAdded = useCallback(
    (list: ListData) => {
      setLists((prev) => [...prev, list]);
    },
    [],
  );

  // ─ Render ─────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Board header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b-2 border-neo-black/10 flex-shrink-0 bg-neo-bg">
        <Link
          href="/dashboard"
          className="neo-btn neo-btn-ghost py-1.5 px-3 text-xs"
        >
          <IconArrowLeft />
          Back
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="font-black text-xl truncate">{board.name}</h1>
          {board.description && (
            <p className="text-neo-muted text-sm truncate">
              {board.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ViewSwitcher />
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`neo-badge text-xs cursor-pointer hover:shadow-neo-sm transition-shadow ${showFilters ? "bg-neo-blue/20" : ""}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
          </button>
          <button
            onClick={() => setShowMembers(true)}
            className="neo-badge bg-neo-yellow/30 text-xs cursor-pointer hover:shadow-neo-sm transition-shadow"
          >
            <IconUsers />
            {boardMembers.length}
          </button>
          <span className="neo-badge bg-neo-blue/15 text-xs capitalize">
            {userRole === "editer" ? "editor" : userRole}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <BoardFilters
          cards={lists.flatMap((l) => l.card)}
          members={boardMembers}
          onFilterChange={setFilterState}
        />
      )}

      {/* View content */}
      {activeView === "table" ? (
        <div className="flex-1 overflow-auto p-6">
          <TableView
            lists={lists}
            members={boardMembers}
            canEdit={canEdit}
            onCardClick={(id) => setSelectedCardId(id)}
            onCardUpdated={handleCardUpdated}
          />
        </div>
      ) : activeView === "calendar" ? (
        <div className="flex-1 overflow-auto p-6">
          <CalendarView
            lists={lists}
            onCardClick={(id) => setSelectedCardId(id)}
          />
        </div>
      ) : (
        /* Kanban board — DnD context wraps lists */
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-5 p-6 h-full items-start min-w-min">
              {lists.map((list, i) => (
                <ListColumn
                  key={list.id}
                  list={list}
                  index={i}
                  canEdit={canEdit}
                  isDoneList={list.id === doneListId}
                  currentUserId={currentUserId}
                  allLists={lists}
                  filterState={filterState}
                  hasActiveFilters={showFilters && (filterState.assigneeIds.length > 0 || filterState.priorities.length > 0 || filterState.labels.length > 0 || filterState.dueDateFilter !== null)}
                  onCardAdded={handleCardAdded}
                  onCardClick={(id) => setSelectedCardId(id)}
                  onMarkDone={handleMarkDone}
                />
              ))}

              {/* Add list column (owner only) */}
              {userRole === "owner" && <AddListColumn boardId={board.id} onListAdded={handleListAdded} />}

              {lists.length === 0 && userRole !== "owner" && (
                <div className="flex items-center justify-center w-full py-20">
                  <div className="text-center">
                    <p className="font-bold text-lg mb-1">No lists yet</p>
                    <p className="text-neo-muted text-sm">This board has no lists</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay dropAnimation={null}>
            {activeCard ? (
              <div className="neo-card-sm p-3 w-[276px] rotate-[2deg] opacity-90 shadow-neo">
                <CardItemContent card={activeCard} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Error toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {/* Card detail side panel */}
      {selectedCardId && (
        <CardDetail
          cardId={selectedCardId}
          boardId={board.id}
          members={boardMembers}
          boardLists={lists.map((l) => ({ id: l.id, title: l.title }))}
          currentUserId={currentUserId}
          canEdit={canEdit}
          onClose={() => setSelectedCardId(null)}
          onCardUpdated={handleCardUpdated}
          onMarkDone={handleMarkDone}
        />
      )}

      {/* Shortcuts cheat sheet */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Board members modal */}
      {showMembers && (
        <BoardMembersModal
          boardId={board.id}
          initialMembers={boardMembers}
          userRole={userRole}
          currentUserId={currentUserId}
          onClose={() => setShowMembers(false)}
          onMembersChanged={setBoardMembers}
        />
      )}
    </div>
  );
}
