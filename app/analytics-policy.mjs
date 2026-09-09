const eventNames = new Set(["$pageview", "comic_view", "comic_end_reached", "comic_navigation", "social_link_click"]);
const channels = new Set(["x", "instagram", "facebook"]);

/** Only a public ingestion key may be serialized into browser-facing HTML. @param {unknown} value */
export function publicProjectToken(value) {
  return typeof value === "string" && /^phc_[a-zA-Z0-9]{20,120}$/.test(value) ? value : "";
}

/** @typedef {{ id: string, slug: string, number: number }} ComicReference */

/** @param {string} href @param {{ dnt?: string | null, gpc?: boolean }} privacy @param {ComicReference[]} comics */
export function analyticsAllowed(href, privacy, comics) {
  if (privacy.gpc || privacy.dnt === "1" || privacy.dnt === "yes") return false;
  try {
    const url = new URL(href);
    if (url.origin !== "https://sorrytomorrow.com" || url.username || url.password) return false;
    // Never send legacy redirect landings or authentication/contact query data.
    if ([...url.searchParams.keys()].some(key => /^(comic|code|oauth_token|oauth_verifier|access_token|token|secret|email)$/i.test(key))) return false;
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return ["/", "/privacy", "/colophon"].includes(path)
      || comics.some(comic => path === `/comics/${comic.slug}`);
  } catch {
    return false;
  }
}

/** @param {string} search */
export function campaignProperties(search) {
  const params = new URLSearchParams(search);
  /** @type {Record<string, string>} */
  const result = {};
  const source = params.get("utm_source") ?? "";
  const medium = params.get("utm_medium") ?? "";
  const campaign = params.get("utm_campaign") ?? "";
  const content = params.get("utm_content") ?? "";
  if (channels.has(source)) result.utm_source = source;
  if (medium === "organic_social") result.utm_medium = medium;
  if (/^comic-\d{3,}-[a-z0-9-]{1,100}$/.test(campaign)) result.utm_campaign = campaign;
  if (/^(full-page|carousel|panels|launch|bio|post|thread|slide-\d{1,2})$/.test(content)) result.utm_content = content;
  return result;
}

/**
 * Keep SDK transport fields, coarse device context, and our explicitly allowed
 * events. Query strings, fragments, form data, person properties, ad click IDs,
 * and default SDK initial-URL properties never leave through this hook.
 * @param {string} eventName
 * @param {Record<string, unknown>} raw
 * @param {string} href
 * @param {string} referrer
 * @param {ComicReference[]} comics
 * @returns {Record<string, unknown> | null}
 */
export function safeAnalyticsProperties(eventName, raw, href, referrer, comics) {
  if (!eventNames.has(eventName) || raw.$cookieless_mode !== true) return null;
  if (typeof raw.token !== "string" || typeof raw.distinct_id !== "string") return null;
  const url = new URL(href);
  /** @type {Record<string, unknown>} */
  const properties = {
    token: raw.token,
    distinct_id: raw.distinct_id,
    $cookieless_mode: true,
    $process_person_profile: false,
    $current_url: `${url.origin}${url.pathname}`,
    $pathname: url.pathname,
    $host: url.hostname,
    ...campaignProperties(url.search),
  };
  for (const name of ["$lib", "$lib_version", "$device_type", "$browser", "$os"]) {
    if (typeof raw[name] === "string" && /^[a-zA-Z0-9 ._-]{1,80}$/.test(raw[name])) properties[name] = raw[name];
  }
  try {
    const origin = new URL(referrer);
    if (["https:", "http:"].includes(origin.protocol)) {
      properties.$referrer = `${origin.origin}/`;
      properties.$referring_domain = origin.hostname;
    }
  } catch { /* No referrer is normal. */ }
  const comic = comics.find(item => item.slug === raw.comic_slug);
  if (comic) Object.assign(properties, { comic_id: comic.id, comic_slug: comic.slug, comic_number: comic.number });
  if (["comic_view", "comic_end_reached", "comic_navigation"].includes(eventName) && !comic) return null;
  if (eventName === "comic_end_reached") properties.measurement = "end-navigation-visible-1s-images-loaded";
  if (eventName === "comic_navigation") {
    const destination = comics.find(item => item.slug === raw.to_slug);
    if (!destination || !["link", "keyboard"].includes(String(raw.navigation_method))) return null;
    properties.to_slug = destination.slug;
    properties.navigation_method = raw.navigation_method;
  }
  if (eventName === "social_link_click") {
    if (!channels.has(String(raw.channel))) return null;
    properties.channel = raw.channel;
  }
  return properties;
}
