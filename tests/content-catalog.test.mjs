import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"),
);

test("keeps all nine released episodes in public reading order", async () => {
  assert.equal(catalog.episodes.length, 9);
  assert.deepEqual(
    catalog.episodes.map((episode) => episode.publicNumber),
    [9, 8, 7, 6, 5, 4, 3, 2, 1],
  );
  assert.equal(new Set(catalog.episodes.map((episode) => episode.slug)).size, 9);
  assert.equal(new Set(catalog.episodes.map((episode) => episode.internalId)).size, 9);
  assert.equal(catalog.episodes.filter(episode => episode.previewOnly).length, 0);
  for (const episode of catalog.episodes) {
    assert.ok(!Number.isNaN(Date.parse(episode.websitePublishedAt)));
  }

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

test("imports the approved slate without changing asset bytes or panel order", async () => {
  const ledger = JSON.parse(await readFile(new URL("../content/approved-slate-assets.json", import.meta.url), "utf8"));
  assert.equal(ledger.assets.length, 21);
  for (const asset of ledger.assets) {
    const bytes = await readFile(new URL(`../public/${asset.target}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, asset.target);
    assert.equal(bytes.length, asset.bytes, asset.target);
  }
  for (const [id, count, prefix] of [["ST-SCRATCH-032", 6, "s"], ["ST-SCRATCH-033", 4, "p"], ["ST-SCRATCH-034", 5, "p"]]) {
    const episode = catalog.episodes.find(item => item.internalId === id);
    assert.equal(episode.art.length, count, id);
    assert.equal(episode.panels.length, count, id);
    episode.art.forEach((art, index) => assert.ok(art.src.split("/").at(-1).startsWith(`${prefix}${index + 1}-`), art.src));
  }
  const thermostat = catalog.episodes.find(item => item.internalId === "ST-SCRATCH-032");
  assert.deepEqual(thermostat.panels[1].lines, [
    { speaker: "Mina", text: "There… we… go." },
    { speaker: "Mina", text: "I connected the thermostat to Token. Now you can just ask him to change it to whatever you want!" },
  ]);
  for (const id of ["ST-SCRATCH-033", "ST-SCRATCH-034"]) {
    assert.ok(catalog.episodes.find(item => item.internalId === id).panels.every(panel => panel.lines.length === 0));
  }
});

test("all released episodes enter RSS and sitemap", async () => {
  const [rss, sitemap] = await Promise.all(["rss.xml", "sitemap.xml"].map(file => readFile(new URL(`../public/${file}`, import.meta.url), "utf8")));
  for (const episode of catalog.episodes) {
    for (const output of [rss, sitemap]) {
      assert.equal(output.includes(`/comics/${episode.slug}/`), !episode.previewOnly, episode.slug);
    }
  }
  assert.equal((rss.match(/<item>/g) ?? []).length, 9);
  assert.ok(!rss.includes("Invalid Date") && !sitemap.includes("Invalid Date"));
});

test("imports the approved vibe-coded comic with attribution and exact copy", async () => {
  const ledger = JSON.parse(await readFile(new URL("../content/approved-vibecoded-assets.json", import.meta.url), "utf8"));
  assert.equal(ledger.attributionStandard, "ST-ATTRIBUTION-1");
  assert.equal(ledger.assets.length, 5);
  for (const asset of ledger.assets) {
    const bytes = await readFile(new URL(`../public/${asset.target}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, asset.target);
  }
  const episode = catalog.episodes[0];
  assert.equal(episode.internalId, "ST-SCRATCH-035");
  assert.equal(episode.title, "So You Vibe-Coded an App…");
  assert.equal(episode.art.length, 4);
  assert.equal(episode.panels[0].lines[0].text, "It’s done! Our first vibe-coded app!");
  assert.equal(episode.panels[1].lines[1].text, "The other “5%…”");
  assert.deepEqual(episode.panels[2].lines, []);
  assert.equal(episode.panels[3].lines.at(-1).text, "0 users");
});
