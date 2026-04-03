"use client";

import { useEffect, useRef } from "react";

export interface KeyboardShortcutActions {
  /** C — focus the "Add Card" input in the first visible list */
  onAddCard: () => void;
  /** F — toggle the filter bar */
  onToggleFilter: () => void;
  /** / — focus the filter/search input */
  onFocusSearch: () => void;
  /** Escape — close any open panel */
  onEscape: () => void;
  /** ? — show shortcuts cheat sheet */
  onShowShortcuts: () => void;
}

/**
 * Register keyboard shortcuts for the board page.
 * Shortcuts are only active when no input/textarea/contenteditable is focused.
 *
 * Integration: import in board-view.tsx and call inside BoardView:
 *
 *   useKeyboardShortcuts({
 *     onAddCard: () => { ... },
 *     onToggleFilter: () => { ... },
 *     onFocusSearch: () => { ... },
 *     onEscape: () => { setSelectedCardId(null); setShowMembers(false); },
 *     onShowShortcuts: () => { setShowShortcuts(true); },
 *   });
 */
export function useKeyboardShortcuts(actions: KeyboardShortcutActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't intercept when user is typing in an input field
      const tag = (e.target as HTMLElement)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        // Exception: Escape should still work in inputs (to close panels)
        if (e.key === "Escape") {
          actionsRef.current.onEscape();
        }
        return;
      }

      // Ignore when modifier keys are held (except Shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      switch (e.key) {
        case "c":
        case "C":
          e.preventDefault();
          actionsRef.current.onAddCard();
          break;
        case "f":
        case "F":
          e.preventDefault();
          actionsRef.current.onToggleFilter();
          break;
        case "/":
          e.preventDefault();
          actionsRef.current.onFocusSearch();
          break;
        case "Escape":
          actionsRef.current.onEscape();
          break;
        case "?":
          e.preventDefault();
          actionsRef.current.onShowShortcuts();
          break;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
