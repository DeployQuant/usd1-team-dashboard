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

  if (teamSlug) {
    // Get members for a specific team
    const members = db.prepare(`
      SELECT u.id, u.display_name
      FROM users u
      JOIN user_teams ut ON u.id = ut.user_id
      JOIN teams t ON ut.team_id = t.id
      WHERE t.slug = ?
      ORDER BY u.display_name
    `).all(teamSlug);
    return NextResponse.json({ members });
  }

  // Get all teams with their members
  const teams = db.prepare("SELECT id, name, slug FROM teams WHERE slug != 'leadership' ORDER BY id").all() as any[];
  const result = teams.map((team) => {
    const members = db.prepare(`
      SELECT u.id, u.display_name
      FROM users u
      JOIN user_teams ut ON u.id = ut.user_id
      WHERE ut.team_id = ?
      ORDER BY u.display_name
    `).all(team.id);
    return { ...team, members };
  });

  return NextResponse.json({ teams: result });
}
