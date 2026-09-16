import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const previewRoot = new URL("../app/_sites-preview/", import.meta.url);

async function readDirectoryIfPresent(directory) {
  try {
    return await (await import("node:fs/promises")).readdir(directory);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the data-driven homepage and archive", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sorry, Tomorrow<\/title>/i);
  assert.match(html, /<meta name="google-site-verification" content="IcrV7AVagPbGnDhPwGSqlYrOaD0xk8vabpn0yyJKunI"/);
  assert.match(html, /id="latest-comic"/);
  assert.match(html, /Not-So-Smart Thermostat/);
  assert.match(html, /Oops… I Drifted Again/);
  assert.match(html, /The Magnification Spiral/);
  assert.match(html, /Founder, Inc\. LLC/);
  assert.match(html, /Comic 014 · Ahead AI/);
  assert.match(html, /<article[^>]*id="latest-comic"[^>]*data-comic-slug="working-from-home-or-laundry-from-work"/);
  assert.match(html, /Working from Home, or Laundry from Work\?/);
  assert.match(html, /comics\/working-from-home-or-laundry-from-work\/p1\.webp/);
  assert.match(html, /Six-Figure Growth\?/);
  assert.match(html, /href="\/comics\/six-figure-growth\/#comic"/);
  assert.match(html, /The Assistant’s Assistant/);
  assert.match(html, /Incognito Mode/);
  assert.match(html, /Work Life Balance/);
  assert.match(html, /href="\/comics\/incognito-mode\/#comic"/);
  assert.match(html, /So You Vibe-Coded an App…/);
  assert.match(html, /href="\/comics\/so-you-vibe-coded-an-app\/#comic"/);
  assert.match(html, /The Honest Demo/);
  assert.match(html, /Vibe Coding in Your Sleep/);
  assert.match(html, /Executive Twin/);
  assert.match(html, /Undefeated/);
  assert.match(html, /href="\/comics\/the-honest-demo\/#comic"/);
  assert.match(html, /href="\/comics\/vibe-coding-in-your-sleep\/#comic"/);
  assert.match(html, /href="\/comics\/undefeated\/#comic"/);
  assert.match(html, /href="\/comics\/executive-twin\/#comic"/);
  assert.doesNotMatch(html, /href="\?comic=/);
  assert.match(html, /href="\/rss\.xml"/);
  assert.match(html, /AI-assisted; human-written, directed, edited, and approved/);
  assert.doesNotMatch(html, /Latest approved comic|production-ready pilot/i);
  assert.doesNotMatch(
    html,
    /Design placeholder|Latest concept strip|Placeholder artwork for design review/,
  );
  assert.match(html, /Meet the people responsible for this/);
  assert.match(html, /always slightly ahead of the plan/);
  assert.match(html, /Human in the loop\?/i);
  assert.match(html, /The Vibe Coder/);
  assert.match(html, /The Social Media Prophet/);
  assert.doesNotMatch(html, /The LinkedIn Prophet/);
  assert.match(html, /The App That Got Away/);
  assert.match(html, /<dialog[^>]*id="character-spotlight"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/sorrytomorrow\.com"/);
});

test("server-renders a unique canonical episode page", async () => {
  const response = await render("/comics/executive-twin");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /<title>Executive Twin \| Sorry, Tomorrow<\/title>/);
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/sorrytomorrow\.com\/comics\/executive-twin\/"/,
  );
  assert.match(
    html,
    /<meta property="og:image" content="https:\/\/sorrytomorrow\.com\/comics\/executive-twin\/og\.png"/,
  );
  assert.match(html, /I trained a digital twin on my entire leadership style/);
  assert.match(html, /id="comic"/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /The Honest Demo, 4 panels/);
});

test("server-renders the Assistant release with its approved title, preview and complete story", async () => {
  const response = await render("/comics/the-assistants-assistant");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>The Assistant’s Assistant \| Sorry, Tomorrow<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/sorrytomorrow\.com\/comics\/the-assistants-assistant\/"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/sorrytomorrow\.com\/comics\/the-assistants-assistant\/p1\.png"/);
  assert.match(html, /reader-layout-assistant/);
  assert.match(html, /Finally! An AI assistant to handle all my day-to-day work/);
  assert.match(html, /Could you handle the calls\? I need somewhere quiet to work\./);
  assert.match(html, /Of course\. I’ll work out here\./);
  assert.match(html, /Can I talk to your AI assistant\?/);
  assert.match(html, /Do you have an appointment\?/);
  assert.match(html, /Visible labels: AI; BOOMER SLATE/);
});

