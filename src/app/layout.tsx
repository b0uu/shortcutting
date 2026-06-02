import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "shortcutting",
  description: "Match the target text as fast as possible.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
