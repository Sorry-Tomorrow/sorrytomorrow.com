import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { access, readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { publicProjectToken } from "../app/analytics-policy.mjs";

const projectRoot = new URL("../", import.meta.url);
const outputRoot = new URL("../dist/client/", import.meta.url);
const configuredBasePath = process.env.PAGES_BASE_PATH ?? "";
const pathSegment = configuredBasePath.replace(/^\/+|\/+$/g, "");
const basePath = pathSegment ? `/${pathSegment}` : "";
const escapedBasePath = basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const expectedSiteUrl = new URL(
  configuredSiteUrl || "https://sorrytomorrow.com/",
);
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const approvedComicAssets = {
  "comics/founder-inc-llc/p1-lettered.svg": "ef0682973a709fb8392c6f13e5fd5585e56a420528d17bb74e4c2cab3aa2b026",
  "comics/founder-inc-llc/p2-lettered.svg": "d2bf1dfb7ba644e059cb1b6bc5ee74299a396866e0924032ecc3836ae6b8c97d",
  "comics/founder-inc-llc/og.png": "faab9db66afc262c5fcf1c777418f6b688889fdce13fc3dc52388e90fb2f2ae1",
  "comics/the-honest-demo/p1-lettered.svg": "6376b5919624454f8182d2a542f154460fd48503597b117d4a634b90e56c0655",
  "comics/the-honest-demo/p2-lettered.svg": "3af0ed4aa5262bbcc25419fc3e976ab69ce908262ead8e104f23f1b5497b20ea",
  "comics/the-honest-demo/p3-lettered.svg": "93caf73e720fa9f1d917628c5f512c8878825a74db7cc71e53f6ad0aa31cb5e5",
  "comics/the-honest-demo/p4-lettered.svg": "a23e01463eb15672f0001d9e7e28ab2b03deb119f27d260c3e3332603342a150",
  "comics/executive-twin/p1-lettered.svg": "601855a49c019ddb39d3a9e87fe3e6d13fe27fb0406d4ff4d809061a3827b645",
  "comics/executive-twin/p2-lettered.svg": "fcb6cb4e2e1a273aeb066435cee8749d441e6e61e6e24d0a8027a65a7787c1f8",
  "comics/executive-twin/p3-lettered.svg": "12c0252f6bddaa9d168475a86db1eb8c3701d0f0fb164646e27dfb73e8eed0e9",
  "comics/executive-twin/p4-lettered.svg": "2a1bbce56bc8062a6b96e3e65e7a6bb390bb8bef1ed93c76f89694afacf18936",
  "comics/undefeated/website-master.png": "02cd6ffbcd70f8941b3c507dc297caa0687c48410058fea50eab8fba7156a8ef",
  "comics/vibe-coding-in-your-sleep/website-master.png": "52fc0fb53fd0719d6ed3903fc4260ace4575e97631311cbeee4bffbfa9156d4b",
  "comics/executive-twin/og.png": "5ff59d166ec8b8526f704e8c683716ec3ea35e4cbed78ee58c6b6e304d69e37f",
  "comics/undefeated/og.png": "1372470f785a61b4ac31beff7c5a3395d2c7ff7fd302bfee8979616bb9bb978a",
  "comics/vibe-coding-in-your-sleep/og.png": "ba32d3cfc2dada48d96527c099539a5e82ef79c9fcc90a3b402c14dfe2610ea3",
  "comics/the-honest-demo/og.png": "10c0c4aedc695c563a00217b3af22a7ab8c3a9059c4cdf474a91fe1a810343ce",
};

test("Pages output retains search verification and the configured single analytics beacon", async () => {
  const catalog = JSON.parse(await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"));
  const paths = ["index.html", ...catalog.episodes.map(episode => `comics/${episode.slug}/index.html`)];
  const token = process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN;
  for (const file of paths) {
    const html = await readFile(new URL(file, outputRoot), "utf8");
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
    assert.match(head, /<meta name="google-site-verification" content="IcrV7AVagPbGnDhPwGSqlYrOaD0xk8vabpn0yyJKunI"/, file);
    const beacons = [...html.matchAll(/<script\b[^>]*src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"[^>]*>/g)];
    assert.equal(beacons.length, token ? 1 : 0, file);
    if (token) {
      assert.match(beacons[0][0], /type="module"/, file);
      const config = beacons[0][0].match(/data-cf-beacon="([^"]*)"/)?.[1];
      assert.ok(config, file);
      assert.deepEqual(JSON.parse(config.replaceAll("&quot;", '"')), { token }, file);
    }
  }
});

test("optional PostHog configuration reaches every public comic without altering art", async () => {
  const catalog = JSON.parse(await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"));
  const rawToken = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const token = publicProjectToken(rawToken);
  for (const episode of catalog.episodes) {
    const html = await readFile(new URL(`comics/${episode.slug}/index.html`, outputRoot), "utf8");
    assert.ok(html.includes(`data-comic-slug="${episode.slug}"`), episode.slug);
    assert.ok(html.includes("data-comic-end="), episode.slug);
    if (token) assert.ok(html.includes(token), "Public project key missing from browser props");
    else if (rawToken) assert.ok(!html.includes(rawToken), "Non-public token must not enter HTML");
  }
  const privacy = await readFile(new URL("privacy/index.html", outputRoot), "utf8");
  assert.match(privacy, /PostHog US Cloud/);
  assert.match(privacy, /not proof that someone read the comic/);
});

test("produces a complete GitHub Pages artifact", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");

  assert.match(html, /<title>Sorry, Tomorrow<\/title>/);
  assert.match(html, /id="latest-comic"/);
  assert.match(html, /Not-So-Smart Thermostat/);
  assert.match(html, /Oops… I Drifted Again/);
  assert.match(html, /The Magnification Spiral/);
  assert.match(html, /Founder, Inc\. LLC/);
  assert.match(html, /Comic 010 · Ahead AI/);
  assert.match(html, /Work Life Balance/);
  assert.match(html, /comics\/work-life-balance\/p1\.png/);
  assert.match(html, /So You Vibe-Coded an App…/);
  assert.match(html, new RegExp(`href="${escapedBasePath}/comics/so-you-vibe-coded-an-app/#comic"`));
  assert.match(html, /The Honest Demo/);
  assert.match(html, /Vibe Coding in Your Sleep/);
  assert.doesNotMatch(html, /Latest approved comic|production-ready pilot/i);
  assert.match(
    html,
    new RegExp(`href="${escapedBasePath}/comics/the-honest-demo/#comic"`),
  );
  assert.match(
    html,
    new RegExp(`href="${escapedBasePath}/comics/vibe-coding-in-your-sleep/#comic"`),
  );
  assert.match(
    html,
    new RegExp(`href="${escapedBasePath}/comics/undefeated/#comic"`),
  );
  assert.match(
    html,
    new RegExp(`href="${escapedBasePath}/comics/executive-twin/#comic"`),
  );
  assert.doesNotMatch(
    html,
    /Design placeholder|Latest concept strip|Placeholder artwork for design review/,
  );
  assert.match(html, /Human in the loop\?/i);
  assert.match(html, /The Social Media Prophet/);
  assert.doesNotMatch(html, /The LinkedIn Prophet/);
  assert.match(html, /id="character-spotlight"/);
  assert.doesNotMatch(html, /href="\?comic=|href="\/\?comic=/);
  assert.match(html, new RegExp(`href="${escapedBasePath}/rss\\.xml"`));
  assert.match(html, /AI-assisted; human-written, directed, edited, and approved/);

  if (basePath) {
    assert.match(html, new RegExp(`${basePath}/_next/`));
    await assert.rejects(
      access(new URL(`.${basePath}/`, outputRoot)),
    );
  }

  if (configuredSiteUrl) {
    assert.match(
      html,
      new RegExp(
        configuredSiteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ),
    );
  }

  await Promise.all([
    access(new URL("index.rsc", outputRoot)),
    access(new URL("_next/", outputRoot)),
    access(new URL("og.png", outputRoot)),
    access(new URL("favicon.svg", outputRoot)),
    access(new URL("404.html", outputRoot)),
    access(new URL("robots.txt", outputRoot)),
    access(new URL("sitemap.xml", outputRoot)),
    access(new URL("rss.xml", outputRoot)),
    access(new URL("colophon.html", outputRoot)),
    access(new URL("privacy.html", outputRoot)),
    access(new URL("colophon/index.html", outputRoot)),
    access(new URL("privacy/index.html", outputRoot)),
    access(new URL("comics/the-honest-demo.html", outputRoot)),
    access(new URL("comics/founder-inc-llc.html", outputRoot)),
    access(new URL("comics/vibe-coding-in-your-sleep.html", outputRoot)),
    access(new URL("comics/undefeated.html", outputRoot)),
    access(new URL("comics/executive-twin.html", outputRoot)),
    access(new URL("comics/the-honest-demo/index.html", outputRoot)),
    access(new URL("comics/founder-inc-llc/index.html", outputRoot)),
    access(new URL("comics/vibe-coding-in-your-sleep/index.html", outputRoot)),
    access(new URL("comics/undefeated/index.html", outputRoot)),
    access(new URL("comics/executive-twin/index.html", outputRoot)),
    access(new URL("characters/dex-vane.png", outputRoot)),
    access(new URL("characters/clara-fye.png", outputRoot)),
    access(new URL("characters/mina-sparks.png", outputRoot)),
    access(new URL("characters/wes-rollback.png", outputRoot)),
    access(new URL("characters/boomer-slate.png", outputRoot)),
    access(new URL("characters/token.png", outputRoot)),
    ...Object.keys(approvedComicAssets).map((assetPath) =>
      access(new URL(assetPath, outputRoot)),
    ),
    access(new URL(".nojekyll", outputRoot)),
    access(new URL("app/ComicReader.tsx", projectRoot)),
  ]);

  for (const [assetPath, expectedHash] of Object.entries(approvedComicAssets)) {
    const contents = await readFile(new URL(assetPath, outputRoot));
    assert.equal(createHash("sha256").update(contents).digest("hex"), expectedHash);
  }

  const executiveHtml = await readFile(
    new URL("comics/executive-twin/index.html", outputRoot),
    "utf8",
  );
  assert.match(executiveHtml, /<title>Executive Twin \| Sorry, Tomorrow<\/title>/);
  assert.match(
    executiveHtml,
    new RegExp(
      escapePattern(new URL("comics/executive-twin/og.png", expectedSiteUrl).toString()),
    ),
  );
  assert.match(executiveHtml, /I trained a digital twin on my entire leadership style/);

  const founderHtml = await readFile(
    new URL("comics/founder-inc-llc/index.html", outputRoot),
    "utf8",
  );
  assert.match(founderHtml, /<title>Founder, Inc\. LLC \| Sorry, Tomorrow<\/title>/);
  assert.match(
    founderHtml,
    new RegExp(
      escapePattern(new URL("comics/founder-inc-llc/og.png", expectedSiteUrl).toString()),
    ),
  );
  assert.match(founderHtml, /AI CONFERENCE — BADGE PICKUP/);

  const sitemap = await readFile(new URL("sitemap.xml", outputRoot), "utf8");
  const rss = await readFile(new URL("rss.xml", outputRoot), "utf8");
  assert.match(
    sitemap,
    new RegExp(escapePattern(new URL("comics/founder-inc-llc/", expectedSiteUrl).toString())),
  );
  assert.match(
    sitemap,
    new RegExp(escapePattern(new URL("comics/the-honest-demo/", expectedSiteUrl).toString())),
  );
  assert.match(
    sitemap,
    new RegExp(escapePattern(new URL("comics/executive-twin/", expectedSiteUrl).toString())),
  );
  assert.match(rss, /<title>Founder, Inc\. LLC<\/title>/);
  assert.match(rss, /<title>The Honest Demo<\/title>/);
  assert.match(rss, /<title>Executive Twin<\/title>/);
});

test("release export has complete episode pages and exact approved assets", async () => {
  const catalog = JSON.parse(await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"));
  const ledger = JSON.parse(await readFile(new URL("../content/approved-slate-assets.json", import.meta.url), "utf8"));
  const vibeLedger = JSON.parse(await readFile(new URL("../content/approved-vibecoded-assets.json", import.meta.url), "utf8"));
  const workLifeLedger = JSON.parse(await readFile(new URL("../content/approved-work-life-balance-assets.json", import.meta.url), "utf8"));
  await assert.rejects(access(new URL("review/index.html", outputRoot)));
  await assert.rejects(access(new URL("review.html", outputRoot)));
  for (const episode of catalog.episodes.filter(item => item.publicNumber >= 6)) {
    const html = await readFile(new URL(`comics/${episode.slug}/index.html`, outputRoot), "utf8");
    assert.ok(!html.includes('content="noindex, nofollow"'), episode.slug);
    assert.ok(html.includes('property="article:published_time"'), episode.slug);
    for (const art of episode.art) assert.ok(html.includes(`${basePath}/${art.src}`), art.src);
    assert.ok(!html.includes('href="/review/"'), episode.slug);
  }
  for (const asset of [...ledger.assets, ...vibeLedger.assets, ...workLifeLedger.assets]) {
    const bytes = await readFile(new URL(asset.target, outputRoot));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, asset.target);
  }
  const robots = await readFile(new URL("robots.txt", outputRoot), "utf8");
  assert.match(robots, /Allow: \//);
  assert.doesNotMatch(robots, /Disallow: \//);
});

test("standard Pages preparation still refuses an unapproved preview fixture", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "sorry-tomorrow-release-guard-"));
  const env = { ...process.env };
  delete env.SORRY_TOMORROW_LOCAL_PREVIEW;
  try {
    await mkdir(path.join(fixture, "content"));
    await writeFile(path.join(fixture, "content/episodes.json"), JSON.stringify({ episodes: [{ previewOnly: true }] }));
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("scripts/prepare-pages.mjs", projectRoot))], { cwd: fixture, env, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes("Private comic previews are present. Publication is not authorized"));
  } finally {
    await rm(fixture, { recursive: true });
  }
});
