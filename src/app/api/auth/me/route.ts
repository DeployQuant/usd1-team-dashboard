import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ loggedIn: false }, { status: 401 });
  }

  const db = getDb();
  const team = db
    .prepare("SELECT id, name, slug, pillar, description FROM teams WHERE id = ?")
    .get(session.teamId) as any;

  return NextResponse.json({ loggedIn: true, team });
}
