import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const previewRoot = new URL("../app/_sites-preview/", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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

test("server-renders the Sorry, Tomorrow comic reader", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Sorry, Tomorrow<\/title>/i);
  assert.match(html, /id="latest-comic"/);
  assert.match(html, /Executive Twin/);
  assert.match(html, /First approved comic/);
  assert.match(html, /First production-ready pilot/);
  assert.match(html, /comics\/executive-twin\/p1-lettered\.svg/);
  assert.match(html, /comics\/executive-twin\/p2-lettered\.svg/);
  assert.match(html, /comics\/executive-twin\/p3-lettered\.svg/);
  assert.match(html, /comics\/executive-twin\/p4-lettered\.svg/);
  assert.doesNotMatch(
    html,
    /Design placeholder|Latest concept strip|Placeholder artwork for design review/,
  );
  assert.match(html, /Meet the people who approved this/);
  assert.match(html, /always slightly ahead of the plan/);
  assert.match(html, /Human in the loop\?/i);
  assert.match(html, /The Vibe Coder/);
  assert.match(html, /The Social Media Prophet/);
  assert.doesNotMatch(html, /The LinkedIn Prophet/);
  assert.match(html, /The App That Got Away/);
  assert.match(html, /<dialog[^>]*id="character-spotlight"/);
  assert.match(html, /Store/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("keeps the finished surface free of starter residue", async () => {
  const [page, reader, castDeck, layout, packageJson, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ComicReader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/CastDeck.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"name": "sorry-tomorrow-site"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(page, /<ComicReader \/>/);
  assert.match(page, /<CastDeck \/>/);
  assert.match(reader, /Read comic transcript/);
  assert.match(reader, /aria-keyshortcuts="ArrowLeft"/);
  assert.match(reader, /aria-keyshortcuts="ArrowRight"/);
  assert.match(reader, /comics\/executive-twin\/p1-lettered\.svg/);
  assert.match(reader, /loading=\{index === 0 \? "eager" : "lazy"\}/);
  assert.match(reader, /width=\{panel\.image\.width\}/);
  assert.match(reader, /height=\{panel\.image\.height\}/);
  assert.doesNotMatch(reader, /meeting-reduction|context-window|Design placeholder/);
  assert.match(layout, /title:\s*\{[\s\S]*default:\s*"Sorry, Tomorrow"/);
  assert.match(layout, /const socialImageUrl = new URL\("og\.png", siteUrl\)/);
  assert.match(layout, /url:\s*socialImageUrl/);
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
  assert.doesNotMatch(css, /\.cast-silhouette|\.silhouette-[1-6]/);

  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/characters/dex-vane.png", import.meta.url));
  await access(new URL("../public/characters/clara-fye.png", import.meta.url));
  await access(new URL("../public/characters/mina-sparks.png", import.meta.url));
  await access(new URL("../public/characters/wes-rollback.png", import.meta.url));
  await access(new URL("../public/characters/boomer-slate.png", import.meta.url));
  await access(new URL("../public/characters/token.png", import.meta.url));
  await access(new URL("../public/comics/executive-twin/p1-lettered.svg", import.meta.url));
  await access(new URL("../public/comics/executive-twin/p2-lettered.svg", import.meta.url));
  await access(new URL("../public/comics/executive-twin/p3-lettered.svg", import.meta.url));
  await access(new URL("../public/comics/executive-twin/p4-lettered.svg", import.meta.url));
  assert.deepEqual(await readdir(previewRoot), []);
});
