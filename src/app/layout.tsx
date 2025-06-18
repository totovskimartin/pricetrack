import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "PriceTrack България",
  description: "Следете цените на продуктите преди преминаването към Евро",
  manifest: "/bg/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PriceTrack BG",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "PriceTrack България",
    title: "PriceTrack България",
    description: "Следете цените на продуктите преди преминаването към Евро",
  },
  twitter: {
    card: "summary",
    title: "PriceTrack България",
    description: "Следете цените на продуктите преди преминаването към Евро",
  },

  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "PriceTrack BG",
    "application-name": "PriceTrack BG",
    "msapplication-TileColor": "#2563eb",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1e40af" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
