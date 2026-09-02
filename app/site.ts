import { series } from "@/content/episodes";

const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? series.canonicalOrigin;

export const siteUrl = new URL(
  configuredSiteUrl.endsWith("/")
    ? configuredSiteUrl
    : `${configuredSiteUrl}/`,
);

const configuredBasePath = process.env.PAGES_BASE_PATH ?? "";
const normalizedBasePath = configuredBasePath
  .replace(/^\/+|\/+$/g, "")
  .trim();

export const publicBasePath = normalizedBasePath
  ? `/${normalizedBasePath}`
  : "";

export function publicAssetPath(assetPath: string) {
  const normalized = assetPath.replace(/^\/+/, "");
  return `${publicBasePath}/${normalized}`;
}

export function sitePath(pathname: string) {
  const normalized = pathname.replace(/^\/+/, "");
  return `${publicBasePath}/${normalized}`;
}

export function absolutePublicUrl(assetPath: string) {
  return new URL(assetPath.replace(/^\/+/, ""), siteUrl).toString();
}

export function absolutePageUrl(pathname: string) {
  return new URL(
    sitePath(pathname).replace(/^\/+/, ""),
    `${siteUrl.protocol}//${siteUrl.host}/`,
  );
}
