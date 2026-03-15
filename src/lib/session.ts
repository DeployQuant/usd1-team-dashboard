import { SessionOptions } from "iron-session";

export interface SessionData {
  teamId?: number;
  teamSlug?: string;
  teamName?: string;
  isLoggedIn?: boolean;
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
