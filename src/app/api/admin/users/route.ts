import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb, auditLog } from "@/lib/db";

function requireLeadership(session: SessionData) {
  if (!session.isLoggedIn || session.activeTeamSlug !== "leadership") {
    return false;
  }
  return true;
}

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!requireLeadership(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.name, u.display_name, u.must_change_password, u.created_at
    FROM users u
    ORDER BY u.id
  `).all() as any[];

  const userTeams = db.prepare(`
    SELECT ut.user_id, t.slug, t.name
    FROM user_teams ut
    JOIN teams t ON ut.team_id = t.id
  `).all() as any[];

  const teamsMap: Record<number, { slug: string; name: string }[]> = {};
  for (const ut of userTeams) {
    if (!teamsMap[ut.user_id]) teamsMap[ut.user_id] = [];
    teamsMap[ut.user_id].push({ slug: ut.slug, name: ut.name });
  }

  const result = users.map((u) => ({
    ...u,
    teams: teamsMap[u.id] || [],
  }));

  return NextResponse.json({ users: result });
}

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!requireLeadership(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, displayName, password, teamSlugs } = await req.json();

  if (!username || !displayName || !password || !teamSlugs?.length) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const db = getDb();

  const existing = db.prepare("SELECT id FROM users WHERE name = ?").get(username.toLowerCase().trim());
  if (existing) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const hash = bcryptjs.hashSync(password, 10);
  const result = db.prepare(
    "INSERT INTO users (name, display_name, password_hash, must_change_password) VALUES (?, ?, ?, 1)"
  ).run(username.toLowerCase().trim(), displayName, hash);

  const userId = result.lastInsertRowid as number;
  const insertTeam = db.prepare("INSERT INTO user_teams (user_id, team_id) VALUES (?, (SELECT id FROM teams WHERE slug = ?))");
  for (const slug of teamSlugs) {
    insertTeam.run(userId, slug);
  }

  auditLog(db, session.userId!, session.userName || "Admin", "user_create", {
    newUser: username,
    teams: teamSlugs,
  });

  return NextResponse.json({ success: true, userId }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!requireLeadership(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, action } = await req.json();

  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  const db = getDb();

  if (action === "reset_password") {
    const tempPassword = "Wlfi-Reset!24";
    const hash = bcryptjs.hashSync(tempPassword, 10);
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?").run(hash, userId);

    auditLog(db, session.userId!, session.userName || "Admin", "password_reset", { targetUserId: userId });

    return NextResponse.json({ success: true, tempPassword });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
