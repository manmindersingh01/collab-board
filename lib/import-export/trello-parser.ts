import type { ParsedBoard, ParsedCard } from "./types";

interface TrelloLabel {
  name?: string;
}

interface TrelloCard {
  name?: string;
  desc?: string;
  idList?: string;
  labels?: TrelloLabel[];
  due?: string | null;
  closed?: boolean;
}

interface TrelloList {
  id?: string;
  name?: string;
  closed?: boolean;
}

interface TrelloExport {
  name?: string;
  desc?: string;
  lists?: TrelloList[];
  cards?: TrelloCard[];
}

export function parseTrelloExport(json: unknown): ParsedBoard {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid Trello export: expected a JSON object");
  }

  const data = json as TrelloExport;

  if (!data.name || typeof data.name !== "string") {
    throw new Error("Invalid Trello export: missing board name");
  }

  const lists = Array.isArray(data.lists) ? data.lists : [];
  const cards = Array.isArray(data.cards) ? data.cards : [];

  // Build a map from list id → list name (skip closed/archived lists)
  const listMap = new Map<string, { name: string; position: number }>();
  let pos = 1;
  for (const list of lists) {
    if (list.closed) continue;
    if (list.id && list.name) {
      listMap.set(list.id, { name: list.name, position: pos++ });
    }
  }

  // Group cards by list id
  const cardsByList = new Map<string, ParsedCard[]>();
  for (const card of cards) {
    if (card.closed) continue;
    const listId = card.idList;
    if (!listId || !listMap.has(listId)) continue;

    const existing = cardsByList.get(listId) ?? [];
    existing.push({
      title: card.name?.trim() || "Untitled",
      description: card.desc?.trim() || null,
      priority: "NONE",
      labels: (card.labels ?? [])
        .map((l) => l.name?.trim())
        .filter((n): n is string => !!n),
      dueDate: card.due ?? null,
      position: existing.length + 1,
    });
    cardsByList.set(listId, existing);
  }

  // Build the parsed board
  const parsedLists = Array.from(listMap.entries()).map(
    ([listId, { name, position }]) => ({
      title: name,
      position,
      cards: cardsByList.get(listId) ?? [],
    }),
  );

  return {
    name: data.name,
    description: data.desc?.trim() || null,
    lists: parsedLists,
  };
}
