export const officialPostsFeed = "https://raw.githubusercontent.com/Sorry-Tomorrow/sorrytomorrow.com/social-publication-state/public-social-posts.json";

export function isOfficialPost(channel, value) {
  if (typeof value !== "string") return false;
  const patterns = {
    x: /^https:\/\/x\.com\/sorrytomorrowco\/status\/\d+$/,
    instagram: /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_-]+\/$/,
    facebook: /^https:\/\/www\.facebook\.com\/122107583679458114\/posts\/\d+$/,
  };
  return Object.hasOwn(patterns, channel) && patterns[channel].test(value);
}

/** The public projection is deliberately just slugs, providers and public post URLs.
 * @returns {Record<string, string> | null}
 */
export function validatedOfficialPosts(feed, slug) {
  if (feed?.schema !== "sorry-tomorrow-public-social-posts-v1" || !feed.comics || typeof feed.comics !== "object") return null;
  const row = Object.hasOwn(feed.comics, slug) ? feed.comics[slug] : {};
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  /** @type {Record<string, string>} */
  const result = {};
  for (const [channel, url] of Object.entries(row)) {
    if (!isOfficialPost(channel, url)) return null;
    result[channel] = url;
  }
  return result;
}
