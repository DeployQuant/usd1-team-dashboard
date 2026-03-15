import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";
import { getDb, auditLog } from "@/lib/db";
import { SessionData, TeamInfo, sessionOptions } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE name = ?").get(username.toLowerCase().trim()) as any;

  if (!user) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const valid = bcryptjs.compareSync(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  // Get user's teams
  const userTeams = db.prepare(`
    SELECT t.id, t.slug, t.name
    FROM user_teams ut
    JOIN teams t ON ut.team_id = t.id
    WHERE ut.user_id = ?
    ORDER BY t.id
  `).all(user.id) as TeamInfo[];

  if (userTeams.length === 0) {
    return NextResponse.json({ error: "User has no team assignments" }, { status: 403 });
  }

  // Default to first team
  const defaultTeam = userTeams[0];

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.userId = user.id;
  session.userName = user.display_name;
  session.teams = userTeams;
  session.activeTeamSlug = defaultTeam.slug;
  session.activeTeamId = defaultTeam.id;
  session.activeTeamName = defaultTeam.name;
  session.isLoggedIn = true;
  session.mustChangePassword = user.must_change_password === 1;
  await session.save();

  auditLog(db, user.id, user.display_name, "login", { ip: req.headers.get("x-forwarded-for") || "unknown" });

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.display_name,
      teams: userTeams,
      activeTeam: defaultTeam,
      mustChangePassword: user.must_change_password === 1,
    },
  });
}
