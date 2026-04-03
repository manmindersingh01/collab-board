import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notify";
import {
  executeSetField,
  executeMoveToList,
  executeAssign,
  executeUnassign,
  executeAddLabel,
  executeRemoveLabel,
  executeNotify,
  executeAddComment,
} from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("executeSetField", () => {
  it("updates a card field via raw SQL", async () => {
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(1);
    await executeSetField("card1", "priority", "HIGH");
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE"),
      "HIGH",
      "card1",
    );
  });
});

describe("executeMoveToList", () => {
  it("moves card to a new list with position at end", async () => {
    vi.mocked(prisma.card.findFirst).mockResolvedValue({
      position: 5,
    } as any);
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(1);

    await executeMoveToList("card1", "list-done");

    expect(prisma.card.findFirst).toHaveBeenCalledWith({
      where: { listId: "list-done" },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE"),
      "list-done",
      6,
      "card1",
    );
  });

  it("sets position to 1 when target list is empty", async () => {
    vi.mocked(prisma.card.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(1);

    await executeMoveToList("card1", "list-empty");

    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE"),
      "list-empty",
      1,
      "card1",
    );
  });
});

describe("executeAssign", () => {
  it("assigns a user to a card", async () => {
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(1);
    await executeAssign("card1", "user1");
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE"),
      "user1",
      "card1",
    );
  });
});

describe("executeUnassign", () => {
  it("removes assignee from a card", async () => {
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(1);
    await executeUnassign("card1");
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE"),
      "card1",
    );
  });
});

describe("executeAddLabel", () => {
  it("adds a label to a card", async () => {
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(1);
    await executeAddLabel("card1", "hotfix");
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("array_append"),
      "hotfix",
      "card1",
    );
  });
});

describe("executeRemoveLabel", () => {
  it("removes a label from a card", async () => {
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(1);
    await executeRemoveLabel("card1", "hotfix");
    expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("array_remove"),
      "hotfix",
      "card1",
    );
  });
});

describe("executeNotify", () => {
  it("creates a notification for the user", async () => {
    vi.mocked(createNotification).mockResolvedValue(undefined);
    await executeNotify("user1", "Card moved", "/board/b1/card/c1");
    expect(createNotification).toHaveBeenCalledWith({
      userId: "user1",
      type: "automation",
      title: "Automation triggered",
      message: "Card moved",
      link: "/board/b1/card/c1",
    });
  });
});

describe("executeAddComment", () => {
  it("creates a comment on the card", async () => {
    vi.mocked(prisma.comment.create).mockResolvedValue({
      id: "comment1",
      message: "Auto: done",
      cardId: "card1",
      authorid: "user1",
      createdAt: new Date(),
    });

    await executeAddComment("card1", "user1", "Auto: done");

    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: {
        cardId: "card1",
        authorid: "user1",
        message: "Auto: done",
      },
    });
  });
});
