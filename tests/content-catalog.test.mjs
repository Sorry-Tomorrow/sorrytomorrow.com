import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"),
);

test("keeps all eleven released episodes in public reading order", async () => {
  assert.equal(catalog.episodes.length, 11);
  assert.deepEqual(
    catalog.episodes.map((episode) => episode.publicNumber),
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  );
  assert.equal(new Set(catalog.episodes.map((episode) => episode.slug)).size, 11);
  assert.equal(new Set(catalog.episodes.map((episode) => episode.internalId)).size, 11);
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
  assert.equal((rss.match(/<item>/g) ?? []).length, 11);
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
  const episode = catalog.episodes.find(item => item.internalId === "ST-SCRATCH-035");
  assert.equal(episode.internalId, "ST-SCRATCH-035");
  assert.equal(episode.title, "So You Vibe-Coded an App…");
  assert.equal(episode.art.length, 4);
  assert.equal(episode.panels[0].lines[0].text, "It’s done! Our first vibe-coded app!");
  assert.equal(episode.panels[1].lines[1].text, "The other “5%…”");
  assert.deepEqual(episode.panels[2].lines, []);
  assert.equal(episode.panels[3].lines.at(-1).text, "0 users");
});

test("releases Work Life Balance with exact approved panels and dialogue", async () => {
  const ledger = JSON.parse(await readFile(new URL("../content/approved-work-life-balance-assets.json", import.meta.url), "utf8"));
  assert.equal(ledger.assets.length, 4);
  assert.equal(ledger.attributionLayout, "ST-ATTRIBUTION-LAYOUT-2");
  for (const asset of ledger.assets) {
    const bytes = await readFile(new URL(`../public/${asset.target}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, asset.target);
    assert.equal(bytes.length, asset.bytes, asset.target);
  }
  const episode = catalog.episodes.find(item => item.internalId === "ST-PROGRESS-BAR");
  assert.equal(episode.internalId, "ST-PROGRESS-BAR");
  assert.equal(episode.title, "Work Life Balance");
  assert.equal(episode.publicNumber, 10);
  assert.equal(episode.publicVersion, "v0.0.10");
  assert.equal(episode.readerLayout, "work-life-balance");
  assert.equal(episode.art.length, 3);
  assert.deepEqual(episode.art.map(a => a.src), [1,2,3].map(n => `comics/work-life-balance/p${n}.png`));
  assert.deepEqual(episode.ogImage, episode.art[0]);
  assert.deepEqual(episode.panels.map(p => p.description), episode.art.map(a => a.alt));
  assert.deepEqual(episode.panels.map(p => p.lines[0]), [
    { speaker: "Mina", text: "This new AI makes the whole client presentation for me. Two hours of work—one click." },
    { speaker: "Wes", text: "So… what’ll you do with all this newfound free time?" },
    { speaker: "Mina", text: "Shh. This is the good part." },
  ]);
  assert.equal(episode.panels[2].lines[1].text, "MAKING PRESENTATION / 99%");
});

test("Incognito Mode retains its approved native images, exact transcript and four-slide social story", async () => {
  const episode = catalog.episodes.find(item => item.internalId === "ST-INCOGNITO-MODE");
  assert.equal(episode.title, "Incognito Mode");
  assert.equal(episode.publicNumber, 11);
  assert.equal(episode.readerLayout, "incognito");
  assert.equal(episode.art.length, 4);
  const hashes = ["054f49ba702643cb04cd080401a8ed9383945b053b41b5b20c623785d5ceed43", "d877b98b1d3471e1ea4c0fc412e76ba1104445a29bf94d584f6957176b531a4e", "7a74bf977d51fd355315eac437bd3ffda3c13c7ddf12d43db9223531edf92d6a", "f7a6380aa123d022b399dc05fefde18288ede9351f5bec4ff7d6b982d4a18479"];
  for (const [i,art] of episode.art.entries()) assert.equal(createHash("sha256").update(await readFile(new URL(`../public/${art.src}`, import.meta.url))).digest("hex"),hashes[i]);
  assert.deepEqual(episode.panels.flatMap(p=>p.lines.map(l=>l.text)), ["I've checked your code. Everything is correct.", "Perfect. I trust you.", "Check this code. I don't believe a word it said.", "Why are you wearing a disguise?", "My other AI thinks we’re exclusive.", "You know it can hear you, right?"]);
  assert.deepEqual(episode.ogImage,episode.art[0]);
});
