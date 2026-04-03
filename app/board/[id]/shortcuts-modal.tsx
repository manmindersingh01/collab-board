"use client";

import { useEffect } from "react";

const SHORTCUTS = [
  { key: "C", description: "Add a new card to the first list" },
  { key: "F", description: "Toggle the filter bar" },
  { key: "/", description: "Focus the filter / search input" },
  { key: "Esc", description: "Close the current panel or modal" },
  { key: "?", description: "Show this shortcuts cheat sheet" },
];

/**
 * Keyboard shortcuts cheat sheet modal.
 * Styled with the neobrutalism design system.
 *
 * Integration: import in board-view.tsx:
 *   {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
 */
export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="neo-overlay" onClick={onClose}>
      <div
        className="neo-card p-6 w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="neo-btn neo-btn-ghost py-1 px-2"
            style={{ boxShadow: "2px 2px 0 #000" }}
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Shortcut list */}
        <div className="space-y-3">
          {SHORTCUTS.map(({ key, description }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm font-semibold text-neo-black/80">
                {description}
              </span>
              <kbd
                className="neo-badge bg-neo-yellow/40 text-neo-black font-mono text-xs px-2 py-0.5 flex-shrink-0"
              >
                {key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <p className="mt-5 text-xs text-neo-muted text-center">
          Shortcuts are disabled while typing in an input field.
        </p>
      </div>
    </div>
  );
}