test("keeps the finished surface free of starter residue", async () => {
  const [page, reader, castDeck, layout, packageJson, css, catalog, route] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/ComicReader.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/CastDeck.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../content/episodes.json", import.meta.url), "utf8"),
      readFile(new URL("../app/comics/[slug]/page.tsx", import.meta.url), "utf8"),
    ]);

  assert.match(packageJson, /"name": "sorry-tomorrow-site"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(page, /<ComicReader episode=\{latest\} \/>/);
  assert.match(page, /episodes\.map/);
  assert.match(reader, /Read comic transcript/);
  assert.match(reader, /ComicKeyboardNavigation/);
  assert.match(reader, /publicAssetPath\(art\.src\)/);
  assert.match(route, /generateStaticParams/);
  assert.match(route, /generateMetadata/);
  assert.match(route, /CreativeWork/);
  assert.equal(JSON.parse(catalog).episodes.length, 14);
  assert.match(layout, /application\/rss\+xml/);
  assert.match(layout, /AnalyticsBeacon/);
  assert.equal([...castDeck.matchAll(/slug:\s*"/g)].length, 11);
  assert.match(castDeck, /showModal\(\)/);
  assert.match(castDeck, /searchParams\.set\("character"/);
  assert.match(castDeck, /aria-current=/);
  assert.match(castDeck, /cast-card-word-tight/);
  assert.match(castDeck, /characters\/dex-vane\.png/);
  assert.match(castDeck, /characters\/clara-fye\.png/);
  assert.match(castDeck, /characters\/mina-sparks\.png/);
  assert.match(castDeck, /characters\/wes-rollback\.png/);
  assert.match(castDeck, /characters\/boomer-slate\.png/);
  assert.match(castDeck, /characters\/token\.png/);
  assert.match(css, /\.cast-card-name > span[\s\S]*white-space:\s*nowrap/);
  assert.doesNotMatch(css, /\.cast-card-has-image::after/);
  assert.match(css, /\.cast-card-portrait[\s\S]*bottom:\s*0/);
  assert.doesNotMatch(page, /cast-silhouette/);
  assert.doesNotMatch(css, /\.cast-silhouette|\.silhouette-\[1-6\]/);

  await Promise.all([
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../public/sitemap.xml", import.meta.url)),
    access(new URL("../public/rss.xml", import.meta.url)),
    access(new URL("../public/robots.txt", import.meta.url)),
    access(new URL("../public/characters/dex-vane.png", import.meta.url)),
    access(new URL("../public/characters/clara-fye.png", import.meta.url)),
    access(new URL("../public/characters/mina-sparks.png", import.meta.url)),
    access(new URL("../public/characters/wes-rollback.png", import.meta.url)),
    access(new URL("../public/characters/boomer-slate.png", import.meta.url)),
    access(new URL("../public/characters/token.png", import.meta.url)),
    access(new URL("../app/not-found.tsx", import.meta.url)),
    access(new URL("../content/episodes.ts", import.meta.url)),
  ]);

  assert.deepEqual(await readDirectoryIfPresent(previewRoot), []);
});

test("released layout-specific comics render exact panels, versions and publication metadata", async () => {
  const catalog = JSON.parse(await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"));
  for (const episode of catalog.episodes.filter(item => item.publicNumber >= 6)) {
    const response = await render(`/comics/${episode.slug}`);
    assert.equal(response.status, 200, episode.slug);
    const html = await response.text();
    assert.ok(!html.includes('content="noindex, nofollow"'), `Blocked indexing: ${episode.slug}`);
    assert.ok(!html.includes('href="/review/"'), `Private review link: ${episode.slug}`);
    assert.ok(html.includes(episode.publicVersion), `Missing version: ${episode.slug}`);
    assert.ok(html.includes('property="article:published_time"'), `Missing publication date: ${episode.slug}`);
    assert.ok(html.includes(`href="https://sorrytomorrow.com/comics/${episode.slug}/"`), `Wrong canonical: ${episode.slug}`);
    assert.ok(!html.includes("Website preview") && !html.includes("Private preview"), episode.slug);
    const images = [...html.matchAll(/<img\b[^>]*class="comic-panel-art"[^>]*>/g)].map(match => match[0]);
    assert.equal(images.length, episode.art.length, episode.slug);
    episode.art.forEach((art, index) => {
      assert.ok(images[index].includes(`src="/${art.src}"`), `Wrong image/order: ${art.src}`);
      assert.ok(images[index].includes(`width="${art.width}"`) && images[index].includes(`height="${art.height}"`), `Wrong dimensions: ${art.src}`);
    });
    if (episode.readerLayout) assert.ok(html.includes(`reader-layout-${episode.readerLayout}`));
  }
});

test("private review collection is not exposed by the released site", async () => {
  const response = await render("/review");
  assert.equal(response.status, 404);
});

test("published navigation connects Founder through the latest release", async () => {
  for (const [slug, older, newer] of [
    ["founder-inc-llc", "the-honest-demo", "not-so-smart-thermostat"],
    ["not-so-smart-thermostat", "founder-inc-llc", "oops-i-drifted-again"],
    ["oops-i-drifted-again", "not-so-smart-thermostat", "magnification-spiral"],
    ["magnification-spiral", "oops-i-drifted-again", "so-you-vibe-coded-an-app"],
    ["so-you-vibe-coded-an-app", "magnification-spiral", "work-life-balance"],
    ["work-life-balance", "so-you-vibe-coded-an-app", "incognito-mode"],
    ["incognito-mode", "work-life-balance", "the-assistants-assistant"],
    ["the-assistants-assistant", "incognito-mode", "six-figure-growth"],
    ["six-figure-growth", "the-assistants-assistant", "working-from-home-or-laundry-from-work"],
    ["working-from-home-or-laundry-from-work", "six-figure-growth", null],
  ]) {
    const response = await render(`/comics/${slug}`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`href="/comics/${older}/#comic"`), slug);
    if (newer) assert.ok(html.includes(`href="/comics/${newer}/#comic"`), slug);
    else assert.ok(html.includes("You’re at the latest comic"), slug);
  }
});

test("single-panel release renders approved WebP with PNG fallback, exact transcript and social preview", async () => {
  const response = await render("/comics/six-figure-growth");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Six-Figure Growth\? \| Sorry, Tomorrow<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/sorrytomorrow\.com\/comics\/six-figure-growth\/"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/sorrytomorrow\.com\/comics\/six-figure-growth\/complete\.jpg"/);
  assert.match(html, /reader-layout-single-panel/);
  assert.match(html, /<source type="image\/webp" srcSet="\/comics\/six-figure-growth\/p1\.webp"/);
  assert.match(html, /<img class="comic-panel-art" src="\/comics\/six-figure-growth\/p1\.png" width="1193" height="1318"/);
  assert.match(html, /aria-label="Six-Figure Growth\?, 1 panel"/);
  assert.match(html, /Screen: MONTHLY AI BILL Screen: \$128,640/);
  assert.match(html, /No dialogue\./);
  assert.doesNotMatch(html, /<p>Six-Figure Growth\?<\/p>/);
});

test("Laundry from Work renders one complete silent panel, exact transcript and titled link preview", async () => {
  const response = await render("/comics/working-from-home-or-laundry-from-work");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Working from Home, or Laundry from Work\? \| Sorry, Tomorrow<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/sorrytomorrow\.com\/comics\/working-from-home-or-laundry-from-work\/"/);
  assert.match(html, /<meta property="og:image" content="https:\/\/sorrytomorrow\.com\/comics\/working-from-home-or-laundry-from-work\/complete\.jpg"/);
  assert.match(html, /reader-layout-single-panel/);
  assert.match(html, /Comic 014 · Ahead AI · v0\.0\.14/);
  assert.match(html, /<source type="image\/webp" srcSet="\/comics\/working-from-home-or-laundry-from-work\/p1\.webp"/);
  assert.match(html, /<img class="comic-panel-art" src="\/comics\/working-from-home-or-laundry-from-work\/p1\.png" width="1351" height="1244"/);
  assert.equal([...html.matchAll(/<img\b[^>]*class="comic-panel-art"/g)].length, 1);
  assert.match(html, /aria-label="Working from Home, or Laundry from Work\?, 1 panel"/);
  assert.match(html, /Single panel: Miles wears a green hoodie, cream shirt, dark trousers and a headset\./);
  assert.match(html, /The laptop shows his own matching face, hoodie and headset in a spacious, tidy office with city-view windows and bookshelves\./);
  assert.match(html, /Small call and enhancement icons appear, without words\. No dialogue\. Attribution: © SORRY, TOMORROW\./);
  assert.doesNotMatch(html, /<p>Working from Home, or Laundry from Work\?<\/p>/);
  assert.doesNotMatch(html, /Screen:|Visible labels:/);
});
