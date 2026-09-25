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
  "comics/chief-babysitting-engineer/p1.png": "7df18a1a86da3cc4e706454501af62203f62763150a639bb6a9e7c760a32c8e2",
  "comics/chief-babysitting-engineer/p1.webp": "951565850558ba547dd448b325ce0bf27f17f8bf7051d76eba0076d97a89e2ea",
  "comics/chief-babysitting-engineer/p2.png": "db48f313a7d3606db41c6244b1b43515337e9422ae9c6cdb1f55ddba5a570374",
  "comics/chief-babysitting-engineer/p2.webp": "f487514a666fd90a0dbb51ebcf31c4250037b9ed46fc7d97d23f02f3c5289da9",
  "comics/chief-babysitting-engineer/p3.png": "86eac61faf02092b7d3fc697372e34403393f6bdb9d896e06a5c25456caa2cf5",
  "comics/chief-babysitting-engineer/p3.webp": "617ebf9469ccacc8124ebd76f893216856a378c31b3fdf28af89ae26acd35ff0",
  "comics/chief-babysitting-engineer/sharing/v1/preview.jpg": "cd1d876e4361f242041fea231b9a8289b6e28ec746cc90a7e02776e27dc9a6cb",
  "comics/chief-babysitting-engineer/sharing/v1/complete.jpg": "b8088fa971f75dcd33b863b637501010d14e3886cb965e709cb672671ce9000d",
  "comics/working-from-home-or-laundry-from-work/p1.png": "17578efefa4afb0b8a172a35c55b5eb9edbecad74881774a3fc75f53288331d3",
  "comics/working-from-home-or-laundry-from-work/p1.webp": "46ea58e258afbcd8fff0c1e61cf572c651b1a97877ef7576eb49d44bff27f1c7",
  "comics/working-from-home-or-laundry-from-work/complete.png": "00c2a8e75c606ce74da6050e1421aaeab004ce2c79310985bba1789923377029",
  "comics/working-from-home-or-laundry-from-work/complete.jpg": "c763b2daa231667ba930ed12cbf816ff2bb32fa6dbaff78bcfec51248108a27e",
  "comics/six-figure-growth/p1.png": "fc1417ff6de2d238544761d0a93c40a51eb5ce10bf27ed5dfb22047277f5259d",
  "comics/six-figure-growth/p1.webp": "d0c19cf0136bba011606f08ea1b543d13de0a191565735069dc328c1eef4fc6f",
  "comics/six-figure-growth/complete.png": "c8aedfcd3d49107282df2e0c182920eb18f6c378fe34996d09a6e852a86240b8",
  "comics/six-figure-growth/complete.jpg": "a90ce5853bbe43aadf2b24f247ffb6c5b35461db7e6dee35e79b9ae42f24b52c",
  "comics/the-assistants-assistant/p1.png": "a18efa212db891ad0009bb226ad8e505ff21e58a93e40fbf0abff0953ea462db",
  "comics/the-assistants-assistant/p2.png": "85c0c668e94aac5a2bca23e3b4054d6bbd008dec954f8f442cc42003bacc87b7",
  "comics/the-assistants-assistant/p3.png": "0577f1eb4f868b5bae46eac3dcf575d6bd4e7db34026e27483ca5869a3c42a1d",
  "comics/the-assistants-assistant/p4.png": "852c869b0d0f586bbcaa6c7f697bbfb65c9ef41be2d5c2bd61c3326d682d9c7c",
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
  assert.match(html, /Comic 015 · Ahead AI/);
  assert.match(html, /<article[^>]*id="latest-comic"[^>]*data-comic-slug="chief-babysitting-engineer"/);
  assert.match(html, /Chief Babysitting Engineer/);
  assert.match(html, /Working from Home, or Laundry from Work\?/);
  assert.match(html, /comics\/chief-babysitting-engineer\/p1\.webp/);
  assert.match(html, /Six-Figure Growth\?/);
  assert.match(html, new RegExp(`href="${escapedBasePath}/comics/six-figure-growth/#comic"`));
  assert.match(html, /The Assistant’s Assistant/);
  assert.match(html, /Incognito Mode/);
  assert.match(html, /Work Life Balance/);
  assert.match(html, new RegExp('href="' + escapedBasePath + '/comics/incognito-mode/#comic"'));
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
    access(new URL("comics/the-assistants-assistant.html", outputRoot)),
    access(new URL("comics/the-assistants-assistant/index.html", outputRoot)),
    access(new URL("comics/working-from-home-or-laundry-from-work.html", outputRoot)),
    access(new URL("comics/working-from-home-or-laundry-from-work/index.html", outputRoot)),
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
  assert.match(rss, /<title>The Assistant’s Assistant<\/title>/);
  assert.match(rss, /<title>Working from Home, or Laundry from Work\?<\/title>/);
  assert.match(rss, /<title>Chief Babysitting Engineer<\/title>/);
  assert.match(sitemap, new RegExp(escapePattern(new URL("comics/working-from-home-or-laundry-from-work/", expectedSiteUrl).toString())));
  assert.match(sitemap, new RegExp(escapePattern(new URL("comics/chief-babysitting-engineer/", expectedSiteUrl).toString())));
});

