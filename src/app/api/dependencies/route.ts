import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Get all dependencies with task and team info
  const dependencies = db
    .prepare(`
      SELECT
        d.id,
        d.task_id,
        d.depends_on_task_id,
        t1.deliverable as task_deliverable,
        t1.status as task_status,
        t1.priority as task_priority,
        t1.team_id as task_team_id,
        team1.name as task_team_name,
        team1.slug as task_team_slug,
        t2.deliverable as dep_deliverable,
        t2.status as dep_status,
        t2.priority as dep_priority,
        t2.team_id as dep_team_id,
        team2.name as dep_team_name,
        team2.slug as dep_team_slug
      FROM task_dependencies d
      JOIN tasks t1 ON d.task_id = t1.id
      JOIN tasks t2 ON d.depends_on_task_id = t2.id
      JOIN teams team1 ON t1.team_id = team1.id
      JOIN teams team2 ON t2.team_id = team2.id
      ORDER BY d.created_at DESC
    `)
    .all();

  return NextResponse.json({ dependencies });
}

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { task_id, depends_on_task_id } = await req.json();

  if (!task_id || !depends_on_task_id) {
    return NextResponse.json({ error: "task_id and depends_on_task_id are required" }, { status: 400 });
  }

  if (task_id === depends_on_task_id) {
    return NextResponse.json({ error: "A task cannot depend on itself" }, { status: 400 });
  }

  const db = getDb();

  // Verify both tasks exist
  const t1 = db.prepare("SELECT id FROM tasks WHERE id = ?").get(Number(task_id));
  const t2 = db.prepare("SELECT id FROM tasks WHERE id = ?").get(Number(depends_on_task_id));
  if (!t1 || !t2) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  try {
    db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(
      Number(task_id),
      Number(depends_on_task_id)
    );
  } catch (e: any) {
    if (e.message?.includes("UNIQUE")) {
      return NextResponse.json({ error: "Dependency already exists" }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { task_id, depends_on_task_id } = await req.json();

  const db = getDb();
  db.prepare("DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?").run(
    Number(task_id),
    Number(depends_on_task_id)
  );

  return NextResponse.json({ ok: true });
}
