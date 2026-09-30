import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateReaderSharing } from "../scripts/validate-reader-sharing.mjs";

const catalog = JSON.parse(await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"));
const sharing = JSON.parse(await readFile(new URL("../content/reader-sharing.json", import.meta.url), "utf8"));
const decodeHtml = value => value.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&#39;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
const site = process.env.NEXT_PUBLIC_SITE_URL || "https://sorrytomorrow.com/";

test("every exported comic exposes its own new card, download and permanent share URL", async () => {
  for (const episode of catalog.episodes.filter(item => !item.previewOnly)) {
    const html = await readFile(new URL(`../dist/client/comics/${episode.slug}/index.html`, import.meta.url), "utf8");
    const asset = sharing.episodes[episode.slug];
    const preview = new URL(asset.preview.src.replace(/^\//, ""), site).toString();
    assert.ok(html.includes(`<meta property="og:image" content="${preview}"`), episode.slug);
    assert.ok(html.includes('property="og:image:width" content="1200"'));
    assert.ok(html.includes('property="og:image:height" content="630"'));
    assert.equal(decodeHtml(html.match(/<meta property="og:image:alt" content="([^"]*)"/)?.[1] ?? ""), asset.preview.alt, episode.slug);
    assert.ok(html.includes(`download="${asset.download.filename}"`));
    assert.ok(html.includes(`https://sorrytomorrow.com/comics/${episode.slug}/`));
    assert.ok(html.includes("Share this comic") && html.includes("Copy caption + link"));
    assert.ok(!html.includes("Share this comic</button><a href=\"/#latest-comic"));
  }
});

test("all exported asset bytes and dimensions match the sharing package", async () => {
  const result = await validateReaderSharing(process.cwd(), { localPreview: process.env.SORRY_TOMORROW_LOCAL_PREVIEW === "true" });
  assert.equal(result.comics, catalog.episodes.filter(item => !item.previewOnly).length);
});

test("unapproved candidate cannot pass the production asset guard", async () => {
  if (sharing.status === "candidate") await assert.rejects(validateReaderSharing(), /await owner final review/);
  else assert.equal(sharing.status, "approved");
});