test("release export has complete episode pages and exact approved assets", async () => {
  const catalog = JSON.parse(await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"));
  const ledger = JSON.parse(await readFile(new URL("../content/approved-slate-assets.json", import.meta.url), "utf8"));
  const vibeLedger = JSON.parse(await readFile(new URL("../content/approved-vibecoded-assets.json", import.meta.url), "utf8"));
  const workLifeLedger = JSON.parse(await readFile(new URL("../content/approved-work-life-balance-assets.json", import.meta.url), "utf8"));
  const laundryLedger = JSON.parse(await readFile(new URL("../content/approved-laundry-from-work-assets.json", import.meta.url), "utf8"));
  await assert.rejects(access(new URL("review/index.html", outputRoot)));
  await assert.rejects(access(new URL("review.html", outputRoot)));
  for (const episode of catalog.episodes.filter(item => item.publicNumber >= 6)) {
    const html = await readFile(new URL(`comics/${episode.slug}/index.html`, outputRoot), "utf8");
    assert.ok(!html.includes('content="noindex, nofollow"'), episode.slug);
    assert.ok(html.includes('property="article:published_time"'), episode.slug);
    for (const art of episode.art) assert.ok(html.includes(`${basePath}/${art.src}`), art.src);
    assert.ok(!html.includes('href="/review/"'), episode.slug);
  }
  for (const asset of [...ledger.assets, ...vibeLedger.assets, ...workLifeLedger.assets, ...laundryLedger.assets]) {
    const bytes = await readFile(new URL(asset.target, outputRoot));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, asset.target);
  }
  const robots = await readFile(new URL("robots.txt", outputRoot), "utf8");
  assert.match(robots, /Allow: \//);
  assert.doesNotMatch(robots, /Disallow: \//);
});

test("Chief Babysitting Engineer Pages export preserves its approved comic and reader dimensions", async () => {
  const html = await readFile(new URL("comics/chief-babysitting-engineer/index.html", outputRoot), "utf8");
  const comicPath = `${escapedBasePath}/comics/chief-babysitting-engineer`;
  assert.match(html, /<title>Chief Babysitting Engineer \| Sorry, Tomorrow<\/title>/);
  assert.ok(html.includes('content="https://sorrytomorrow.com/comics/chief-babysitting-engineer/sharing/v1/preview.jpg"'));
  for (const [index, size] of [[1, [1536, 1136]], [2, [1536, 1136]], [3, [1448, 1198]]]) {
    assert.ok(html.includes('src="' + comicPath + '/p' + index + '.png" width="' + size[0] + '" height="' + size[1] + '"'));
  }
  assert.equal([...html.matchAll(/<img\b[^>]*class="comic-panel-art"/g)].length, 3);
  assert.match(html, /The board wants us to be 10,000% more efficient with AI\./);
  assert.match(html, /I’m out of tokens!/);
  assert.match(html, /I can’t proceed without your approval!/);
  assert.match(html, /I need your permission to eat!/);
  assert.match(html, /Congratulations, Mina\. You’ve been promoted to Chief Babysitting Engineer\./);
  assert.match(html, new RegExp(`href="${escapedBasePath}/comics/working-from-home-or-laundry-from-work/#comic"`));
  assert.match(html, /You’re at the latest comic/);
});

test("Laundry from Work Pages export preserves the silent comic and native reader dimensions", async () => {
  const html = await readFile(new URL("comics/working-from-home-or-laundry-from-work/index.html", outputRoot), "utf8");
  const comicPath = `${escapedBasePath}/comics/working-from-home-or-laundry-from-work`;
  assert.match(html, /<title>Working from Home, or Laundry from Work\? \| Sorry, Tomorrow<\/title>/);
  assert.match(html, new RegExp(`<source type="image/webp" srcSet="${comicPath}/p1\\.webp"`));
  assert.ok(html.includes('src="' + comicPath + '/p1.png" width="1351" height="1244"'));
  assert.equal([...html.matchAll(/<img\b[^>]*class="comic-panel-art"/g)].length, 1);
  assert.match(html, /Single panel: Miles wears a green hoodie, cream shirt, dark trousers and a headset\./);
  assert.match(html, /No dialogue\. Attribution: © SORRY, TOMORROW\./);
  assert.match(html, new RegExp(escapePattern(new URL("comics/working-from-home-or-laundry-from-work/complete.jpg", expectedSiteUrl).toString())));
  assert.match(html, new RegExp(`href="${escapedBasePath}/comics/six-figure-growth/#comic"`));
  assert.match(html, new RegExp(`href="${escapedBasePath}/comics/chief-babysitting-engineer/#comic"`));
  assert.doesNotMatch(html, /<p>Working from Home, or Laundry from Work\?<\/p>|Screen:|Visible labels:/);
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
