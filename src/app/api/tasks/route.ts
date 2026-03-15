import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb, auditLog } from "@/lib/db";

function enrichTasks(db: any, tasks: any[]) {
  const commentCountStmt = db.prepare("SELECT COUNT(*) as cnt FROM comments WHERE task_id = ?");
  const deptDepsStmt = db.prepare(`
    SELECT d.depends_on_team_slug, d.note, team.name as team_name
    FROM dept_dependencies d
    JOIN teams team ON d.depends_on_team_slug = team.slug
    WHERE d.task_id = ?
  `);

  return tasks.map((task: any) => ({
    ...task,
    comment_count: (commentCountStmt.get(task.id) as any).cnt,
    dept_dependencies: deptDepsStmt.all(task.id),
  }));
}

export async function GET(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const teamSlug = req.nextUrl.searchParams.get("team");

  // Check if user is on leadership team
  const isLeadership = session.activeTeamSlug === "leadership";

  if (isLeadership) {
    if (teamSlug && teamSlug !== "leadership") {
      const team = db.prepare("SELECT id FROM teams WHERE slug = ?").get(teamSlug) as any;
      if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
      const tasks = db.prepare("SELECT * FROM tasks WHERE team_id = ? ORDER BY id").all(team.id);
      return NextResponse.json({ tasks: enrichTasks(db, tasks) });
    }
    const teams = db.prepare("SELECT id, name, slug, pillar, description FROM teams WHERE slug != 'leadership'").all();
    const allData = (teams as any[]).map((team: any) => {
      const tasks = db.prepare("SELECT * FROM tasks WHERE team_id = ? ORDER BY id").all(team.id);
      return { ...team, tasks: enrichTasks(db, tasks) };
    });
    return NextResponse.json({ teams: allData });
  }

  // Regular team sees only their tasks
  const tasks = db.prepare("SELECT * FROM tasks WHERE team_id = ? ORDER BY id").all(session.activeTeamId);
  return NextResponse.json({ tasks: enrichTasks(db, tasks) });
}

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { deliverable, workstream, status, owner, priority, due_date, notes, category, team_slug } = body;

  if (!deliverable || !deliverable.trim()) {
    return NextResponse.json({ error: "Task name is required" }, { status: 400 });
  }

  const db = getDb();
  const isLeadership = session.activeTeamSlug === "leadership";

  // Determine target team
  let teamId: number;
  if (isLeadership && team_slug) {
    const team = db.prepare("SELECT id FROM teams WHERE slug = ?").get(team_slug) as any;
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    teamId = team.id;
  } else {
    teamId = session.activeTeamId!;
  }

  const result = db.prepare(
    "INSERT INTO tasks (team_id, deliverable, workstream, status, owner, priority, due_date, notes, category, created_by_leadership) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    teamId,
    deliverable.trim(),
    workstream || "",
    status || "OPEN",
    owner || "",
    priority || "MEDIUM",
    due_date || null,
    notes || "",
    category || "",
    isLeadership ? 1 : 0
  );

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);

  auditLog(db, session.userId!, session.userName || "Unknown", "task_create", {
    taskId: result.lastInsertRowid,
    deliverable: deliverable.trim(),
    teamId,
    priority: priority || "MEDIUM",
    createdByLeadership: isLeadership,
  }, "task", result.lastInsertRowid as number);

  return NextResponse.json({ task: { ...(task as any), comment_count: 0, dept_dependencies: [] } }, { status: 201 });
}
