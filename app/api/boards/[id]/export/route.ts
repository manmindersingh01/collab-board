import prisma from "@/lib/prisma";
import { getDbUser } from "@/lib/user";
import { NextResponse } from "next/server";
import { exportBoardAsJson, exportBoardAsCsv } from "@/lib/import-export/export";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getDbUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: boardId } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  if (!format || !["json", "csv"].includes(format)) {
    return NextResponse.json(
      { error: "format must be 'json' or 'csv'" },
      { status: 400 },
    );
  }

  // Verify membership
  const membership = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId: user.id } },
  });

  if (!membership) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    if (format === "json") {
      const data = await exportBoardAsJson(boardId);
      return NextResponse.json(data);
    }

    const csv = await exportBoardAsCsv(boardId);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="board-export.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
