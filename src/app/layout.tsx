import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WLFI USD1 | Executive Dashboard",
  description: "World Liberty Financial — USD1 Strategic Operations Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
