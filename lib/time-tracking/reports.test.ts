import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { generateTimeReport } from "./reports";

beforeEach(() => {
  vi.clearAllMocks();
});

const from = new Date("2026-04-01T00:00:00Z");
const to = new Date("2026-04-07T23:59:59Z");

describe("generateTimeReport", () => {
  it("returns correct aggregation for board with entries", async () => {
    const entries = [
      {
        id: "e1",
        cardId: "card1",
        userId: "user1",
        duration: 60,
        startedAt: new Date("2026-04-01T10:00:00Z"),
        stoppedAt: new Date("2026-04-01T11:00:00Z"),
        isManual: false,
        description: null,
        createdAt: new Date(),
        user: { id: "user1", name: "Alice" },
        card: { id: "card1", title: "Task A" },
      },
      {
        id: "e2",
        cardId: "card2",
        userId: "user2",
        duration: 120,
        startedAt: new Date("2026-04-02T09:00:00Z"),
        stoppedAt: new Date("2026-04-02T11:00:00Z"),
        isManual: false,
        description: null,
        createdAt: new Date(),
        user: { id: "user2", name: "Bob" },
        card: { id: "card2", title: "Task B" },
      },
      {
        id: "e3",
        cardId: "card1",
        userId: "user1",
        duration: 30,
        startedAt: new Date("2026-04-01T14:00:00Z"),
        stoppedAt: new Date("2026-04-01T14:30:00Z"),
        isManual: false,
        description: null,
        createdAt: new Date(),
        user: { id: "user1", name: "Alice" },
        card: { id: "card1", title: "Task A" },
      },
    ];

    vi.mocked(prisma.timeEntry.findMany).mockResolvedValue(entries as any);

    const report = await generateTimeReport("board1", from, to);

    expect(report.totalMinutes).toBe(210);

    // byUser aggregation
    expect(report.byUser).toHaveLength(2);
    const alice = report.byUser.find((u) => u.userId === "user1");
    expect(alice?.minutes).toBe(90);
    const bob = report.byUser.find((u) => u.userId === "user2");
    expect(bob?.minutes).toBe(120);

    // byCard aggregation
    expect(report.byCard).toHaveLength(2);
    const cardA = report.byCard.find((c) => c.cardId === "card1");
    expect(cardA?.minutes).toBe(90);
    const cardB = report.byCard.find((c) => c.cardId === "card2");
    expect(cardB?.minutes).toBe(120);

    // byDay aggregation
    expect(report.byDay).toHaveLength(2);
    const day1 = report.byDay.find((d) => d.date === "2026-04-01");
    expect(day1?.minutes).toBe(90);
    const day2 = report.byDay.find((d) => d.date === "2026-04-02");
    expect(day2?.minutes).toBe(120);
  });

  it("returns empty report when no entries exist", async () => {
    vi.mocked(prisma.timeEntry.findMany).mockResolvedValue([]);

    const report = await generateTimeReport("board1", from, to);
    expect(report.totalMinutes).toBe(0);
    expect(report.byUser).toEqual([]);
    expect(report.byCard).toEqual([]);
    expect(report.byDay).toEqual([]);
  });

  it("filters by userId when provided", async () => {
    vi.mocked(prisma.timeEntry.findMany).mockResolvedValue([]);

    await generateTimeReport("board1", from, to, "user1");

    expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user1",
        }),
      })
    );
  });

  it("excludes entries with null duration (running timers)", async () => {
    const entries = [
      {
        id: "e1",
        cardId: "card1",
        userId: "user1",
        duration: 60,
        startedAt: new Date("2026-04-01T10:00:00Z"),
        stoppedAt: new Date("2026-04-01T11:00:00Z"),
        isManual: false,
        description: null,
        createdAt: new Date(),
        user: { id: "user1", name: "Alice" },
        card: { id: "card1", title: "Task A" },
      },
    ];

    vi.mocked(prisma.timeEntry.findMany).mockResolvedValue(entries as any);

    await generateTimeReport("board1", from, to);

    expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          duration: { not: null },
        }),
      })
    );
  });
});
