import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const configuredBasePath = process.env.PAGES_BASE_PATH ?? "";
const basePath =
  configuredBasePath === "/"
    ? ""
    : configuredBasePath.replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: "export" as const,
        assetPrefix: basePath || undefined,
        trailingSlash: false,
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;
