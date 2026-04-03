"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────

interface SearchCard {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  listTitle: string;
}

interface SearchGroup {
  boardId: string;
  boardName: string;
  cards: SearchCard[];
}

interface FlatResult {
  cardId: string;
  cardTitle: string;
  description: string | null;
  priority: string;
  listTitle: string;
  boardId: string;
  boardName: string;
}

// ── Constants ────────────────────────────────────────────

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "#FF5252",
  HIGH: "#FF8A00",
  MEDIUM: "#155DFC",
  LOW: "#00D4AA",
};

// ── Command Palette ──────────────────────────────────────

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FlatResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ── Keyboard shortcut to open ──────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // ── Focus input when opened ────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // ── Lock body scroll ───────────────────────────────────
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

  // ── Search API ─────────────────────────────────────────
  const search = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort();

    if (!q.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("Search failed");
      const groups: SearchGroup[] = await res.json();

      // Flatten for navigation
      const flat: FlatResult[] = [];
      for (const group of groups) {
        for (const card of group.cards) {
          flat.push({
            cardId: card.id,
            cardTitle: card.title,
            description: card.description,
            priority: card.priority,
            listTitle: card.listTitle,
            boardId: group.boardId,
            boardName: group.boardName,
          });
        }
      }
      setResults(flat);
      setSelectedIndex(0);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setResults([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Debounced search ───────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  // ── Navigate to result ─────────────────────────────────
  function navigateTo(result: FlatResult) {
    setIsOpen(false);
    router.push(`/board/${result.boardId}?card=${result.cardId}`);
  }

  // ── Keyboard navigation ────────────────────────────────
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigateTo(results[selectedIndex]);
    }
  }

  // ── Scroll selected into view ──────────────────────────
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="neo-overlay animate-fade-in"
      style={{ alignItems: "flex-start", paddingTop: "min(20vh, 160px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        className="neo-card w-full max-w-xl p-0 animate-slide-up overflow-hidden"
        role="dialog"
        aria-label="Search cards"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b-2 border-neo-black">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-neo-muted shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search cards..."
            className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:text-neo-muted"
          />
          {isLoading && (
            <svg className="animate-spin h-4 w-4 text-neo-muted shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 border-2 border-neo-black rounded text-[10px] font-bold text-neo-muted shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {query.trim() && !isLoading && results.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-neo-muted">No results for &ldquo;{query}&rdquo;</p>
            </div>
          )}

          {results.map((result, i) => (
            <button
              key={`${result.boardId}-${result.cardId}`}
              onClick={() => navigateTo(result)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full text-left px-5 py-3 flex items-start gap-3 transition-colors ${
                i === selectedIndex ? "bg-neo-yellow/20" : "hover:bg-gray-50"
              }`}
            >
              {PRIORITY_DOT[result.priority] && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 border border-neo-black/20"
                  style={{ backgroundColor: PRIORITY_DOT[result.priority] }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{result.cardTitle}</p>
                <p className="text-xs text-neo-muted truncate mt-0.5">
                  {result.boardName} &middot; {result.listTitle}
                </p>
              </div>
              {i === selectedIndex && (
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-gray-100 border border-neo-black/20 rounded text-[10px] font-bold text-neo-muted shrink-0 mt-0.5">
                  ENTER
                </kbd>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t-2 border-neo-black bg-gray-50 flex items-center gap-4 text-[10px] font-bold text-neo-muted uppercase tracking-wide">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-neo-black/20 rounded">
              &uarr;&darr;
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-neo-black/20 rounded">
              ENTER
            </kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-white border border-neo-black/20 rounded">
              ESC
            </kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
