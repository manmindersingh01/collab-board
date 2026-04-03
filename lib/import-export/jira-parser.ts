import type { ParsedBoard, ParsedCard } from "./types";

const JIRA_PRIORITY_MAP: Record<string, string> = {
  HIGHEST: "URGENT",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  LOWEST: "NONE",
};

/**
 * Parse CSV rows (same logic as csv-parser but inlined to avoid coupling).
 */
function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current.trim());
        current = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && i + 1 < csv.length && csv[i + 1] === "\n") {
          i++;
        }
        row.push(current.trim());
        if (row.some((cell) => cell !== "")) {
          rows.push(row);
        }
        row = [];
        current = "";
      } else {
        current += ch;
      }
    }
  }

  row.push(current.trim());
  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  return rows;
}

function mapJiraPriority(value: string): string {
  const upper = value.toUpperCase().trim();
  return JIRA_PRIORITY_MAP[upper] ?? "NONE";
}

export function parseJiraExport(csvString: string): ParsedBoard {
  const rows = parseCsvRows(csvString);
  if (rows.length === 0) {
    return { name: "Imported from Jira", description: null, lists: [] };
  }

  const headers = rows[0].map((h) => h.toLowerCase());
  const summaryIdx = headers.indexOf("summary");
  const descIdx = headers.indexOf("description");
  const statusIdx = headers.indexOf("status");
  const priorityIdx = headers.indexOf("priority");
  const labelsIdx = headers.indexOf("labels");
  const dueDateIdx = headers.indexOf("due date");

  const listCards = new Map<string, ParsedCard[]>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const title = (summaryIdx >= 0 ? row[summaryIdx] : "")?.trim();
    if (!title) continue;

    const listName =
      (statusIdx >= 0 ? row[statusIdx] : "")?.trim() || "To Do";
    const description =
      (descIdx >= 0 ? row[descIdx] : "")?.trim() || null;
    const priority = mapJiraPriority(
      priorityIdx >= 0 ? row[priorityIdx] ?? "" : "",
    );
    // Jira uses semicolons for multi-value labels
    const labelsRaw = (labelsIdx >= 0 ? row[labelsIdx] : "")?.trim() ?? "";
    const labels = labelsRaw
      ? labelsRaw.split(";").map((l) => l.trim()).filter(Boolean)
      : [];
    const dueDateRaw =
      (dueDateIdx >= 0 ? row[dueDateIdx] : "")?.trim() || null;
    const dueDate = dueDateRaw || null;

    const existing = listCards.get(listName) ?? [];
    existing.push({
      title,
      description,
      priority,
      labels,
      dueDate,
      position: existing.length + 1,
    });
    listCards.set(listName, existing);
  }

  let pos = 1;
  const lists = Array.from(listCards.entries()).map(([name, cards]) => ({
    title: name,
    position: pos++,
    cards,
  }));

  return {
    name: "Imported from Jira",
    description: null,
    lists,
  };
}
