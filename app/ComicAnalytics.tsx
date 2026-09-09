"use client";

import { useEffect } from "react";
import type { PostHog } from "posthog-js";
import { analyticsAllowed, publicProjectToken, safeAnalyticsProperties } from "./analytics-policy.mjs";

type ComicReference = { id: string; slug: string; number: number };
type Capture = (event: string, properties?: Record<string, unknown>) => void;
let clientPromise: Promise<PostHog> | undefined;

function privacySignals() {
  return {
    dnt: navigator.doNotTrack,
    gpc: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
  };
}

function attachTracking(comics: ComicReference[], capture: Capture) {
  const reader = document.querySelector<HTMLElement>("[data-comic-slug]");
  const comic = comics.find(item => item.slug === reader?.dataset.comicSlug);
  capture("$pageview", window.location.pathname.startsWith("/comics/") && comic ? { comic_slug: comic.slug } : {});

  let viewed = false;
  let ended = false;
  let endVisible = false;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  const end = reader?.querySelector<HTMLElement>("[data-comic-end]");
  const images = [...(reader?.querySelectorAll<HTMLImageElement>("img.comic-panel-art") ?? [])];

  function recordView() {
    if (!reader || !comic || viewed || document.visibilityState !== "visible") return;
    const box = reader.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0 && box.left < window.innerWidth && box.right > 0) {
      viewed = true;
      capture("comic_view", { comic_slug: comic.slug });
    }
  }

  function cancelEndTimer() { clearTimeout(endTimer); endTimer = undefined; }
  function scheduleEnd() {
    cancelEndTimer();
    if (!end || !comic || ended || !endVisible || document.visibilityState !== "visible") return;
    if (!images.length || !images.every(image => image.complete && image.naturalWidth > 0)) return;
    endTimer = setTimeout(() => {
      const box = end.getBoundingClientRect();
      if (ended || document.visibilityState !== "visible" || box.top >= window.innerHeight || box.bottom <= 0) return;
      ended = true;
      capture("comic_end_reached", { comic_slug: comic.slug });
    }, 1000);
  }

  const observer = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target === reader && entry.isIntersecting && !viewed && comic) {
        recordView();
      }
      if (entry.target === end) {
        endVisible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        scheduleEnd();
      }
    }
  }, { threshold: [0, 0.5] });
  if (reader && comic) observer?.observe(reader);
  if (end && comic) observer?.observe(end);
  images.forEach(image => image.addEventListener("load", scheduleEnd));
  function onVisibilityChange() { recordView(); scheduleEnd(); }
  document.addEventListener("visibilitychange", onVisibilityChange);

  function navigation(href: string, method: "link" | "keyboard") {
    if (!comic) return;
    const url = new URL(href, window.location.href);
    const destination = comics.find(item => url.origin === window.location.origin
      && url.pathname.replace(/\/+$/, "") === `/comics/${item.slug}`);
    if (destination) capture("comic_navigation", { comic_slug: comic.slug, to_slug: destination.slug, navigation_method: method });
  }

  function onClick(event: MouseEvent) {
    const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a") : null;
    if (!target) return;
    if (target.hasAttribute("data-comic-navigation")) navigation(target.href, "link");
    if (target.dataset.socialChannel) capture("social_link_click", { channel: target.dataset.socialChannel, ...(comic ? { comic_slug: comic.slug } : {}) });
  }

  function onKeyboardNavigation(event: Event) {
    const href = (event as CustomEvent<{ href?: string }>).detail?.href;
    if (typeof href === "string") navigation(href, "keyboard");
  }

  document.addEventListener("click", onClick, true);
  window.addEventListener("sorrytomorrow:navigation", onKeyboardNavigation);
  return () => {
    cancelEndTimer();
    observer?.disconnect();
    images.forEach(image => image.removeEventListener("load", scheduleEnd));
    document.removeEventListener("visibilitychange", onVisibilityChange);
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("sorrytomorrow:navigation", onKeyboardNavigation);
  };
}

export function ComicAnalytics({ projectToken, comics }: { projectToken: string; comics: ComicReference[] }) {
  useEffect(() => {
    if (!publicProjectToken(projectToken)
      || !analyticsAllowed(window.location.href, privacySignals(), comics)) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    clientPromise ??= import("posthog-js").then(({ default: client }) => {
      client.init(projectToken, {
        api_host: "https://us.i.posthog.com",
        ui_host: "https://us.posthog.com",
        defaults: "2026-05-30",
        cookieless_mode: "always",
        person_profiles: "never",
        persistence: "memory",
        disable_persistence: true,
        respect_dnt: true,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        capture_dead_clicks: false,
        capture_exceptions: false,
        capture_heatmaps: false,
        capture_performance: false,
        rageclick: false,
        disable_session_recording: true,
        enable_recording_console_log: false,
        disable_surveys: true,
        disable_product_tours: true,
        disable_conversations: true,
        disable_external_dependency_loading: true,
        advanced_disable_flags: true,
        advanced_disable_feature_flags: true,
        disable_capture_url_hashes: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        debug: false,
        before_send: event => {
          if (!event || !analyticsAllowed(window.location.href, privacySignals(), comics)) return null;
          const properties = safeAnalyticsProperties(event.event, event.properties, window.location.href, document.referrer, comics);
          // Do not forward top-level person updates ($set/$set_once/$unset).
          return properties ? { uuid: event.uuid, event: event.event, properties, timestamp: event.timestamp } : null;
        },
      });
      return client;
    });
    clientPromise.then(client => {
      if (cancelled || !analyticsAllowed(window.location.href, privacySignals(), comics)) return;
      dispose = attachTracking(comics, (event, properties = {}) => {
        client.capture(event, properties, { send_instantly: true });
      });
    }).catch(() => { /* Analytics must never interrupt reading. */ });
    return () => { cancelled = true; dispose?.(); };
  }, [projectToken, comics]);
  return null;
}
