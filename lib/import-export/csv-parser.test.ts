import { describe, it, expect } from "vitest";
import { parseCsvImport } from "./csv-parser";

describe("parseCsvImport", () => {
  it("parses valid CSV into correct ParsedBoard", () => {
    const csv = `Title,Description,List,Priority,Labels,Due Date
"Fix login","Auth is broken","To Do","HIGH","bug,frontend","2026-04-01"
"Add dark mode","Theme support","In Progress","LOW","ui","2026-05-01"
"Deploy v2","Ship it","Done","URGENT","release","2026-06-01"`;

    const result = parseCsvImport(csv);

    expect(result.name).toBe("Imported Board");
    expect(result.lists).toHaveLength(3);

    const todo = result.lists.find((l) => l.title === "To Do");
    expect(todo).toBeDefined();
    expect(todo!.cards).toHaveLength(1);
    expect(todo!.cards[0].title).toBe("Fix login");
    expect(todo!.cards[0].description).toBe("Auth is broken");
    expect(todo!.cards[0].priority).toBe("HIGH");
    expect(todo!.cards[0].labels).toEqual(["bug", "frontend"]);
    expect(todo!.cards[0].dueDate).toBe("2026-04-01");
  });

  it("handles empty CSV", () => {
    const result = parseCsvImport("");
    expect(result.lists).toHaveLength(0);
  });

  it("handles CSV with only headers", () => {
    const result = parseCsvImport("Title,Description,List,Priority,Labels,Due Date\n");
    expect(result.lists).toHaveLength(0);
  });

  it("handles quoted fields with commas inside", () => {
    const csv = `Title,Description,List,Priority,Labels,Due Date
"Fix, login and signup","Auth, is broken","To Do","HIGH","bug,frontend","2026-04-01"`;

    const result = parseCsvImport(csv);
    expect(result.lists[0].cards[0].title).toBe("Fix, login and signup");
    expect(result.lists[0].cards[0].description).toBe("Auth, is broken");
  });

  it("handles escaped quotes in fields", () => {
    const csv = `Title,Description,List,Priority,Labels,Due Date
"Fix ""login"" bug","He said ""hello""","To Do","HIGH","bug","2026-04-01"`;

    const result = parseCsvImport(csv);
    expect(result.lists[0].cards[0].title).toBe('Fix "login" bug');
    expect(result.lists[0].cards[0].description).toBe('He said "hello"');
  });

  it("defaults missing list to 'Imported'", () => {
    const csv = `Title,Description
"Some task","Description"`;

    const result = parseCsvImport(csv);
    expect(result.lists[0].title).toBe("Imported");
  });

  it("defaults invalid priority to NONE", () => {
    const csv = `Title,List,Priority
"Task 1","To Do","INVALID"
"Task 2","To Do","high"
"Task 3","To Do",""`;

    const result = parseCsvImport(csv);
    const cards = result.lists[0].cards;
    expect(cards[0].priority).toBe("NONE");
    expect(cards[1].priority).toBe("HIGH");
    expect(cards[2].priority).toBe("NONE");
  });

  it("skips rows with no title", () => {
    const csv = `Title,Description,List
"Valid task","desc","To Do"
,"empty title","To Do"
"","also empty","To Do"
"Another valid","desc2","To Do"`;

    const result = parseCsvImport(csv);
    expect(result.lists[0].cards).toHaveLength(2);
    expect(result.lists[0].cards[0].title).toBe("Valid task");
    expect(result.lists[0].cards[1].title).toBe("Another valid");
  });

  it("groups cards by list column", () => {
    const csv = `Title,List
"Task 1","To Do"
"Task 2","In Progress"
"Task 3","To Do"`;

    const result = parseCsvImport(csv);
    expect(result.lists).toHaveLength(2);

    const todo = result.lists.find((l) => l.title === "To Do");
    expect(todo!.cards).toHaveLength(2);

    const inProgress = result.lists.find((l) => l.title === "In Progress");
    expect(inProgress!.cards).toHaveLength(1);
  });

  it("handles missing columns gracefully", () => {
    const csv = `Title
"Just a title"`;

    const result = parseCsvImport(csv);
    const card = result.lists[0].cards[0];
    expect(card.title).toBe("Just a title");
    expect(card.description).toBeNull();
    expect(card.priority).toBe("NONE");
    expect(card.labels).toEqual([]);
    expect(card.dueDate).toBeNull();
  });

  it("handles CRLF line endings", () => {
    const csv = "Title,List\r\n\"Task 1\",\"To Do\"\r\n\"Task 2\",\"Done\"";

    const result = parseCsvImport(csv);
    expect(result.lists).toHaveLength(2);
  });

  it("assigns sequential positions within each list", () => {
    const csv = `Title,List
"First","To Do"
"Second","To Do"
"Third","To Do"`;

    const result = parseCsvImport(csv);
    expect(result.lists[0].cards[0].position).toBe(1);
    expect(result.lists[0].cards[1].position).toBe(2);
    expect(result.lists[0].cards[2].position).toBe(3);
  });
});
