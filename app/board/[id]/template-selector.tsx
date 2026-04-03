"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────

interface CardTemplate {
  id: string;
  name: string;
  description: string | null;
  priority: string;
  labels: string[];
}

interface TemplateSelection {
  description: string | null;
  priority: string;
  labels: string[];
}

const PRIORITY_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  LOW: { label: "Low", color: "#155DFC", bg: "rgba(21,93,252,0.15)" },
  MEDIUM: { label: "Med", color: "#FF8A00", bg: "rgba(255,138,0,0.15)" },
  HIGH: { label: "High", color: "#FF5252", bg: "rgba(255,82,82,0.15)" },
  URGENT: { label: "Urgent", color: "#FF5252", bg: "rgba(255,82,82,0.3)" },
};

// ── Icons ────────────────────────────────────────────────

function IconTemplate() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

// ── TemplateSelector ─────────────────────────────────────

export default function TemplateSelector({
  boardId,
  onSelect,
  onManage,
}: {
  boardId: string;
  onSelect: (template: TemplateSelection) => void;
  onManage: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/templates`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (isOpen && templates.length === 0) {
      fetchTemplates();
    }
  }, [isOpen, templates.length, fetchTemplates]);

  function handleSelect(t: CardTemplate) {
    onSelect({
      description: t.description,
      priority: t.priority,
      labels: t.labels,
    });
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="p-1.5 hover:bg-neo-yellow/20 rounded transition-colors"
        title="Use a template"
      >
        <IconTemplate />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 neo-card-sm z-50 overflow-hidden animate-fade-in">
          <div className="px-3 py-2 bg-neo-bg border-b-2 border-neo-black/15">
            <p className="text-xs font-black uppercase tracking-wider">Card Templates</p>
          </div>

          {loading ? (
            <div className="p-4 text-center">
              <span className="text-xs text-neo-muted animate-pulse-neo">Loading...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-neo-muted mb-2">No templates yet</p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {templates.map((t) => {
                const pri = PRIORITY_STYLE[t.priority];
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSelect(t)}
                    className="w-full text-left px-3 py-2 hover:bg-neo-yellow/20 transition-colors border-b border-neo-black/5 last:border-b-0"
                  >
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {pri && (
                        <span
                          className="text-[9px] font-bold px-1 py-0 rounded border border-current"
                          style={{ color: pri.color, backgroundColor: pri.bg }}
                        >
                          {pri.label}
                        </span>
                      )}
                      {t.labels.slice(0, 2).map((l) => (
                        <span
                          key={l}
                          className="text-[9px] font-semibold px-1 py-0 rounded bg-neo-yellow/30 border border-neo-black/20"
                        >
                          {l}
                        </span>
                      ))}
                      {t.labels.length > 2 && (
                        <span className="text-[9px] text-neo-muted">+{t.labels.length - 2}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={() => {
              setIsOpen(false);
              onManage();
            }}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-neo-muted hover:text-neo-black hover:bg-neo-yellow/10 transition-colors border-t-2 border-neo-black/15"
          >
            <IconSettings />
            Manage Templates
          </button>
        </div>
      )}
    </div>
  );
}
