import { describe, it, expect, vi, beforeEach } from "vitest";
import prisma from "@/lib/prisma";
import { runAutomations } from "./engine";

// Mock the action executors
vi.mock("./actions", () => ({
  executeSetField: vi.fn(),
  executeMoveToList: vi.fn(),
  executeAssign: vi.fn(),
  executeUnassign: vi.fn(),
  executeAddLabel: vi.fn(),
  executeRemoveLabel: vi.fn(),
  executeNotify: vi.fn(),
  executeAddComment: vi.fn(),
}));

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

const baseContext = {
  cardId: "card1",
  userId: "user1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runAutomations", () => {
  it("does nothing when no automations exist for the board", async () => {
    vi.mocked(prisma.automation.findMany).mockResolvedValue([]);

    await runAutomations("board1", "card.created", baseContext);

    expect(prisma.automation.findMany).toHaveBeenCalledWith({
      where: { boardId: "board1", isActive: true },
    });
    expect(executeSetField).not.toHaveBeenCalled();
  });

  it("skips automations whose trigger event does not match", async () => {
    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto1",
        name: "Test",
        isActive: true,
        trigger: { event: "card.moved", conditions: {} },
        actions: [{ type: "set_field", field: "priority", value: "HIGH" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runAutomations("board1", "card.created", baseContext);

    expect(executeSetField).not.toHaveBeenCalled();
  });

  it("executes actions when trigger event and conditions match", async () => {
    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto1",
        name: "Move to done → set HIGH",
        isActive: true,
        trigger: { event: "card.moved", conditions: { toList: "list-done" } },
        actions: [{ type: "set_field", field: "priority", value: "HIGH" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runAutomations("board1", "card.moved", {
      ...baseContext,
      toListId: "list-done",
    });

    expect(executeSetField).toHaveBeenCalledWith("card1", "priority", "HIGH");
  });

  it("skips automations whose conditions do not match", async () => {
    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto1",
        name: "Move to done",
        isActive: true,
        trigger: { event: "card.moved", conditions: { toList: "list-done" } },
        actions: [{ type: "set_field", field: "priority", value: "HIGH" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runAutomations("board1", "card.moved", {
      ...baseContext,
      toListId: "list-todo",
    });

    expect(executeSetField).not.toHaveBeenCalled();
  });

  it("executes multiple actions in order", async () => {
    const callOrder: string[] = [];
    vi.mocked(executeSetField).mockImplementation(async () => {
      callOrder.push("set_field");
    });
    vi.mocked(executeAddLabel).mockImplementation(async () => {
      callOrder.push("add_label");
    });
    vi.mocked(executeNotify).mockImplementation(async () => {
      callOrder.push("notify");
    });

    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto1",
        name: "Multi-action",
        isActive: true,
        trigger: { event: "card.created" },
        actions: [
          { type: "set_field", field: "priority", value: "MEDIUM" },
          { type: "add_label", label: "new" },
          { type: "notify", userId: "user2", message: "New card" },
        ],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runAutomations("board1", "card.created", baseContext);

    expect(callOrder).toEqual(["set_field", "add_label", "notify"]);
  });

  it("executes all matching automations", async () => {
    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto1",
        name: "Rule 1",
        isActive: true,
        trigger: { event: "card.created" },
        actions: [{ type: "set_field", field: "priority", value: "LOW" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "auto2",
        name: "Rule 2",
        isActive: true,
        trigger: { event: "card.created" },
        actions: [{ type: "add_label", label: "auto" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runAutomations("board1", "card.created", baseContext);

    expect(executeSetField).toHaveBeenCalledTimes(1);
    expect(executeAddLabel).toHaveBeenCalledTimes(1);
  });

  it("handles move_to_list action", async () => {
    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto1",
        name: "Auto move",
        isActive: true,
        trigger: { event: "card.completed" },
        actions: [{ type: "move_to_list", listId: "list-archive" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runAutomations("board1", "card.completed", baseContext);

    expect(executeMoveToList).toHaveBeenCalledWith("card1", "list-archive");
  });

  it("handles assign and unassign actions", async () => {
    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto1",
        name: "Auto assign",
        isActive: true,
        trigger: { event: "card.created" },
        actions: [
          { type: "assign", userId: "user2" },
        ],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "auto2",
        name: "Auto unassign",
        isActive: true,
        trigger: { event: "card.completed" },
        actions: [{ type: "unassign" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runAutomations("board1", "card.created", baseContext);
    expect(executeAssign).toHaveBeenCalledWith("card1", "user2");

    vi.clearAllMocks();
    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto2",
        name: "Auto unassign",
        isActive: true,
        trigger: { event: "card.completed" },
        actions: [{ type: "unassign" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runAutomations("board1", "card.completed", baseContext);
    expect(executeUnassign).toHaveBeenCalledWith("card1");
  });

  it("handles remove_label action", async () => {
    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto1",
        name: "Remove label",
        isActive: true,
        trigger: { event: "card.completed" },
        actions: [{ type: "remove_label", label: "in-progress" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runAutomations("board1", "card.completed", baseContext);

    expect(executeRemoveLabel).toHaveBeenCalledWith("card1", "in-progress");
  });

  it("handles add_comment action", async () => {
    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto1",
        name: "Auto comment",
        isActive: true,
        trigger: { event: "card.completed" },
        actions: [{ type: "add_comment", message: "Auto: completed" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    await runAutomations("board1", "card.completed", baseContext);

    expect(executeAddComment).toHaveBeenCalledWith(
      "card1",
      "user1",
      "Auto: completed",
    );
  });

  it("does not throw when an action executor fails", async () => {
    vi.mocked(executeSetField).mockRejectedValue(new Error("DB error"));
    vi.mocked(prisma.automation.findMany).mockResolvedValue([
      {
        id: "auto1",
        name: "Failing rule",
        isActive: true,
        trigger: { event: "card.created" },
        actions: [{ type: "set_field", field: "priority", value: "HIGH" }],
        boardId: "board1",
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Should not throw
    await expect(
      runAutomations("board1", "card.created", baseContext),
    ).resolves.toBeUndefined();
  });
});
