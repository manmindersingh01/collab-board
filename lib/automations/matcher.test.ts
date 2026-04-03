import { describe, it, expect } from "vitest";
import { matchesConditions } from "./matcher";

describe("matchesConditions", () => {
  it("returns true when conditions is undefined (always match)", () => {
    expect(matchesConditions(undefined, {})).toBe(true);
  });

  it("returns true when conditions is empty object (always match)", () => {
    expect(matchesConditions({}, {})).toBe(true);
  });

  it("matches toList condition", () => {
    expect(
      matchesConditions({ toList: "list-done" }, { toListId: "list-done" }),
    ).toBe(true);
  });

  it("rejects non-matching toList condition", () => {
    expect(
      matchesConditions({ toList: "list-done" }, { toListId: "list-todo" }),
    ).toBe(false);
  });

  it("matches fromList condition", () => {
    expect(
      matchesConditions(
        { fromList: "list-backlog" },
        { fromListId: "list-backlog" },
      ),
    ).toBe(true);
  });

  it("rejects non-matching fromList condition", () => {
    expect(
      matchesConditions(
        { fromList: "list-backlog" },
        { fromListId: "list-done" },
      ),
    ).toBe(false);
  });

  it("matches priority condition", () => {
    expect(
      matchesConditions({ priority: "HIGH" }, { priority: "HIGH" }),
    ).toBe(true);
  });

  it("rejects non-matching priority condition", () => {
    expect(
      matchesConditions({ priority: "URGENT" }, { priority: "LOW" }),
    ).toBe(false);
  });

  it("matches field condition (for card.updated)", () => {
    expect(
      matchesConditions({ field: "priority" }, { field: "priority" }),
    ).toBe(true);
  });

  it("rejects non-matching field condition", () => {
    expect(
      matchesConditions({ field: "priority" }, { field: "title" }),
    ).toBe(false);
  });

  it("requires ALL conditions to match (AND logic)", () => {
    expect(
      matchesConditions(
        { fromList: "list-a", toList: "list-b" },
        { fromListId: "list-a", toListId: "list-b" },
      ),
    ).toBe(true);

    // One doesn't match
    expect(
      matchesConditions(
        { fromList: "list-a", toList: "list-b" },
        { fromListId: "list-a", toListId: "list-c" },
      ),
    ).toBe(false);
  });

  it("ignores conditions whose context value is undefined", () => {
    // If context doesn't have toListId, the toList condition is skipped
    expect(
      matchesConditions({ toList: "list-done" }, {}),
    ).toBe(false);
  });
});
