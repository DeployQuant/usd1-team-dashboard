import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  const comments = db
    .prepare("SELECT * FROM comments WHERE task_id = ? ORDER BY created_at DESC")
    .all(Number(id));

  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { content } = await req.json();

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const db = getDb();

  const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(Number(id));
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const result = db
    .prepare("INSERT INTO comments (task_id, team_name, team_slug, content) VALUES (?, ?, ?, ?)")
    .run(Number(id), session.teamName || "Unknown", session.teamSlug || "unknown", content.trim());

  const comment = db.prepare("SELECT * FROM comments WHERE id = ?").get(result.lastInsertRowid);

  return NextResponse.json({ comment }, { status: 201 });
}
