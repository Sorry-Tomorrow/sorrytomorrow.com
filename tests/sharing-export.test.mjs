import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
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

test("the approved seven-panel download ships unchanged while both role budgets remain enforced", async () => {
  const episode = catalog.episodes.find(item => item.slug === "bot-tourage");
  const row = structuredClone(sharing.episodes[episode.slug]);
  const fixture = await mkdtemp(join(tmpdir(), "sorry-tomorrow-sharing-budget-"));
  const packageData = { ...sharing, episodes: { [episode.slug]: row } };
  const fixturePath = asset => join(fixture, "public", asset.src.replace(/^\//, ""));
  const hash = bytes => createHash("sha256").update(bytes).digest("hex");
  const savePackage = () => writeFile(join(fixture, "content/reader-sharing.json"), JSON.stringify(packageData));
  try {
    await mkdir(join(fixture, "content"), { recursive: true });
    await writeFile(join(fixture, "content/episodes.json"), JSON.stringify({ ...catalog, episodes: [episode] }));
    const original = {};
    for (const role of ["preview", "download"]) {
      const asset = row[role];
      original[role] = await readFile(new URL(`../public/${asset.src.replace(/^\//, "")}`, import.meta.url));
      await mkdir(dirname(fixturePath(asset)), { recursive: true });
      await writeFile(fixturePath(asset), original[role]);
    }
    assert.equal(original.download.length, 5_598_332);
    await savePackage();
    assert.equal((await validateReaderSharing(fixture)).files, 2);
    // Matching metadata/hashes ensure rejection is the role budget, not a
    // changed-byte guard that would hide an accidental relaxation of the cap.
    for (const [role, extraBytes, message] of [["preview", 5_000_000, /preview: image must be under 5 MB/], ["download", 5_000_000, /download: image must be under 10 MB/]]) {
      const asset = row[role], oversized = Buffer.concat([original[role], Buffer.alloc(extraBytes)]);
      await writeFile(fixturePath(asset), oversized);
      asset.bytes = oversized.length; asset.sha256 = hash(oversized);
      await savePackage();
      await assert.rejects(validateReaderSharing(fixture), message);
      await writeFile(fixturePath(asset), original[role]);
      asset.bytes = original[role].length; asset.sha256 = hash(original[role]);
      await savePackage();
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
