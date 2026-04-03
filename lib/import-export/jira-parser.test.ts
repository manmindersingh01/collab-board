import { describe, it, expect } from "vitest";
import { parseJiraExport } from "./jira-parser";

describe("parseJiraExport", () => {
  it("parses valid Jira CSV into correct ParsedBoard", () => {
    const csv = `Summary,Description,Status,Priority,Labels,Due Date
"Fix login","Auth broken","In Progress","High","bug;frontend","2026-04-01"
"Add tests","Need coverage","To Do","Medium","testing","2026-05-01"
"Deploy","Ship it","Done","Highest","release;ops","2026-06-01"`;

    const result = parseJiraExport(csv);

    expect(result.name).toBe("Imported from Jira");
    expect(result.lists).toHaveLength(3);

    const inProgress = result.lists.find((l) => l.title === "In Progress");
    expect(inProgress!.cards).toHaveLength(1);
    expect(inProgress!.cards[0].title).toBe("Fix login");
    expect(inProgress!.cards[0].priority).toBe("HIGH");
    expect(inProgress!.cards[0].labels).toEqual(["bug", "frontend"]);
  });

  it("maps Jira priorities correctly", () => {
    const csv = `Summary,Status,Priority
"T1","To Do","Highest"
"T2","To Do","High"
"T3","To Do","Medium"
"T4","To Do","Low"
"T5","To Do","Lowest"`;

    const result = parseJiraExport(csv);
    const cards = result.lists[0].cards;
    expect(cards[0].priority).toBe("URGENT");
    expect(cards[1].priority).toBe("HIGH");
    expect(cards[2].priority).toBe("MEDIUM");
    expect(cards[3].priority).toBe("LOW");
    expect(cards[4].priority).toBe("NONE");
  });

  it("handles empty CSV", () => {
    const result = parseJiraExport("");
    expect(result.lists).toHaveLength(0);
  });

  it("handles semicolon-separated labels", () => {
    const csv = `Summary,Status,Labels
"Task","To Do","bug;frontend;urgent"`;

    const result = parseJiraExport(csv);
    expect(result.lists[0].cards[0].labels).toEqual([
      "bug",
      "frontend",
      "urgent",
    ]);
  });

  it("handles single label (no semicolons)", () => {
    const csv = `Summary,Status,Labels
"Task","To Do","bug"`;

    const result = parseJiraExport(csv);
    expect(result.lists[0].cards[0].labels).toEqual(["bug"]);
  });

  it("defaults missing status to 'To Do'", () => {
    const csv = `Summary,Description
"A task","description"`;

    const result = parseJiraExport(csv);
    expect(result.lists[0].title).toBe("To Do");
  });

  it("defaults unknown priority to NONE", () => {
    const csv = `Summary,Status,Priority
"Task","To Do","Critical"`;

    const result = parseJiraExport(csv);
    expect(result.lists[0].cards[0].priority).toBe("NONE");
  });

  it("skips rows with no summary", () => {
    const csv = `Summary,Status
"Valid","To Do"
,"To Do"
"","To Do"
"Also valid","Done"`;

    const result = parseJiraExport(csv);
    const allCards = result.lists.flatMap((l) => l.cards);
    expect(allCards).toHaveLength(2);
  });

  it("handles quoted fields with commas", () => {
    const csv = `Summary,Description,Status
"Fix, deploy","Auth, broken","In Progress"`;

    const result = parseJiraExport(csv);
    expect(result.lists[0].cards[0].title).toBe("Fix, deploy");
    expect(result.lists[0].cards[0].description).toBe("Auth, broken");
  });

  it("groups cards by status as list name", () => {
    const csv = `Summary,Status
"Task 1","In Progress"
"Task 2","Done"
"Task 3","In Progress"`;

    const result = parseJiraExport(csv);
    expect(result.lists).toHaveLength(2);

    const inProgress = result.lists.find((l) => l.title === "In Progress");
    expect(inProgress!.cards).toHaveLength(2);

    const done = result.lists.find((l) => l.title === "Done");
    expect(done!.cards).toHaveLength(1);
  });

  it("handles missing columns gracefully", () => {
    const csv = `Summary
"Just a title"`;

    const result = parseJiraExport(csv);
    const card = result.lists[0].cards[0];
    expect(card.title).toBe("Just a title");
    expect(card.description).toBeNull();
    expect(card.priority).toBe("NONE");
    expect(card.labels).toEqual([]);
    expect(card.dueDate).toBeNull();
  });
});
