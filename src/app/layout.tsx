import type { Metadata } from "next";
import { RouteTransition } from "@/components/layout/RouteTransition";
import "@/styles/globals.css";

const fallbackSiteUrl = "https://shortcutting.xyz";

// Resolved from build-time config only. Reading request headers here would opt every
// route under this layout into dynamic rendering, so the whole site would be
// server-rendered on demand instead of served as prerendered HTML from the CDN.
function resolveSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.NETLIFY ? process.env.URL : undefined)
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
    ?? (process.env.NODE_ENV === "development" ? "http://localhost:3000" : fallbackSiteUrl);
}

export function generateMetadata(): Metadata {
  const siteUrl = resolveSiteUrl();

  return {
  metadataBase: new URL(siteUrl),
  applicationName: "shortcutting",
  title: "shortcutting",
  description: "Match the target text as fast as possible.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml", sizes: "32x32" },
      { url: "/favicon-16.svg", type: "image/svg+xml", sizes: "16x16" },
    ],
    shortcut: "/favicon.svg",
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
  openGraph: {
    title: "shortcutting",
    description: "Match the target text as fast as possible.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "shortcutting - don't touch that mouse",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "shortcutting",
    description: "Match the target text as fast as possible.",
    images: ["/og-image.png"],
  },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <RouteTransition>{children}</RouteTransition>
      </body>
    </html>
  );
}
