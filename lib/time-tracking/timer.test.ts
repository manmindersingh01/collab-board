import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { startTimer, stopTimer, getActiveTimer, computeDuration } from "./timer";

const mockUser = { id: "user1", name: "Test", email: "test@test.com", clerkId: "clerk1" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("computeDuration", () => {
  it("computes minutes between two dates", () => {
    const start = new Date("2026-04-01T10:00:00Z");
    const stop = new Date("2026-04-01T10:45:00Z");
    expect(computeDuration(start, stop)).toBe(45);
  });

  it("rounds to nearest minute", () => {
    const start = new Date("2026-04-01T10:00:00Z");
    const stop = new Date("2026-04-01T10:00:40Z"); // 40 seconds → rounds to 1
    expect(computeDuration(start, stop)).toBe(1);
  });

  it("returns minimum 1 for very short durations", () => {
    const start = new Date("2026-04-01T10:00:00Z");
    const stop = new Date("2026-04-01T10:00:10Z"); // 10 seconds
    expect(computeDuration(start, stop)).toBe(1);
  });

  it("rounds 2.5 minutes to 3", () => {
    const start = new Date("2026-04-01T10:00:00Z");
    const stop = new Date("2026-04-01T10:02:30Z"); // 2m30s
    expect(computeDuration(start, stop)).toBe(3);
  });

  it("handles exact minutes with no rounding needed", () => {
    const start = new Date("2026-04-01T10:00:00Z");
    const stop = new Date("2026-04-01T12:00:00Z"); // 2 hours
    expect(computeDuration(start, stop)).toBe(120);
  });
});

describe("getActiveTimer", () => {
  it("returns active timer entry when one exists", async () => {
    const entry = {
      id: "entry1",
      cardId: "card1",
      userId: "user1",
      startedAt: new Date(),
      stoppedAt: null,
      duration: null,
      isManual: false,
      description: null,
      createdAt: new Date(),
      card: { id: "card1", title: "Test Card", list: { boardId: "board1" } },
    };
    vi.mocked(prisma.timeEntry.findFirst).mockResolvedValue(entry as any);

    const result = await getActiveTimer("user1");
    expect(result).toEqual(entry);
    expect(prisma.timeEntry.findFirst).toHaveBeenCalledWith({
      where: { userId: "user1", stoppedAt: null },
      include: { card: { select: { id: true, title: true, list: { select: { boardId: true } } } } },
    });
  });

  it("returns null when no active timer", async () => {
    vi.mocked(prisma.timeEntry.findFirst).mockResolvedValue(null);
    const result = await getActiveTimer("user1");
    expect(result).toBeNull();
  });
});

describe("startTimer", () => {
  it("creates a new time entry", async () => {
    vi.mocked(prisma.timeEntry.findFirst).mockResolvedValue(null);
    const newEntry = {
      id: "entry1",
      cardId: "card1",
      userId: "user1",
      startedAt: new Date(),
      stoppedAt: null,
      duration: null,
      isManual: false,
      description: null,
      createdAt: new Date(),
    };
    vi.mocked(prisma.timeEntry.create).mockResolvedValue(newEntry as any);

    const result = await startTimer("user1", "card1");
    expect(result).toEqual(newEntry);
    expect(prisma.timeEntry.create).toHaveBeenCalledWith({
      data: {
        userId: "user1",
        cardId: "card1",
        startedAt: expect.any(Date),
      },
    });
  });

  it("stops existing timer before starting new one", async () => {
    const existingEntry = {
      id: "entry-old",
      cardId: "card-old",
      userId: "user1",
      startedAt: new Date("2026-04-01T10:00:00Z"),
      stoppedAt: null,
      duration: null,
      isManual: false,
      description: null,
      createdAt: new Date(),
    };
    vi.mocked(prisma.timeEntry.findFirst).mockResolvedValue(existingEntry as any);
    vi.mocked(prisma.timeEntry.update).mockResolvedValue({ ...existingEntry, stoppedAt: new Date(), duration: 30 } as any);

    const newEntry = {
      id: "entry-new",
      cardId: "card1",
      userId: "user1",
      startedAt: new Date(),
      stoppedAt: null,
      duration: null,
      isManual: false,
      description: null,
      createdAt: new Date(),
    };
    vi.mocked(prisma.timeEntry.create).mockResolvedValue(newEntry as any);

    const result = await startTimer("user1", "card1");
    expect(result).toEqual(newEntry);
    // Verify the old timer was stopped
    expect(prisma.timeEntry.update).toHaveBeenCalledWith({
      where: { id: "entry-old" },
      data: { stoppedAt: expect.any(Date), duration: expect.any(Number) },
    });
  });
});

describe("stopTimer", () => {
  it("stops the active timer and computes duration", async () => {
    const startedAt = new Date("2026-04-01T10:00:00Z");
    const activeEntry = {
      id: "entry1",
      cardId: "card1",
      userId: "user1",
      startedAt,
      stoppedAt: null,
      duration: null,
      isManual: false,
      description: null,
      createdAt: new Date(),
    };
    vi.mocked(prisma.timeEntry.findFirst).mockResolvedValue(activeEntry as any);

    const stoppedEntry = { ...activeEntry, stoppedAt: new Date(), duration: 60 };
    vi.mocked(prisma.timeEntry.update).mockResolvedValue(stoppedEntry as any);

    const result = await stopTimer("user1", "card1");
    expect(result).toEqual(stoppedEntry);
    expect(prisma.timeEntry.update).toHaveBeenCalledWith({
      where: { id: "entry1" },
      data: { stoppedAt: expect.any(Date), duration: expect.any(Number) },
    });
  });

  it("throws when no active timer exists", async () => {
    vi.mocked(prisma.timeEntry.findFirst).mockResolvedValue(null);
    await expect(stopTimer("user1", "card1")).rejects.toThrow("No active timer");
  });
});
