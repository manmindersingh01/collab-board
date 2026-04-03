import type { ParsedBoard, ParsedCard } from "./types";

const VALID_PRIORITIES = new Set(["NONE", "LOW", "MEDIUM", "HIGH", "URGENT"]);

/**
 * Parse a CSV string handling quoted fields (RFC 4180-style).
 * Returns an array of string arrays (rows of cells).
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
        // Escaped quote or end of quoted field
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
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
        // Handle \r\n
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

  // Final row
  row.push(current.trim());
  if (row.some((cell) => cell !== "")) {
    rows.push(row);
  }

  return rows;
}

function normalizePriority(value: string): string {
  const upper = value.toUpperCase().trim();
  return VALID_PRIORITIES.has(upper) ? upper : "NONE";
}

export function parseCsvImport(csvString: string): ParsedBoard {
  const rows = parseCsvRows(csvString);
  if (rows.length === 0) {
    return { name: "Imported Board", description: null, lists: [] };
  }

  // First row is headers
  const headers = rows[0].map((h) => h.toLowerCase());
  const titleIdx = headers.indexOf("title");
  const descIdx = headers.indexOf("description");
  const listIdx = headers.indexOf("list");
  const priorityIdx = headers.indexOf("priority");
  const labelsIdx = headers.indexOf("labels");
  const dueDateIdx = headers.indexOf("due date");

  // Group cards by list name
  const listCards = new Map<string, ParsedCard[]>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const title = (titleIdx >= 0 ? row[titleIdx] : "")?.trim();
    if (!title) continue; // skip rows with no title

    const listName =
      (listIdx >= 0 ? row[listIdx] : "")?.trim() || "Imported";
    const description =
      (descIdx >= 0 ? row[descIdx] : "")?.trim() || null;
    const priority = normalizePriority(
      priorityIdx >= 0 ? row[priorityIdx] ?? "" : "",
    );
    const labelsRaw = (labelsIdx >= 0 ? row[labelsIdx] : "")?.trim() ?? "";
    const labels = labelsRaw
      ? labelsRaw.split(",").map((l) => l.trim()).filter(Boolean)
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
    name: "Imported Board",
    description: null,
    lists,
  };
}
