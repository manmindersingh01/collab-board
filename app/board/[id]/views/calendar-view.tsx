"use client";

import { useState, useMemo, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  addMonths,
  subMonths,
} from "date-fns";

// ── Types ────────────────────────────────────────────────

interface AssigneeData {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface CardData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  priority: string;
  dueDate: Date | string | null;
  labels: string[];
  completionListId: string | null;
  assignee: AssigneeData | null;
}

interface ListData {
  id: string;
  title: string;
  position: number;
  card: CardData[];
}

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "#FF5252",
  HIGH: "#FF5252",
  MEDIUM: "#FF8A00",
  LOW: "#155DFC",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Icons ────────────────────────────────────────────────

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ── Card Chip ────────────────────────────────────────────

function CardChip({
  card,
  isOverdue,
  onClick,
}: {
  card: CardData;
  isOverdue: boolean;
  onClick: () => void;
}) {
  const dotColor = PRIORITY_DOT[card.priority];

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`w-full text-left text-[11px] font-semibold px-1.5 py-0.5 rounded border border-neo-black/20 truncate hover:bg-neo-yellow/30 transition-colors ${
        isOverdue ? "text-neo-red" : "text-neo-black"
      }`}
      title={card.title}
    >
      {dotColor && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {card.title}
    </button>
  );
}

// ── CalendarView ─────────────────────────────────────────

export default function CalendarView({
  lists,
  onCardClick,
}: {
  lists: ListData[];
  onCardClick: (id: string) => void;
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // All cards flat
  const allCards = useMemo(() => {
    const result: CardData[] = [];
    for (const list of lists) {
      for (const card of list.card) {
        result.push(card);
      }
    }
    return result;
  }, [lists]);

  // Cards with due dates mapped by date string
  const cardsByDate = useMemo(() => {
    const map = new Map<string, CardData[]>();
    for (const card of allCards) {
      if (card.dueDate) {
        const key = format(new Date(card.dueDate), "yyyy-MM-dd");
        const existing = map.get(key) ?? [];
        existing.push(card);
        map.set(key, existing);
      }
    }
    return map;
  }, [allCards]);

  // Unscheduled cards
  const unscheduled = useMemo(() => allCards.filter((c) => !c.dueDate), [allCards]);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);
  const goPrev = useCallback(() => setCurrentDate((d) => subMonths(d, 1)), []);
  const goNext = useCallback(() => setCurrentDate((d) => addMonths(d, 1)), []);

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  return (
    <div className="p-6 flex gap-6">
      {/* Main calendar */}
      <div className="flex-1">
        <div className="neo-card overflow-hidden" style={{ boxShadow: "6px 6px 0px #000" }}>
          {/* Navigation header */}
          <div className="flex items-center justify-between px-5 py-3 bg-neo-yellow border-b-2 border-neo-black">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="neo-btn neo-btn-ghost py-1 px-2"
                style={{ boxShadow: "2px 2px 0 #000" }}
              >
                <IconChevronLeft />
              </button>
              <button
                onClick={goNext}
                className="neo-btn neo-btn-ghost py-1 px-2"
                style={{ boxShadow: "2px 2px 0 #000" }}
              >
                <IconChevronRight />
              </button>
            </div>

            <h2 className="font-black text-lg">
              {format(currentDate, "MMMM yyyy")}
            </h2>

            <button
              onClick={goToToday}
              className="neo-btn neo-btn-ghost py-1 px-3 text-xs"
              style={{ boxShadow: "2px 2px 0 #000" }}
            >
              Today
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b-2 border-neo-black">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-black uppercase tracking-wider py-2 border-r-2 border-neo-black/15 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const cards = cardsByDate.get(dateKey) ?? [];
              const inMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isPast = isBefore(day, now) && !isCurrentDay;

              return (
                <div
                  key={dateKey}
                  className={`min-h-[100px] border-r-2 border-b-2 border-neo-black/15 p-1.5 ${
                    idx % 7 === 6 ? "border-r-0" : ""
                  } ${!inMonth ? "bg-gray-50/50" : ""} ${
                    isCurrentDay ? "bg-neo-yellow/20" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold ${
                        isCurrentDay
                          ? "bg-neo-black text-neo-white w-5 h-5 rounded-full flex items-center justify-center"
                          : !inMonth
                            ? "text-neo-muted/40"
                            : "text-neo-black"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    {cards.length > 3 && (
                      <span className="text-[9px] text-neo-muted font-mono">
                        +{cards.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {cards.slice(0, 3).map((card) => (
                      <CardChip
                        key={card.id}
                        card={card}
                        isOverdue={isPast}
                        onClick={() => onCardClick(card.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Unscheduled sidebar */}
      <div className="w-64 flex-shrink-0">
        <div className="neo-card overflow-hidden sticky top-6">
          <div className="px-4 py-3 bg-neo-bg border-b-2 border-neo-black/15">
            <h3 className="font-black text-sm">
              Unscheduled ({unscheduled.length})
            </h3>
          </div>
          <div className="p-3 space-y-1.5 max-h-[60vh] overflow-y-auto">
            {unscheduled.length === 0 ? (
              <p className="text-xs text-neo-muted text-center py-4">
                All cards have due dates
              </p>
            ) : (
              unscheduled.map((card) => (
                <CardChip
                  key={card.id}
                  card={card}
                  isOverdue={false}
                  onClick={() => onCardClick(card.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
