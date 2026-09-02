import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const previewRoot = new URL("../app/_sites-preview/", import.meta.url);

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
  assert.match(html, /id="latest-comic"/);
  assert.match(html, /The Honest Demo/);
  assert.match(html, /Comic 004 · Ahead AI/);
  assert.match(html, /The Ahead AI Agent is live on your servers/);
  assert.match(html, /comics\/the-honest-demo\/p1-lettered\.svg/);
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
  assert.equal(JSON.parse(catalog).episodes.length, 4);
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

  assert.deepEqual(await (await import("node:fs/promises")).readdir(previewRoot), []);
});
