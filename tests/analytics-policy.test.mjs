import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { analyticsAllowed, campaignProperties, publicProjectToken, safeAnalyticsProperties } from "../app/analytics-policy.mjs";

const comics = [
  { id: "ST-ONE", slug: "one", number: 1 },
  { id: "ST-TWO", slug: "two", number: 2 },
];
const raw = { token: "phc_test", distinct_id: "cookieless-test-marker", $cookieless_mode: true };

test("personal/admin API tokens can never enter browser-facing props", () => {
  const publicToken = `phc_${"a".repeat(40)}`;
  assert.equal(publicProjectToken(publicToken), publicToken);
  for (const value of [undefined, "", "phx_personal-secret", "EAA-private-token", ` ${publicToken}`, `${publicToken}\n`]) {
    assert.equal(publicProjectToken(value), "");
  }
});

test("only the production origin and published routes are eligible", () => {
  for (const path of ["/", "/privacy/", "/colophon/", "/comics/one/"]) {
    assert.equal(analyticsAllowed(`https://sorrytomorrow.com${path}`, {}, comics), true);
  }
  for (const url of ["http://localhost:3117/", "https://preview.example/", "https://sorrytomorrow.com/review/", "https://sorrytomorrow.com/comics/unapproved/", "https://sorrytomorrow.com:8443/", "invalid"]) {
    assert.equal(analyticsAllowed(url, {}, comics), false, url);
  }
});

test("Do Not Track and Global Privacy Control disable analytics", () => {
  for (const privacy of [{ dnt: "1" }, { dnt: "yes" }, { gpc: true }]) {
    assert.equal(analyticsAllowed("https://sorrytomorrow.com/", privacy, comics), false);
  }
});

test("auth and legacy-redirect landings never initialize tracking", () => {
  for (const query of ["code=private", "access_token=private", "oauth_token=private", "oauth_verifier=private", "email=private", "comic=one"]) {
    assert.equal(analyticsAllowed(`https://sorrytomorrow.com/?${query}`, {}, comics), false);
  }
});

test("campaign tags admit only the agreed organic comic format", () => {
  assert.deepEqual(campaignProperties("?utm_source=x&utm_medium=organic_social&utm_campaign=comic-001-one&utm_content=full-page&fbclid=private"), {
    utm_source: "x", utm_medium: "organic_social", utm_campaign: "comic-001-one", utm_content: "full-page",
  });
  assert.deepEqual(campaignProperties("?utm_source=person@example.com&utm_campaign=private-name&utm_content=private&utm_term=secret"), {});
});

test("default SDK URLs, ad IDs, and person/form properties are stripped", () => {
  const properties = safeAnalyticsProperties("comic_view", {
    ...raw, comic_slug: "one", comic_id: "untrusted-id", email: "private@example.com",
    $set: { name: "private-name" }, form_contents: "private text",
    $initial_current_url: "https://example.com/?token=private", fbclid: "private-ad-id",
  }, "https://sorrytomorrow.com/comics/one/?utm_source=facebook&unwanted=private#secret", "https://example.com/private-path?email=private", comics);
  assert.equal(properties.$current_url, "https://sorrytomorrow.com/comics/one/");
  assert.equal(properties.$referrer, "https://example.com/");
  assert.equal(properties.comic_id, "ST-ONE");
  assert.equal(properties.utm_source, "facebook");
  assert.equal(properties.$process_person_profile, false);
  assert.ok(!JSON.stringify(properties).includes("private"));
  assert.ok(!JSON.stringify(properties).includes("untrusted-id"));
});

test("unrequested event types, cookieful events, and unknown comics are dropped", () => {
  for (const event of ["$snapshot", "$identify", "$autocapture", "$exception"]) {
    assert.equal(safeAnalyticsProperties(event, raw, "https://sorrytomorrow.com/", "", comics), null);
  }
  assert.equal(safeAnalyticsProperties("$pageview", { ...raw, $cookieless_mode: false }, "https://sorrytomorrow.com/", "", comics), null);
  assert.equal(safeAnalyticsProperties("comic_view", { ...raw, comic_slug: "private" }, "https://sorrytomorrow.com/", "", comics), null);
});

test("end-of-comic is explicitly a viewing proxy, and navigation is restricted", () => {
  const end = safeAnalyticsProperties("comic_end_reached", { ...raw, comic_slug: "one" }, "https://sorrytomorrow.com/comics/one/", "", comics);
  assert.equal(end.measurement, "end-navigation-visible-1s-images-loaded");
  const nav = safeAnalyticsProperties("comic_navigation", { ...raw, comic_slug: "one", to_slug: "two", navigation_method: "keyboard" }, "https://sorrytomorrow.com/comics/one/", "", comics);
  assert.equal(nav.to_slug, "two");
  assert.equal(safeAnalyticsProperties("comic_navigation", { ...raw, comic_slug: "one", to_slug: "private", navigation_method: "link" }, "https://sorrytomorrow.com/", "", comics), null);
});

test("social events contain a channel, not an arbitrary outbound URL", () => {
  const event = safeAnalyticsProperties("social_link_click", { ...raw, channel: "instagram", href: "https://private.example/" }, "https://sorrytomorrow.com/", "", comics);
  assert.equal(event.channel, "instagram");
  assert.equal(event.href, undefined);
  assert.equal(safeAnalyticsProperties("social_link_click", { ...raw, channel: "email" }, "https://sorrytomorrow.com/", "", comics), null);
});

test("client setup explicitly disables storage, replay, broad capture, and remote features", async () => {
  const source = await readFile(new URL("../app/ComicAnalytics.tsx", import.meta.url), "utf8");
  for (const setting of [
    'cookieless_mode: "always"', 'person_profiles: "never"', "disable_persistence: true",
    "autocapture: false", "disable_session_recording: true", "capture_heatmaps: false",
    "capture_exceptions: false", "capture_performance: false", "advanced_disable_flags: true",
    "disable_external_dependency_loading: true", "capture_pageview: false",
  ]) assert.ok(source.includes(setting), setting);
  assert.doesNotMatch(source, /\.identify\(|\.startSessionRecording\(|META_PAGE_ACCESS_TOKEN|X_API_SECRET/);
  assert.doesNotMatch(source, /\.\.\.event\s*,/);
  assert.match(source, /image\.complete && image\.naturalWidth > 0/);
  assert.match(source, /document\.visibilityState !== "visible"/);
});
