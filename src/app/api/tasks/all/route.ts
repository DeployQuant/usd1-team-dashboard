import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb } from "@/lib/db";

// Lightweight endpoint returning minimal task info for dependency linking
export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const tasks = db
    .prepare(`
      SELECT t.id, t.deliverable, t.status, t.priority, team.name as team_name, team.slug as team_slug
      FROM tasks t
      JOIN teams team ON t.team_id = team.id
      ORDER BY team.name, t.id
    `)
    .all();

  return NextResponse.json({ tasks });
}
