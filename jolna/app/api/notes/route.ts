import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

type NoteRow = RowDataPacket & {
  id: number;
  content: string;
  created_at: string;
};

async function ensureNotesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS notes (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function GET() {
  try {
    await ensureNotesTable();

    const [rows] = await query<NoteRow[]>(
      "SELECT id, content, created_at FROM notes ORDER BY id DESC",
    );

    return NextResponse.json({ notes: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureNotesTable();

    const body = await request.json();
    const content =
      typeof body?.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 },
      );
    }

    const [result] = await query<ResultSetHeader>(
      "INSERT INTO notes (content) VALUES (?)",
      [content],
    );

    const [rows] = await query<NoteRow[]>(
      "SELECT id, content, created_at FROM notes WHERE id = ? LIMIT 1",
      [result.insertId],
    );

    return NextResponse.json({ note: rows[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
