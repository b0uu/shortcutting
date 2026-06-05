import type { Metadata } from "next";
import { headers } from "next/headers";
import { RouteTransition } from "@/components/layout/RouteTransition";
import "@/styles/globals.css";

function configuredSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
}

async function resolveSiteUrl() {
  const configured = configuredSiteUrl();
  if (configured) return configured;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return "http://localhost:3000";

  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await resolveSiteUrl();

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
