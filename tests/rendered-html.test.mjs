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
  assert.match(html, /Meet the people who approved this/);
  assert.match(html, /Store/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/);
});

test("keeps the finished surface free of starter residue", async () => {
  const [page, reader, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ComicReader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"name": "sorry-tomorrow-site"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(page, /<ComicReader \/>/);
  assert.match(reader, /Read comic transcript/);
  assert.match(reader, /aria-keyshortcuts="ArrowLeft"/);
  assert.match(reader, /aria-keyshortcuts="ArrowRight"/);
  assert.match(layout, /title:\s*\{[\s\S]*default:\s*"Sorry, Tomorrow"/);
  assert.match(layout, /const socialImageUrl = new URL\("og\.png", siteUrl\)/);
  assert.match(layout, /url:\s*socialImageUrl/);

  await access(new URL("../public/og.png", import.meta.url));
  assert.deepEqual(await readdir(previewRoot), []);
});
