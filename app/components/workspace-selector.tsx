"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
  memberCount: number;
  boardCount: number;
}

export default function WorkspaceSelector() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setWorkspaces(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (loading) {
    return (
      <div className="neo-btn neo-btn-ghost text-xs py-1.5 px-2 sm:px-3 shadow-neo-sm sm:shadow-neo opacity-50">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="hidden sm:inline animate-pulse-neo">...</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="neo-btn neo-btn-ghost text-xs py-1.5 px-2 sm:px-3 shadow-neo-sm sm:shadow-neo"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span className="hidden sm:inline">Workspaces</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 neo-card p-0 z-50 animate-fade-in">
          <div className="p-3 border-b-2 border-neo-black">
            <p className="font-bold text-sm">Your Workspaces</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {workspaces.length === 0 ? (
              <div className="p-4 text-center text-sm text-neo-muted">
                No workspaces yet
              </div>
            ) : (
              workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  href={`/workspace/${ws.slug}/settings`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 p-3 hover:bg-neo-yellow/20 transition-colors border-b border-neo-black/10 last:border-0"
                >
                  <div className="w-8 h-8 bg-neo-blue border-2 border-neo-black rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{ws.name}</p>
                    <p className="text-xs text-neo-muted">
                      {ws.plan} · {ws.memberCount} members · {ws.boardCount} boards
                    </p>
                  </div>
                  <span className="neo-badge bg-neo-bg text-[10px]">{ws.role}</span>
                </Link>
              ))
            )}
          </div>

          <div className="p-2 border-t-2 border-neo-black">
            <Link
              href="/workspace/new"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full neo-btn neo-btn-primary text-xs py-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Workspace
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
