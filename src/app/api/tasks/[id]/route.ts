import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb, auditLog } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(id)) as any;
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Only allow team members or leadership to update
  if (session.activeTeamSlug !== "leadership") {
    if (task.team_id !== session.activeTeamId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { status, owner, notes } = body;
  const oldStatus = task.status;

  const updates: string[] = [];
  const values: any[] = [];

  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
  }
  if (owner !== undefined) {
    updates.push("owner = ?");
    values.push(owner);
  }
  if (notes !== undefined) {
    updates.push("notes = ?");
    values.push(notes);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(Number(id));

  db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  // Log the update
  if (status && status !== oldStatus) {
    db.prepare(
      "INSERT INTO task_updates (task_id, old_status, new_status, notes, updated_by) VALUES (?, ?, ?, ?, ?)"
    ).run(Number(id), oldStatus, status, notes || "", session.userName || "Unknown");
  }

  auditLog(db, session.userId!, session.userName || "Unknown", "task_update", {
    taskId: Number(id),
    changes: body,
    oldStatus: status && status !== oldStatus ? oldStatus : undefined,
  }, "task", Number(id));

  const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(id));
  return NextResponse.json({ task: updated });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(id)) as any;
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const history = db
    .prepare("SELECT * FROM task_updates WHERE task_id = ? ORDER BY created_at DESC")
    .all(Number(id));

  return NextResponse.json({ task, history });
}
