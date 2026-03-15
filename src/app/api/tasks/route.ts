import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb } from "@/lib/db";

function enrichTasks(db: any, tasks: any[]) {
  // Add comment counts and department-level dependency info to each task
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

  if (session.teamSlug === "leadership") {
    // Leadership sees all teams or a specific team
    if (teamSlug && teamSlug !== "leadership") {
      const team = db.prepare("SELECT id FROM teams WHERE slug = ?").get(teamSlug) as any;
      if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
      const tasks = db.prepare("SELECT * FROM tasks WHERE team_id = ? ORDER BY id").all(team.id);
      return NextResponse.json({ tasks: enrichTasks(db, tasks) });
    }
    // All tasks grouped
    const teams = db.prepare("SELECT id, name, slug, pillar, description FROM teams WHERE slug != 'leadership'").all();
    const allData = (teams as any[]).map((team: any) => {
      const tasks = db.prepare("SELECT * FROM tasks WHERE team_id = ? ORDER BY id").all(team.id);
      return { ...team, tasks: enrichTasks(db, tasks) };
    });
    return NextResponse.json({ teams: allData });
  }

  // Regular team sees only their tasks
  const tasks = db.prepare("SELECT * FROM tasks WHERE team_id = ? ORDER BY id").all(session.teamId);
  return NextResponse.json({ tasks: enrichTasks(db, tasks) });
}
