import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb } from "@/lib/db";

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
      return NextResponse.json({ tasks });
    }
    // All tasks grouped
    const teams = db.prepare("SELECT id, name, slug, pillar, description FROM teams WHERE slug != 'leadership'").all();
    const allData = (teams as any[]).map((team: any) => {
      const tasks = db.prepare("SELECT * FROM tasks WHERE team_id = ? ORDER BY id").all(team.id);
      return { ...team, tasks };
    });
    return NextResponse.json({ teams: allData });
  }

  // Regular team sees only their tasks
  const tasks = db.prepare("SELECT * FROM tasks WHERE team_id = ? ORDER BY id").all(session.teamId);
  return NextResponse.json({ tasks });
}
