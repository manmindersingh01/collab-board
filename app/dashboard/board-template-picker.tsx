"use client";

import { BOARD_TEMPLATES, type BoardTemplate } from "@/lib/board-templates";

// ── Icons ────────────────────────────────────────────────

function TemplateIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "code":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "megaphone":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M3 11l18-5v12L3 13v-2z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      );
    case "rocket":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      );
    case "users":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "plus":
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
  }
}

// ── Template Accents ─────────────────────────────────────

const TEMPLATE_ACCENTS: Record<string, string> = {
  engineering: "#155DFC",
  marketing: "#FF8A00",
  product: "#FF5252",
  hiring: "#00D4AA",
  blank: "#7a7a7a",
};

// ── BoardTemplatePicker ──────────────────────────────────

export default function BoardTemplatePicker({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (template: BoardTemplate) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2">
        Choose a template
      </label>
      <div className="grid grid-cols-2 gap-2.5">
        {BOARD_TEMPLATES.map((t) => {
          const isSelected = selected === t.id;
          const accent = TEMPLATE_ACCENTS[t.id] ?? "#000";

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t)}
              className={`neo-card-sm p-3 text-left transition-all ${
                isSelected
                  ? "ring-2 ring-neo-black shadow-neo"
                  : "hover:shadow-neo-sm"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-7 h-7 rounded-md border-2 border-neo-black flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: isSelected ? accent : `${accent}20` }}
                >
                  <span style={{ color: isSelected ? "#fff" : accent }}>
                    <TemplateIcon icon={t.icon} />
                  </span>
                </div>
                <span className="text-xs font-black truncate">{t.name}</span>
              </div>
              <p className="text-[10px] text-neo-muted line-clamp-1 mb-1.5">
                {t.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {t.lists.map((list) => (
                  <span
                    key={list}
                    className="text-[9px] font-semibold px-1 py-0 bg-neo-bg rounded border border-neo-black/15"
                  >
                    {list}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
