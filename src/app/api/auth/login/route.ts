import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";
import { getDb } from "@/lib/db";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { team, password } = await req.json();

  if (!team || !password) {
    return NextResponse.json({ error: "Team and password are required" }, { status: 400 });
  }

  const db = getDb();
  const row = db.prepare("SELECT * FROM teams WHERE slug = ?").get(team) as any;

  if (!row) {
    return NextResponse.json({ error: "Invalid team or password" }, { status: 401 });
  }

  const valid = bcryptjs.compareSync(password, row.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid team or password" }, { status: 401 });
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.teamId = row.id;
  session.teamSlug = row.slug;
  session.teamName = row.name;
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({
    success: true,
    team: { id: row.id, name: row.name, slug: row.slug, pillar: row.pillar },
  });
}
