import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bowlby_One_SC } from "next/font/google";
import { series } from "@/content/episodes";
import { AnalyticsBeacon } from "./AnalyticsBeacon";
import "./globals.css";
import { siteUrl } from "./site";

const bodyFont = Atkinson_Hyperlegible({
  variable: "--font-body",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const displayFont = Bowlby_One_SC({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const faviconUrl = new URL("favicon.svg", siteUrl).toString();
const socialImageUrl = new URL("og.png", siteUrl).toString();
const description = series.description;

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Sorry, Tomorrow",
    template: "%s | Sorry, Tomorrow",
  },
  description,
  alternates: {
    canonical: siteUrl,
    types: {
      "application/rss+xml": new URL("rss.xml", siteUrl).toString(),
    },
  },
  icons: {
    icon: faviconUrl,
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Sorry, Tomorrow",
    title: "Sorry, Tomorrow",
    description,
    images: [
      {
        url: socialImageUrl,
        width: 1731,
        height: 909,
        alt: "Sorry, Tomorrow — Brilliant. Confidently clueless.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sorry, Tomorrow",
    description,
    images: [socialImageUrl],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        {children}
        <AnalyticsBeacon />
      </body>
    </html>
  );
}
