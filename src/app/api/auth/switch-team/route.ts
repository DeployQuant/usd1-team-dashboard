import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getDb, auditLog } from "@/lib/db";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamSlug } = await req.json();

  // Verify user belongs to this team
  const team = session.teams?.find((t) => t.slug === teamSlug);
  if (!team) {
    return NextResponse.json({ error: "You are not a member of this team" }, { status: 403 });
  }

  session.activeTeamSlug = team.slug;
  session.activeTeamId = team.id;
  session.activeTeamName = team.name;
  await session.save();

  const db = getDb();
  auditLog(db, session.userId, session.userName || "Unknown", "switch_team", { teamSlug });

  return NextResponse.json({ success: true, activeTeam: team });
}
