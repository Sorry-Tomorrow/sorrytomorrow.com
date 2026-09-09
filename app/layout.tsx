import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bowlby_One_SC } from "next/font/google";
import { publishedEpisodes, series } from "@/content/episodes";
import { AnalyticsBeacon } from "./AnalyticsBeacon";
import { ComicAnalytics } from "./ComicAnalytics";
import { publicProjectToken } from "./analytics-policy.mjs";
import "./globals.css";
import { publicAssetPath, siteUrl } from "./site";

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
  verification: {
    google: "IcrV7AVagPbGnDhPwGSqlYrOaD0xk8vabpn0yyJKunI",
  },
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
        <style>{`@font-face{font-family:ComicBangers;src:url("${publicAssetPath("fonts/comic-shell/Bangers-Regular.ttf")}") format("truetype");font-display:swap}@font-face{font-family:ComicBowlby;src:url("${publicAssetPath("fonts/comic-shell/BowlbyOneSC-Regular.ttf")}") format("truetype");font-weight:400;font-display:swap}`}</style>
        {children}
        <AnalyticsBeacon />
        <ComicAnalytics
          projectToken={publicProjectToken(process.env.NEXT_PUBLIC_POSTHOG_KEY)}
          comics={publishedEpisodes.map(episode => ({ id: episode.internalId, slug: episode.slug, number: episode.publicNumber }))}
        />
      </body>
    </html>
  );
}
