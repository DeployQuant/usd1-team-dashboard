import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb } from "@/lib/db";

// GET all department-level dependencies (for leadership view)
export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const dependencies = db
    .prepare(`
      SELECT
        d.id,
        d.task_id,
        d.depends_on_team_slug,
        d.note,
        d.created_at,
        t.deliverable as task_deliverable,
        t.status as task_status,
        t.priority as task_priority,
        src_team.name as task_team_name,
        src_team.slug as task_team_slug,
        dep_team.name as dep_team_name
      FROM dept_dependencies d
      JOIN tasks t ON d.task_id = t.id
      JOIN teams src_team ON t.team_id = src_team.id
      JOIN teams dep_team ON d.depends_on_team_slug = dep_team.slug
      ORDER BY d.created_at DESC
    `)
    .all();

  return NextResponse.json({ dependencies });
}

// POST: add a department dependency to a task
export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { task_id, depends_on_team_slug, note } = await req.json();

  if (!task_id || !depends_on_team_slug) {
    return NextResponse.json({ error: "task_id and depends_on_team_slug are required" }, { status: 400 });
  }

  const db = getDb();

  // Verify task exists
  const task = db.prepare("SELECT id, team_id FROM tasks WHERE id = ?").get(Number(task_id)) as any;
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Verify target team exists
  const team = db.prepare("SELECT slug FROM teams WHERE slug = ?").get(depends_on_team_slug) as any;
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  // Prevent self-dependency (task's own team)
  const taskTeam = db.prepare("SELECT slug FROM teams WHERE id = ?").get(task.team_id) as any;
  if (taskTeam?.slug === depends_on_team_slug) {
    return NextResponse.json({ error: "Cannot depend on own team" }, { status: 400 });
  }

  try {
    db.prepare(
      "INSERT INTO dept_dependencies (task_id, depends_on_team_slug, note) VALUES (?, ?, ?)"
    ).run(Number(task_id), depends_on_team_slug, note || "");
  } catch (e: any) {
    if (e.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "Dependency already exists" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE: remove a department dependency
export async function DELETE(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { task_id, depends_on_team_slug } = await req.json();

  const db = getDb();
  db.prepare(
    "DELETE FROM dept_dependencies WHERE task_id = ? AND depends_on_team_slug = ?"
  ).run(Number(task_id), depends_on_team_slug);

  return NextResponse.json({ ok: true });
}
