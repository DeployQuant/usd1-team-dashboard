import { SessionOptions } from "iron-session";

export interface TeamInfo {
  id: number;
  slug: string;
  name: string;
}

export interface SessionData {
  userId?: number;
  userName?: string;
  teams?: TeamInfo[];
  activeTeamSlug?: string;
  activeTeamId?: number;
  activeTeamName?: string;
  isLoggedIn?: boolean;
  mustChangePassword?: boolean;
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    "wlfi-usd1-dashboard-secret-key-change-in-production-2026",
  cookieName: "wlfi-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24, // 24 hours
  },
};
