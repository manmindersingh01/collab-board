import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";
import { parseTrelloExport } from "@/lib/import-export/trello-parser";
import { parseCsvImport } from "@/lib/import-export/csv-parser";
import { parseJiraExport } from "@/lib/import-export/jira-parser";
import { importBoard } from "@/lib/import-export/import";
import type { ParsedBoard } from "@/lib/import-export/types";

const VALID_FORMATS = ["trello", "csv", "jira"] as const;
type ImportFormat = (typeof VALID_FORMATS)[number];

export async function POST(req: Request) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "expected multipart form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const format = formData.get("format") as string | null;

  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "file is required" },
      { status: 400 },
    );
  }

  if (!format || !VALID_FORMATS.includes(format as ImportFormat)) {
    return NextResponse.json(
      { error: "format must be 'trello', 'csv', or 'jira'" },
      { status: 400 },
    );
  }

  const content = await file.text();
  let parsed: ParsedBoard;

  try {
    switch (format as ImportFormat) {
      case "trello": {
        const json = JSON.parse(content);
        parsed = parseTrelloExport(json);
        break;
      }
      case "csv":
        parsed = parseCsvImport(content);
        break;
      case "jira":
        parsed = parseJiraExport(content);
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse file";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  try {
    const result = await importBoard(parsed, user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
