export interface ParsedCard {
  title: string;
  description: string | null;
  priority: string;
  labels: string[];
  dueDate: string | null;
  position: number;
}

export interface ParsedList {
  title: string;
  position: number;
  cards: ParsedCard[];
}

export interface ParsedBoard {
  name: string;
  description: string | null;
  lists: ParsedList[];
}

export interface BoardExportCard {
  title: string;
  description: string | null;
  priority: string;
  labels: string[];
  dueDate: string | null;
  assignee: string | null;
}

export interface BoardExportList {
  title: string;
  cards: BoardExportCard[];
}

export interface BoardExport {
  board: {
    name: string;
    description: string | null;
  };
  lists: BoardExportList[];
}
