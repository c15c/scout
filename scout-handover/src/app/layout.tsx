import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scout",
  description: "A personal discovery agent for your city."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
