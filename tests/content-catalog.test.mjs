import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"),
);

test("keeps one ordered public episode catalog", async () => {
  assert.equal(catalog.episodes.length, 4);
  assert.deepEqual(
    catalog.episodes.map((episode) => episode.publicNumber),
    [4, 3, 2, 1],
  );
  assert.equal(new Set(catalog.episodes.map((episode) => episode.slug)).size, 4);
  assert.equal(new Set(catalog.episodes.map((episode) => episode.internalId)).size, 4);

  for (const episode of catalog.episodes) {
    assert.match(episode.slug, /^[-a-z0-9]+$/);
    assert.ok(episode.art.length > 0);
    assert.ok(episode.panels.length > 0);
    assert.ok(episode.ogImage.alt.length > 0);
    await access(new URL(`../public/${episode.ogImage.src}`, import.meta.url));
    for (const art of episode.art) {
      await access(new URL(`../public/${art.src}`, import.meta.url));
    }
  }

  assert.ok(catalog.series.disclosure.includes("human-written"));
  await access(new URL("../public/sitemap.xml", import.meta.url));
  await access(new URL("../public/rss.xml", import.meta.url));
  await access(new URL("../public/robots.txt", import.meta.url));
  await access(new URL("../app/comics/[slug]/page.tsx", import.meta.url));
  await access(new URL("../app/not-found.tsx", import.meta.url));
  await access(new URL("../content/episodes.ts", import.meta.url));
  await access(projectRoot);
});
