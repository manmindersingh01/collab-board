"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

// ── Types ────────────────────────────────────────────────

export type ViewMode = "board" | "table" | "calendar";

// ── Icons ────────────────────────────────────────────────

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

function IconTable() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ── ViewSwitcher ─────────────────────────────────────────

const VIEWS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: "board", label: "Board", icon: <IconBoard /> },
  { id: "table", label: "Table", icon: <IconTable /> },
  { id: "calendar", label: "Calendar", icon: <IconCalendar /> },
];

export default function ViewSwitcher() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeView = (searchParams.get("view") as ViewMode) || "board";

  const setView = useCallback(
    (view: ViewMode) => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === "board") {
        params.delete("view");
      } else {
        params.set("view", view);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  return (
    <div className="flex items-center border-2 border-neo-black rounded-lg overflow-hidden shadow-neo-sm bg-neo-white">
      {VIEWS.map((v) => {
        const isActive = activeView === v.id;
        return (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${
              isActive
                ? "bg-neo-yellow text-neo-black"
                : "bg-neo-white text-neo-muted hover:bg-neo-yellow/20 hover:text-neo-black"
            } ${v.id !== "board" ? "border-l-2 border-neo-black" : ""}`}
          >
            {v.icon}
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
