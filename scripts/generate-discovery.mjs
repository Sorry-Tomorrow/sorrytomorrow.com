import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const catalogPath = path.join(projectRoot, "content", "episodes.json");
const publicRoot = path.join(projectRoot, "public");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

function fail(message) {
  throw new Error(`Episode catalog: ${message}`);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function validateCatalog() {
  if (!catalog.series?.canonicalOrigin) fail("series.canonicalOrigin is required");
  if (!Array.isArray(catalog.episodes) || catalog.episodes.length === 0) {
    fail("episodes must be a non-empty array");
  }

  const slugs = new Set();
  const numbers = new Set();
  let previousNumber = Number.POSITIVE_INFINITY;

  for (const episode of catalog.episodes) {
    if (!/^[-a-z0-9]+$/.test(episode.slug)) fail(`invalid slug ${episode.slug}`);
    if (slugs.has(episode.slug)) fail(`duplicate slug ${episode.slug}`);
    if (numbers.has(episode.publicNumber)) {
      fail(`duplicate publicNumber ${episode.publicNumber}`);
    }
    if (episode.publicNumber >= previousNumber) {
      fail("episodes must be newest-first by publicNumber");
    }
    if (!episode.internalId || !episode.title || !episode.caption) {
      fail(`${episode.slug} is missing required identity fields`);
    }
    if (!episode.websitePublishedAt || Number.isNaN(Date.parse(episode.websitePublishedAt))) {
      fail(`${episode.slug} has an invalid websitePublishedAt`);
    }
    if (!Array.isArray(episode.art) || episode.art.length === 0) {
      fail(`${episode.slug} has no art`);
    }
    if (!Array.isArray(episode.panels) || episode.panels.length === 0) {
      fail(`${episode.slug} has no transcript panels`);
    }
    if (!episode.ogImage?.src || !episode.ogImage?.alt) {
      fail(`${episode.slug} has no episode-specific social preview`);
    }
    if (/\bAhead\b(?!\s+AI)/.test(`${episode.caption} ${JSON.stringify(episode.panels)}`)) {
      fail(`${episode.slug} contains standalone Ahead as an agency label`);
    }

    slugs.add(episode.slug);
    numbers.add(episode.publicNumber);
    previousNumber = episode.publicNumber;
  }
}

validateCatalog();

const origin = (
  process.env.NEXT_PUBLIC_SITE_URL ?? catalog.series.canonicalOrigin
).replace(/\/$/, "");
const pageRecords = [
  { path: "/", lastmod: catalog.episodes[0].websitePublishedAt },
  ...catalog.episodes.map((episode) => ({
    path: `/comics/${episode.slug}/`,
    lastmod: episode.websitePublishedAt,
  })),
  { path: "/colophon/", lastmod: catalog.episodes[0].websitePublishedAt },
  { path: "/privacy/", lastmod: catalog.episodes[0].websitePublishedAt },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pageRecords
  .map(
    (record) => `  <url>
    <loc>${escapeXml(`${origin}${record.path}`)}</loc>
    <lastmod>${escapeXml(new Date(record.lastmod).toISOString())}</lastmod>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const rssItems = catalog.episodes
  .map((episode) => {
    const link = `${origin}/comics/${episode.slug}/`;
    return `    <item>
      <title>${escapeXml(episode.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${escapeXml(new Date(episode.websitePublishedAt).toUTCString())}</pubDate>
      <description>${escapeXml(episode.caption)}</description>
    </item>`;
  })
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(catalog.series.title)}</title>
    <link>${escapeXml(`${origin}/`)}</link>
    <description>${escapeXml(catalog.series.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${escapeXml(new Date(catalog.episodes[0].websitePublishedAt).toUTCString())}</lastBuildDate>
${rssItems}
  </channel>
</rss>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`;

await Promise.all([
  writeFile(path.join(publicRoot, "sitemap.xml"), sitemap, "utf8"),
  writeFile(path.join(publicRoot, "rss.xml"), rss, "utf8"),
  writeFile(path.join(publicRoot, "robots.txt"), robots, "utf8"),
]);

console.log(`Generated discovery files for ${catalog.episodes.length} episodes.`);
