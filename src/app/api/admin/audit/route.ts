import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.isLoggedIn || session.activeTeamSlug !== "leadership") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const format = req.nextUrl.searchParams.get("format");
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 200;

  const logs = db.prepare(
    "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?"
  ).all(limit) as any[];

  if (format === "csv") {
    const header = "ID,Timestamp,User ID,User Name,Action,Details,Target Type,Target ID";
    const rows = logs.map((l) =>
      `${l.id},"${l.created_at}",${l.user_id},"${l.user_name}","${l.action_type}","${(l.details || '').replace(/"/g, '""')}","${l.target_type || ''}",${l.target_id || ''}`
    );
    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({ logs });
}
