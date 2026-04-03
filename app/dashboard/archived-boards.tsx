"use client";

import { useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────

interface Board {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  _count: {
    members: number;
  };
}

interface ArchivedBoardsProps {
  boards: Board[];
  onRestored: (boardId: string) => void;
  onDeleted: (boardId: string) => void;
}

// ── Icons ────────────────────────────────────────────────

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
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

function IconArchive() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Confirm Delete Dialog ────────────────────────────────

function ConfirmDeleteDialog({
  boardName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  boardName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className="neo-overlay animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div className="neo-card w-full max-w-sm p-0 animate-slide-up" role="dialog">
        <div className="px-6 py-4 border-b-2 border-neo-black bg-neo-red/10 rounded-t-[6px]">
          <h3 className="font-black text-lg text-neo-red">Delete Board</h3>
        </div>
        <div className="p-6">
          <p className="text-sm mb-1">
            Are you sure you want to permanently delete <strong>{boardName}</strong>?
          </p>
          <p className="text-xs text-neo-muted mb-5">
            This will delete all lists, cards, comments, and activity. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="neo-btn neo-btn-ghost flex-1"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="neo-btn neo-btn-danger flex-1"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Deleting...
                </span>
              ) : (
                "Delete Forever"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Archived Boards Section ──────────────────────────────

export default function ArchivedBoards({ boards, onRestored, onDeleted }: ArchivedBoardsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const archivedBoards = boards.filter((b) => b.isArchived);

  const handleRestore = useCallback(
    async (board: Board) => {
      setRestoring(board.id);
      try {
        const res = await fetch(`/api/boards/${board.id}/archive`, {
          method: "PATCH",
        });
        if (!res.ok) throw new Error("Failed to restore");
        onRestored(board.id);
      } catch {
        // Silently fail — user can retry
      } finally {
        setRestoring(null);
      }
    },
    [onRestored],
  );

  const handleDelete = useCallback(async () => {
    if (!deletingBoard) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/boards/${deletingBoard.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      onDeleted(deletingBoard.id);
      setDeletingBoard(null);
    } catch {
      // Silently fail
    } finally {
      setIsDeleting(false);
    }
  }, [deletingBoard, onDeleted]);

  if (archivedBoards.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t-2 border-neo-black/10">
      {/* Toggle header */}
      <button
        onClick={() => setIsExpanded((p) => !p)}
        className="flex items-center gap-2 text-sm font-bold text-neo-muted hover:text-foreground transition-colors group"
      >
        <IconArchive />
        Archived Boards ({archivedBoards.length})
        <IconChevron open={isExpanded} />
      </button>

      {/* Collapsed → nothing else rendered */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4 animate-fade-in">
          {archivedBoards.map((board) => (
            <div
              key={board.id}
              className="neo-card overflow-hidden opacity-70 hover:opacity-100 transition-opacity"
            >
              <div className="h-2 w-full bg-gray-300" />
              <div className="p-5">
                <h3 className="font-black text-lg truncate mb-1 line-through decoration-2">
                  {board.name}
                </h3>
                <p className="text-neo-muted text-sm line-clamp-2 min-h-[2.5rem] mb-4">
                  {board.description || "No description"}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(board)}
                    className="neo-btn neo-btn-ghost text-xs py-1 px-3 shadow-neo-sm flex-1"
                    disabled={restoring === board.id}
                  >
                    {restoring === board.id ? (
                      <span className="flex items-center gap-1.5">
                        <Spinner />
                        Restoring...
                      </span>
                    ) : (
                      "Restore"
                    )}
                  </button>
                  <button
                    onClick={() => setDeletingBoard(board)}
                    className="neo-btn neo-btn-danger text-xs py-1 px-3 shadow-neo-sm flex-1"
                    disabled={restoring === board.id}
                  >
                    Delete Forever
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deletingBoard && (
        <ConfirmDeleteDialog
          boardName={deletingBoard.name}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!isDeleting) setDeletingBoard(null);
          }}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
