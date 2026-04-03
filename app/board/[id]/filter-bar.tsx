"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";

export interface FilterBarHandle {
  focusInput: () => void;
}

/**
 * Placeholder filter bar for the board view.
 * Toggled by the F keyboard shortcut; / focuses its input.
 *
 * Integration: import in board-view.tsx:
 *   const filterBarRef = useRef<FilterBarHandle>(null);
 *   {showFilter && (
 *     <FilterBar ref={filterBarRef} onClose={() => setShowFilter(false)} />
 *   )}
 *
 * The keyboard shortcuts hook wires:
 *   onToggleFilter: () => setShowFilter(prev => !prev)
 *   onFocusSearch:  () => filterBarRef.current?.focusInput()
 */
const FilterBar = forwardRef<FilterBarHandle, { onClose: () => void }>(
  function FilterBar({ onClose }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focusInput() {
        inputRef.current?.focus();
      },
    }));

    // Auto-focus on mount
    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    return (
      <div className="neo-card-sm px-4 py-3 flex items-center gap-3 animate-fade-in">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-neo-muted flex-shrink-0"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Filter cards by title, label, assignee..."
          className="flex-1 text-sm bg-transparent outline-none placeholder:text-neo-muted font-medium"
        />
        <button
          onClick={onClose}
          className="text-neo-muted hover:text-neo-black transition-colors p-1"
          aria-label="Close filter"
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
    );
  },
);

export default FilterBar;
