import { describe, it, expect } from "vitest";
import { parseTrelloExport } from "./trello-parser";

const validTrelloExport = {
  name: "My Trello Board",
  desc: "A test board",
  lists: [
    { id: "list1", name: "To Do" },
    { id: "list2", name: "In Progress" },
    { id: "list3", name: "Done" },
  ],
  cards: [
    {
      name: "Fix login bug",
      desc: "Auth is broken",
      idList: "list1",
      labels: [{ name: "bug" }, { name: "frontend" }],
      due: "2026-04-01T00:00:00.000Z",
    },
    {
      name: "Add dark mode",
      desc: "",
      idList: "list2",
      labels: [],
      due: null,
    },
    {
      name: "Deploy v2",
      desc: "Ship it",
      idList: "list3",
      labels: [{ name: "release" }],
      due: "2026-05-01T00:00:00.000Z",
    },
  ],
};

describe("parseTrelloExport", () => {
  it("parses a valid Trello export into correct ParsedBoard", () => {
    const result = parseTrelloExport(validTrelloExport);

    expect(result.name).toBe("My Trello Board");
    expect(result.description).toBe("A test board");
    expect(result.lists).toHaveLength(3);

    expect(result.lists[0].title).toBe("To Do");
    expect(result.lists[0].position).toBe(1);
    expect(result.lists[0].cards).toHaveLength(1);
    expect(result.lists[0].cards[0].title).toBe("Fix login bug");
    expect(result.lists[0].cards[0].description).toBe("Auth is broken");
    expect(result.lists[0].cards[0].priority).toBe("NONE");
    expect(result.lists[0].cards[0].labels).toEqual(["bug", "frontend"]);
    expect(result.lists[0].cards[0].dueDate).toBe("2026-04-01T00:00:00.000Z");

    expect(result.lists[1].title).toBe("In Progress");
    expect(result.lists[1].cards).toHaveLength(1);
    expect(result.lists[1].cards[0].title).toBe("Add dark mode");
    expect(result.lists[1].cards[0].description).toBeNull();

    expect(result.lists[2].title).toBe("Done");
    expect(result.lists[2].cards).toHaveLength(1);
  });

  it("throws for non-object input", () => {
    expect(() => parseTrelloExport(null)).toThrow("expected a JSON object");
    expect(() => parseTrelloExport("string")).toThrow("expected a JSON object");
    expect(() => parseTrelloExport(42)).toThrow("expected a JSON object");
  });

  it("throws for missing board name", () => {
    expect(() => parseTrelloExport({ desc: "no name" })).toThrow(
      "missing board name",
    );
    expect(() => parseTrelloExport({ name: "" })).toThrow("missing board name");
  });

  it("handles empty board with no cards", () => {
    const result = parseTrelloExport({
      name: "Empty Board",
      lists: [{ id: "list1", name: "To Do" }],
      cards: [],
    });

    expect(result.name).toBe("Empty Board");
    expect(result.description).toBeNull();
    expect(result.lists).toHaveLength(1);
    expect(result.lists[0].cards).toHaveLength(0);
  });

  it("handles board with no lists array", () => {
    const result = parseTrelloExport({ name: "No Lists" });
    expect(result.lists).toHaveLength(0);
  });

  it("skips closed/archived lists and cards", () => {
    const result = parseTrelloExport({
      name: "Board",
      lists: [
        { id: "list1", name: "Open", closed: false },
        { id: "list2", name: "Archived", closed: true },
      ],
      cards: [
        { name: "Open Card", idList: "list1" },
        { name: "Closed Card", idList: "list1", closed: true },
        { name: "In Archived List", idList: "list2" },
      ],
    });

    expect(result.lists).toHaveLength(1);
    expect(result.lists[0].title).toBe("Open");
    expect(result.lists[0].cards).toHaveLength(1);
    expect(result.lists[0].cards[0].title).toBe("Open Card");
  });

  it("defaults card fields when missing", () => {
    const result = parseTrelloExport({
      name: "Board",
      lists: [{ id: "list1", name: "To Do" }],
      cards: [{ idList: "list1" }],
    });

    const card = result.lists[0].cards[0];
    expect(card.title).toBe("Untitled");
    expect(card.description).toBeNull();
    expect(card.priority).toBe("NONE");
    expect(card.labels).toEqual([]);
    expect(card.dueDate).toBeNull();
  });

  it("filters out labels with empty names", () => {
    const result = parseTrelloExport({
      name: "Board",
      lists: [{ id: "list1", name: "To Do" }],
      cards: [
        {
          name: "Card",
          idList: "list1",
          labels: [{ name: "bug" }, { name: "" }, { name: "  " }, {}],
        },
      ],
    });

    expect(result.lists[0].cards[0].labels).toEqual(["bug"]);
  });

  it("assigns sequential positions to cards", () => {
    const result = parseTrelloExport({
      name: "Board",
      lists: [{ id: "list1", name: "To Do" }],
      cards: [
        { name: "First", idList: "list1" },
        { name: "Second", idList: "list1" },
        { name: "Third", idList: "list1" },
      ],
    });

    expect(result.lists[0].cards[0].position).toBe(1);
    expect(result.lists[0].cards[1].position).toBe(2);
    expect(result.lists[0].cards[2].position).toBe(3);
  });
});
