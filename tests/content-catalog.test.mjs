import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const catalog = JSON.parse(
  await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"),
);

test("keeps all twelve release entries in public reading order", async () => {
  assert.equal(catalog.episodes.length, 12);
  assert.deepEqual(
    catalog.episodes.map((episode) => episode.publicNumber),
    [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  );
  assert.equal(new Set(catalog.episodes.map((episode) => episode.slug)).size, 12);
  assert.equal(new Set(catalog.episodes.map((episode) => episode.internalId)).size, 12);
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
  assert.equal((rss.match(/<item>/g) ?? []).length, 12);
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

test("The Assistant’s Assistant imports only the four exact approved website PNGs", async () => {
  const episode = catalog.episodes.find(item => item.internalId === "ST-ASSISTANTS-ASSISTANT");
  assert.equal(catalog.episodes[0], episode);
  assert.equal(episode.title, "The Assistant’s Assistant");
  assert.equal(episode.publicNumber, 12);
  assert.equal(episode.publicVersion, "v0.0.12");
  assert.equal(episode.readerLayout, "assistant");
  assert.equal(episode.shell, "art-first");
  assert.equal(episode.caption, "Finally, someone to take work off your plate.");
  // Planned release metadata; the publication receipt is recorded only after live verification.
  assert.equal(episode.websitePublishedAt, "2026-09-14T20:15:00Z");
  assert.deepEqual(episode.art.map(art => art.src), [1, 2, 3, 4].map(n => `comics/the-assistants-assistant/p${n}.png`));
  assert.deepEqual(episode.ogImage, episode.art[0]);
  assert.deepEqual(episode.art.map(art => art.alt), [
    "In a sunlit office, Boomer sits at a spacious wooden desk and gestures happily toward a smiling AI face on his monitor. A narrow wheeled telephone desk waits nearby. He says, “Finally. An AI assistant to handle my calls and calendar.”",
    "A closer view shows Boomer listening with a finger to his headset. The AI smiles from his monitor and says, “Could you handle the calls? I need somewhere quiet to work.”",
    "Cheerfully pushing the narrow desk, its full-size telephone and appointment pad through his office doorway, Boomer says, “Of course. I’ll work out here.” The AI remains at the spacious workstation inside.",
    "Clara approaches Boomer, who is now seated at the tiny telephone desk in the hallway, his knees crowded around its supports. His former workstation and the AI remain inside the glass office. Clara asks, “Can I talk to your AI assistant?” Boomer raises a helpful finger and replies, “Do you have an appointment?”",
  ]);
  assert.deepEqual(episode.panels.map(panel => panel.description), episode.art.map(art => art.alt));
  assert.deepEqual(episode.panels.map(panel => panel.lines), [
    [
      { speaker: "Boomer", text: "Finally. An AI assistant to handle my calls and calendar." },
      { speaker: "Visible labels", text: "AI" },
    ],
    [
      { speaker: "AI assistant", text: "Could you handle the calls? I need somewhere quiet to work." },
      { speaker: "Visible labels", text: "AI" },
    ],
    [
      { speaker: "Boomer", text: "Of course. I’ll work out here." },
      { speaker: "Visible labels", text: "AI; BOOMER SLATE" },
    ],
    [
      { speaker: "Clara", text: "Can I talk to your AI assistant?" },
      { speaker: "Boomer", text: "Do you have an appointment?" },
      { speaker: "Visible labels", text: "AI; BOOMER SLATE" },
    ],
  ]);
  const hashes = [
    "df5c133294f0a93983f652003133ca49a3be7113da4146e2aced67e6fb4660d8",
    "e6acda0e55d019216d67463ee0760b23d2adf73766901be97d3b06c8d9819c15",
    "0577f1eb4f868b5bae46eac3dcf575d6bd4e7db34026e27483ca5869a3c42a1d",
    "852c869b0d0f586bbcaa6c7f697bbfb65c9ef41be2d5c2bd61c3326d682d9c7c",
  ];
  const sizes = [3297593, 3185889, 3245195, 3202279];
  for (const [index, art] of episode.art.entries()) {
    const bytes = await readFile(new URL(`../public/${art.src}`, import.meta.url));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), hashes[index], art.src);
    assert.equal(bytes.length, sizes[index], art.src);
    assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG");
    assert.equal(bytes.readUInt32BE(16), art.width);
    assert.equal(bytes.readUInt32BE(20), art.height);
  }
  assert.deepEqual(
    (await readdir(new URL("../public/comics/the-assistants-assistant/", import.meta.url))).sort(),
    ["p1.png", "p2.png", "p3.png", "p4.png"],
  );
});

test("the Assistant reader keeps its approved desktop grid and natural full-width mobile flow", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rules = selector => [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(match => match[1].trim() === selector).map(match => match[2]);
  const stage = rules(".reader-layout-assistant .art-first-reader-stage");
  assert.match(stage[0], /max-width: 1600px/);
  assert.match(stage[0], /padding-right: 0; padding-left: 0/);
  assert.match(rules(".reader-layout-assistant .art-first-comic-page")[0], /width: 100%/);
  const grid = rules(".reader-layout-assistant .art-first-comic-art");
  assert.equal(grid.length, 2);
  assert.match(grid[0], /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(grid[0], /align-items: start; gap: 22px/);
  assert.match(grid[1], /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); gap: 28px 24px/);
  assert.match(css, /@media \(min-width: 1100px\) \{\s*\.reader-layout-assistant/);
  assert.match(rules(".reader-layout-assistant .art-first-comic-art .comic-panel-art")[0], /width: 100%; height: auto; transform: none; border: 0; box-shadow: none/);
  assert.equal(
    rules(".reader-layout-assistant .art-first-episode-header h2")[0].trim(),
    rules(".reader-layout-incognito .art-first-episode-header h2")[0].trim(),
  );
  assert.doesNotMatch(css, /\.reader-layout-assistant[^{}]*(?:nth-child|last-child|first-child)/);
});
