"use client";

import { useEffect } from "react";

type LegacyComicRedirectProps = {
  knownSlugs: string[];
  basePath: string;
};

export function LegacyComicRedirect({
  knownSlugs,
  basePath,
}: LegacyComicRedirectProps) {
  useEffect(() => {
    const slug = new URL(window.location.href).searchParams.get("comic");
    if (!slug || !knownSlugs.includes(slug)) return;
    window.location.replace(`${basePath}/comics/${slug}/#comic`);
  }, [basePath, knownSlugs]);

  return null;
}
