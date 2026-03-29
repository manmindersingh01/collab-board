"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────

interface Board {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  _count: {
    members: number;
  };
}

// ── Helpers ──────────────────────────────────────────────

const CARD_ACCENTS = ["#CCFF00", "#155DFC", "#FF5252", "#00D4AA", "#FF8A00"];

function accentFor(i: number) {
  return CARD_ACCENTS[i % CARD_ACCENTS.length];
}

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

// ── Icons (inline SVGs) ─────────────────────────────────

function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconX() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ── Board Card ───────────────────────────────────────────

function BoardCard({ board, index }: { board: Board; index: number }) {
  const accent = accentFor(index);

  return (
    <Link
      href={`/board/${board.id}`}
      className="neo-card neo-card-interactive overflow-hidden cursor-pointer group block"
    >
      <div className="h-2 w-full" style={{ backgroundColor: accent }} />

      <div className="p-5">
        <h3 className="font-black text-lg truncate mb-1 group-hover:underline decoration-2 underline-offset-4">
          {board.name}
        </h3>

        <p className="text-neo-muted text-sm line-clamp-2 min-h-[2.5rem] mb-4">
          {board.description || "No description"}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {board.owner.avatarUrl ? (
              <img
                src={board.owner.avatarUrl}
                alt={board.owner.name}
                className="w-6 h-6 rounded-full border-2 border-neo-black object-cover"
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full border-2 border-neo-black flex items-center justify-center text-[10px] font-bold text-neo-black"
                style={{ backgroundColor: accent }}
              >
                {initials(board.owner.name)}
              </div>
            )}
            <span className="text-xs font-semibold truncate max-w-[100px]">
              {board.owner.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="neo-badge bg-neo-yellow/30">
              <IconUsers />
              {board._count.members}
            </span>
            <span className="text-xs text-neo-muted font-mono">
              {relativeTime(board.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Skeleton ─────────────────────────────────────────────

function BoardSkeleton() {
  return (
    <div className="neo-card overflow-hidden">
      <div className="h-2 w-full bg-gray-200 animate-pulse-neo" />
      <div className="p-5">
        <div className="h-5 w-3/4 bg-gray-200 rounded mb-3 animate-pulse-neo" />
        <div className="h-4 w-full bg-gray-100 rounded mb-1 animate-pulse-neo" />
        <div className="h-4 w-2/3 bg-gray-100 rounded mb-4 animate-pulse-neo" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse-neo" />
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse-neo" />
          </div>
          <div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse-neo" />
        </div>
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────

function EmptyState({
  onCreate,
  isSearch,
}: {
  onCreate: () => void;
  isSearch: boolean;
}) {
  if (isSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-neo-bg border-2 border-neo-black rounded-xl shadow-neo flex items-center justify-center text-3xl mb-5">
          ?
        </div>
        <h3 className="font-bold text-lg mb-1">No matching boards</h3>
        <p className="text-neo-muted text-sm">Try a different search term</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 bg-neo-yellow border-2 border-neo-black rounded-xl shadow-neo-lg flex items-center justify-center">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </div>
        <div className="absolute -top-2 -right-2 w-7 h-7 bg-neo-blue border-2 border-neo-black rounded-full flex items-center justify-center">
          <IconPlus size={14} />
        </div>
      </div>
      <h3 className="font-black text-2xl mb-2">No boards yet</h3>
      <p className="text-neo-muted text-sm mb-6 max-w-xs">
        Create your first board to start organizing tasks and collaborating with
        your team.
      </p>
      <button onClick={onCreate} className="neo-btn neo-btn-primary text-base">
        <IconPlus />
        Create your first board
      </button>
    </div>
  );
}

// ── Error State ──────────────────────────────────────────

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-neo-red/20 border-2 border-neo-black rounded-xl shadow-neo flex items-center justify-center text-2xl mb-5">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FF5252"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="font-bold text-lg mb-1">Something went wrong</h3>
      <p className="text-neo-muted text-sm mb-5 max-w-xs">{message}</p>
      <button onClick={onRetry} className="neo-btn neo-btn-ghost">
        Try again
      </button>
    </div>
  );
}

// ── Create Board Modal ───────────────────────────────────

function CreateBoardModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (board: Board) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Board name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to create board (${res.status})`
        );
      }

      const board = await res.json();
      onCreated(board);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
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
        className="neo-card w-full max-w-md p-0 animate-slide-up"
        role="dialog"
        aria-labelledby="create-board-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-neo-black bg-neo-yellow rounded-t-[6px]">
          <h2 id="create-board-title" className="font-black text-lg">
            New Board
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 border-2 border-neo-black rounded-md bg-neo-white flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <IconX />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label
              htmlFor="board-name"
              className="block text-sm font-bold mb-1.5"
            >
              Board Name <span className="text-neo-red">*</span>
            </label>
            <input
              id="board-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Sprint Planning, Marketing Q2"
              className="neo-input"
              autoFocus
              maxLength={50}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="board-desc"
              className="block text-sm font-bold mb-1.5"
            >
              Description{" "}
              <span className="text-neo-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="board-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this board about?"
              className="neo-input resize-none"
              rows={3}
              maxLength={200}
              disabled={isSubmitting}
            />
            <p className="text-xs text-neo-muted mt-1 text-right font-mono">
              {description.length}/200
            </p>
          </div>

          {error && (
            <div className="bg-neo-red/10 border-2 border-neo-red rounded-lg px-4 py-2.5 text-sm font-semibold text-neo-red">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="neo-btn neo-btn-ghost flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="neo-btn neo-btn-primary flex-1"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Creating...
                </span>
              ) : (
                "Create Board"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard Page ───────────────────────────────────────

export default function DashboardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBoards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/boards");
      if (!res.ok) {
        if (res.status === 401)
          throw new Error("Please sign in to view your boards");
        throw new Error("Failed to load boards");
      }
      const data = await res.json();
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  function handleBoardCreated(board: Board) {
    setBoards((prev) => [board, ...prev]);
    setIsModalOpen(false);
  }

  const filtered = boards.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-black text-3xl sm:text-4xl tracking-tight mb-1">
          My Boards
        </h1>
        <p className="text-neo-muted text-sm">
          Manage your projects and collaborate with your team
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neo-muted pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search boards..."
            className="neo-input pl-10"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="neo-btn neo-btn-primary whitespace-nowrap"
        >
          <IconPlus />
          Create Board
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <BoardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchBoards} />
      ) : boards.length === 0 ? (
        <EmptyState onCreate={() => setIsModalOpen(true)} isSearch={false} />
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={() => setIsModalOpen(true)} isSearch={true} />
      ) : (
        <>
          <p className="text-sm text-neo-muted mb-4 font-mono">
            {filtered.length} board{filtered.length !== 1 ? "s" : ""}
            {search && (
              <>
                {" "}
                matching &ldquo;{search}&rdquo;
              </>
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger-grid">
            {filtered.map((board, i) => (
              <BoardCard key={board.id} board={board} index={i} />
            ))}
          </div>
        </>
      )}

      {/* Create Modal */}
      <CreateBoardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleBoardCreated}
      />
    </div>
  );
}
