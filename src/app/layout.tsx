import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WLFI USD1 Team Dashboard",
  description: "Internal team dashboard for USD1 Strategic Dominance Roadmap",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
