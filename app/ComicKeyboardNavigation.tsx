"use client";

import { useEffect } from "react";

type ComicKeyboardNavigationProps = {
  olderHref?: string;
  newerHref?: string;
};

export function ComicKeyboardNavigation({
  olderHref,
  newerHref,
}: ComicKeyboardNavigationProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (document.querySelector("dialog[open]")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("a, button, input, textarea, select, summary")) return;

      if (event.key === "ArrowLeft" && olderHref) {
        event.preventDefault();
        window.location.assign(olderHref);
      }

      if (event.key === "ArrowRight" && newerHref) {
        event.preventDefault();
        window.location.assign(newerHref);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [newerHref, olderHref]);

  return null;
}
