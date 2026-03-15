import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcryptjs from "bcryptjs";
import { getDb, auditLog } from "@/lib/db";
import { SessionData, sessionOptions } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newPassword } = await req.json();

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const db = getDb();
  const hash = bcryptjs.hashSync(newPassword, 10);

  db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(hash, session.userId);

  session.mustChangePassword = false;
  await session.save();

  auditLog(db, session.userId, session.userName || "Unknown", "password_change", {});

  return NextResponse.json({ success: true });
}
