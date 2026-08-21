import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bowlby_One_SC } from "next/font/google";
import "./globals.css";

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

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const siteUrl = new URL(
  configuredSiteUrl.endsWith("/")
    ? configuredSiteUrl
    : `${configuredSiteUrl}/`,
);
const faviconUrl = new URL("favicon.svg", siteUrl).toString();
const socialImageUrl = new URL("og.png", siteUrl).toString();
const description =
  "Sorry, Tomorrow is a colorful workplace satire about Ahead AI—an agency that scales first and locates the intelligence later.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Sorry, Tomorrow",
    template: "%s | Sorry, Tomorrow",
  },
  description,
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
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
