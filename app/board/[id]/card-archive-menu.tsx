"use client";

import { useState, useRef, useEffect } from "react";

// ── Types ────────────────────────────────────────────────

interface CardArchiveMenuProps {
  cardId: string;
  cardTitle: string;
  isArchived: boolean;
  userRole: string; // "owner" | "editer" | "viewer"
  onArchived: () => void;
  onDeleted: () => void;
}

// ── Icons ────────────────────────────────────────────────

function IconDots() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
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

function IconRestore() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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
  cardTitle,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  cardTitle: string;
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
          <h3 className="font-black text-lg text-neo-red">Delete Card</h3>
        </div>
        <div className="p-6">
          <p className="text-sm mb-1">
            Are you sure you want to permanently delete <strong>&ldquo;{cardTitle}&rdquo;</strong>?
          </p>
          <p className="text-xs text-neo-muted mb-5">
            This will also delete all comments on this card. This action cannot be undone.
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

// ── Card Archive Menu ────────────────────────────────────

export default function CardArchiveMenu({
  cardId,
  cardTitle,
  isArchived,
  userRole,
  onArchived,
  onDeleted,
}: CardArchiveMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canEdit = userRole === "owner" || userRole === "editer";
  const canDelete = userRole === "owner";

  // Close menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }
  }, [isOpen]);

  if (!canEdit) return null;

  async function handleArchive() {
    setIsArchiving(true);
    setIsOpen(false);
    try {
      const res = await fetch(`/api/cards/${cardId}/archive`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to archive");
      onArchived();
    } catch {
      // Silently fail
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/cards/${cardId}/archive`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      onDeleted();
      setShowDeleteConfirm(false);
    } catch {
      // Silently fail
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="w-7 h-7 flex items-center justify-center rounded-md border-2 border-neo-black bg-neo-white hover:bg-gray-100 transition-colors shadow-neo-sm"
        aria-label="Card actions"
        disabled={isArchiving}
      >
        {isArchiving ? <Spinner /> : <IconDots />}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-30 neo-card p-1.5 min-w-[160px] animate-fade-in">
          {/* Archive / Restore */}
          <button
            onClick={handleArchive}
            className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium hover:bg-gray-100 transition-colors"
          >
            {isArchived ? (
              <>
                <IconRestore />
                Restore card
              </>
            ) : (
              <>
                <IconArchive />
                Archive card
              </>
            )}
          </button>

          {/* Delete — Owner only */}
          {canDelete && (
            <button
              onClick={() => {
                setIsOpen(false);
                setShowDeleteConfirm(true);
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-neo-red hover:bg-neo-red/10 transition-colors"
            >
              <IconTrash />
              Delete card
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <ConfirmDeleteDialog
          cardTitle={cardTitle}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!isDeleting) setShowDeleteConfirm(false);
          }}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
