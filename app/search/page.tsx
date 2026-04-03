"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────

interface SearchCard {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  listTitle: string;
}

interface SearchGroup {
  boardId: string;
  boardName: string;
  cards: SearchCard[];
}

// ── Constants ────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  URGENT: { label: "Urgent", color: "#FF5252", bg: "rgba(255,82,82,0.15)" },
  HIGH: { label: "High", color: "#FF8A00", bg: "rgba(255,138,0,0.15)" },
  MEDIUM: { label: "Medium", color: "#155DFC", bg: "rgba(21,93,252,0.15)" },
  LOW: { label: "Low", color: "#00D4AA", bg: "rgba(0,212,170,0.15)" },
};

// ── Icons ────────────────────────────────────────────────

function IconSearch({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconBoard() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────

function truncate(text: string | null, max: number): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

// ── Search Page ─────────────────────────────────────────

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort();

    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
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
      const data = await res.json();
      setResults(data);
      setHasSearched(true);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setResults([]);
        setHasSearched(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const totalResults = results.reduce((sum, g) => sum + g.cards.length, 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-black text-3xl sm:text-4xl tracking-tight mb-1">Search</h1>
        <p className="text-neo-muted text-sm">Search across all your boards</p>
      </div>

      {/* Search Input */}
      <div className="relative mb-8">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neo-muted pointer-events-none">
          <IconSearch />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cards by title or description..."
          className="neo-input pl-12 py-3.5 text-base"
        />
        {isLoading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-neo-muted" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
      </div>

      {/* Results */}
      {!hasSearched && !query.trim() && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-neo-yellow/20 border-2 border-neo-black rounded-xl shadow-neo flex items-center justify-center mb-5">
            <IconSearch size={28} />
          </div>
          <h3 className="font-bold text-lg mb-1">Search across all your boards</h3>
          <p className="text-neo-muted text-sm max-w-sm">
            Find cards by title or description. Results are grouped by board.
          </p>
        </div>
      )}

      {hasSearched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-neo-bg border-2 border-neo-black rounded-xl shadow-neo flex items-center justify-center text-3xl mb-5">
            ?
          </div>
          <h3 className="font-bold text-lg mb-1">No cards matching &ldquo;{query}&rdquo;</h3>
          <p className="text-neo-muted text-sm">Try a different search term</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <p className="text-sm text-neo-muted mb-4 font-mono">
            {totalResults} result{totalResults !== 1 ? "s" : ""} across {results.length} board{results.length !== 1 ? "s" : ""}
          </p>

          <div className="space-y-6 animate-fade-in">
            {results.map((group) => (
              <div key={group.boardId} className="neo-card overflow-hidden">
                {/* Board header */}
                <div className="flex items-center gap-2 px-5 py-3 bg-neo-yellow/10 border-b-2 border-neo-black">
                  <IconBoard />
                  <Link
                    href={`/board/${group.boardId}`}
                    className="font-bold text-sm hover:underline underline-offset-4 decoration-2"
                  >
                    {group.boardName}
                  </Link>
                  <span className="neo-badge bg-neo-white ml-auto text-xs">
                    {group.cards.length} match{group.cards.length !== 1 ? "es" : ""}
                  </span>
                </div>

                {/* Cards */}
                <div className="divide-y-2 divide-neo-black/10">
                  {group.cards.map((card) => (
                    <Link
                      key={card.id}
                      href={`/board/${group.boardId}?card=${card.id}`}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-neo-yellow/5 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate group-hover:underline underline-offset-4 decoration-1">
                          {card.title}
                        </p>
                        {card.description && (
                          <p className="text-neo-muted text-xs mt-0.5 line-clamp-1">
                            {truncate(card.description, 120)}
                          </p>
                        )}
                        <p className="text-neo-muted text-xs mt-1 font-mono">
                          in {card.listTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        {PRIORITY_STYLE[card.priority] && (
                          <span
                            className="neo-badge text-xs"
                            style={{
                              backgroundColor: PRIORITY_STYLE[card.priority].bg,
                              color: PRIORITY_STYLE[card.priority].color,
                              borderColor: PRIORITY_STYLE[card.priority].color,
                            }}
                          >
                            {PRIORITY_STYLE[card.priority].label}
                          </span>
                        )}
                        {card.dueDate && (
                          <span className="text-xs text-neo-muted font-mono">
                            {new Date(card.dueDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
