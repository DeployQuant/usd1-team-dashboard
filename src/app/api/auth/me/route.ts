import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "@/lib/session";

export async function GET() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.json({ loggedIn: false }, { status: 401 });
  }

  return NextResponse.json({
    loggedIn: true,
    user: {
      id: session.userId,
      name: session.userName,
      teams: session.teams || [],
      activeTeam: {
        id: session.activeTeamId,
        slug: session.activeTeamSlug,
        name: session.activeTeamName,
      },
      mustChangePassword: session.mustChangePassword || false,
    },
  });
}
