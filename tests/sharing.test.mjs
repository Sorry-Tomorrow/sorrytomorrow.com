import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { historicalAuthoredShareCaptions } from "../app/historical-share-captions.mjs";
import { readerShareUrl, shareTargets, comicShareText, shareCaption, nativeShareText, shareDescription } from "../app/sharing.mjs";

const slug = "working-from-home-or-laundry-from-work";
const canonical = `https://sorrytomorrow.com/comics/${slug}/`;

test("reader sharing preserves the displayed episode and drops unrelated queries/fragments", () => {
  const url = new URL(readerShareUrl(`${canonical}?email=private#latest-comic`, "native", slug, 14));
  assert.equal(url.origin + url.pathname, canonical);
  assert.equal(url.searchParams.get("email"), null);
  assert.equal(url.hash, "");
  assert.equal(url.searchParams.get("utm_source"), "reader");
  assert.equal(url.searchParams.get("utm_medium"), "reader_share");
  assert.equal(url.searchParams.get("utm_campaign"), `comic-014-${slug}`);
  assert.equal(url.searchParams.get("utm_content"), "native");
});

test("platform composers encode the whole canonical URL once and preserve punctuation", () => {
  const targets = shareTargets(canonical, "Working from Home, or Laundry from Work?", slug, 14);
  for (const target of targets) {
    const url = new URL(target.href);
    const shared = url.searchParams.get("url") ?? url.searchParams.get("u") ?? url.searchParams.get("text") ?? url.searchParams.get("body");
    assert.ok(shared.includes(canonical), target.method);
    assert.ok(!target.href.includes("undefined"));
    if (target.method === "bluesky") assert.ok([...url.searchParams.get("text")].length <= 300);
  }
  assert.equal(targets.find(x => x.method === "email").href.startsWith("mailto:?"), true);
});

test("series sharing deliberately uses homepage without a fabricated comic campaign", () => {
  assert.equal(readerShareUrl("https://sorrytomorrow.com/", "native"), "https://sorrytomorrow.com/");
});

test("the newest approved captions keep their exact copy with one title and canonical link", async () => {
  const sharing = JSON.parse(await readFile(new URL("../content/reader-sharing.json", import.meta.url), "utf8"));
  const { series, episodes } = JSON.parse(await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"));
  for (const episode of episodes.filter(item => item.publicNumber >= 15)) {
    const canonical = `${series.canonicalOrigin}/comics/${episode.slug}/`;
    const approved = sharing.episodes[episode.slug].shareText;
    const text = comicShareText({ title: episode.title, seriesTitle: series.title, summary: approved, disclosure: series.disclosure, canonical });
    const copy = shareCaption(text, canonical);
    const expectedCopy = approved.split(/\r?\n/).some(line => line.trim() === canonical)
      ? approved
      : `${[`${episode.title} | ${series.title}`, `${episode.title} — ${series.title}`].includes(approved.trim()) ? approved : `${episode.title} — ${series.title}\n${approved}`}\n${canonical}`;
    assert.equal(copy, expectedCopy, episode.slug);
    assert.equal(copy.split(episode.title).length - 1, 1, episode.slug);
    assert.equal(copy.split(canonical).length - 1, 1, episode.slug);
    const native = nativeShareText(text, canonical);
    assert.ok(!native.includes(canonical), episode.slug);
    assert.ok(native.includes(episode.title));
    if (!approved.includes(canonical)) assert.ok(!native.includes(series.disclosure));
    assert.equal(shareDescription(approved, episode.caption, canonical), approved.split(/\r?\n/).some(line => line.trim() === canonical) ? episode.caption : approved);
  }
});

test("summary captions keep the title and canonical link once without generated credit", async () => {
  const sharing = JSON.parse(await readFile(new URL("../content/reader-sharing.json", import.meta.url), "utf8"));
  const { series, episodes } = JSON.parse(await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"));
  for (const episode of episodes.filter(item => item.publicNumber <= 14)) {
    const canonical = `${series.canonicalOrigin}/comics/${episode.slug}/`;
    const summary = sharing.episodes[episode.slug].shareText;
    const text = comicShareText({ title: episode.title, seriesTitle: series.title, summary, disclosure: series.disclosure, canonical });
    assert.equal(shareCaption(text, canonical), `${episode.title} — ${series.title}\n${summary}\n${canonical}`);
    assert.equal(nativeShareText(text, canonical), text);
    assert.equal(shareDescription(summary, episode.caption, canonical), summary);
  }
});

test("new summary share text adds no production credit or duplicate title", () => {
  const title = 'Dyson "Sphere Pressure"', canonical = "https://sorrytomorrow.com/comics/dyson-sphere-pressure/";
  const input = { title, seriesTitle: "Sorry, Tomorrow", summary: `${title} — Sorry, Tomorrow`, canonical,
    disclosure: "AI-assisted; human-written, directed, edited, and approved." };
  const text = comicShareText(input);
  assert.equal(text, input.summary);
  assert.equal(shareCaption(text, canonical), `${input.summary}\n${canonical}`);
  assert.equal(nativeShareText(text, canonical), input.summary);
  assert.equal(comicShareText({ ...input, summary: "The data center plan hit a wall." }), `${title} — Sorry, Tomorrow\nThe data center plan hit a wall.`);
  const complete = `${input.summary}\n\n${canonical}`;
  assert.equal(comicShareText({ ...input, summary: complete }), complete);
});
test("generated reader summaries reject production credit", () => {
  const canonical = "https://sorrytomorrow.com/comics/new/", input = { title: "New", seriesTitle: "Sorry, Tomorrow", canonical };
  assert.throws(() => comicShareText({ ...input, summary: "AI-generated comic" }), /AI-generation credit/);
});
test("a changed historical share input cannot borrow its old credit exemption", async () => {
  const sharing = JSON.parse(await readFile(new URL("../content/reader-sharing.json", import.meta.url), "utf8"));
  const { series, episodes } = JSON.parse(await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"));
  for (const episode of episodes) {
    const canonical = `${series.canonicalOrigin}/comics/${episode.slug}/`, summary = sharing.episodes[episode.slug].shareText;
    if (summary.includes(canonical)) continue;
    const input = { title: episode.title, seriesTitle: series.title, canonical, summary: `${summary}\nAI-generated comic`, disclosure: series.disclosure };
    assert.throws(() => comicShareText(input), /AI-generation credit/, episode.slug);
  }
});

test("new complete canonical captions reject production credit before returning", () => {
  const canonical = "https://sorrytomorrow.com/comics/dyson-sphere-pressure/";
  const input = { title: 'Dyson "Sphere Pressure"', seriesTitle: "Sorry, Tomorrow", canonical };
  assert.ok(!Object.hasOwn(historicalAuthoredShareCaptions, canonical));
  for (const credit of ["AI-generated comic", "AI-assisted comic by Sorry, Tomorrow.", "Created by AI"]) {
    assert.throws(() => comicShareText({ ...input, summary: `${input.title}\n\n${canonical}\n\n${credit}` }), /AI-generation credit/);
  }
});
test("the three stored authored captions are exempt only for exact canonical and complete text", () => {
  const expectedCanonicals = ["chief-babysitting-engineer", "up-up-and-out-of-tokens", "bot-tourage"]
    .map(slug => `https://sorrytomorrow.com/comics/${slug}/`);
  assert.deepEqual(Object.keys(historicalAuthoredShareCaptions).sort(), expectedCanonicals.sort());
  for (const [canonical, summary] of Object.entries(historicalAuthoredShareCaptions)) {
    const input = { title: summary.split("\n")[0], seriesTitle: "Sorry, Tomorrow", canonical, summary };
    assert.equal(comicShareText(input), summary);
    for (const changed of [summary + " Changed.", summary.replace("AI-assisted comic", "AI-generated comic"), summary + "\n"]) {
      assert.throws(() => comicShareText({ ...input, summary: changed }), /AI-generation credit/);
    }
    const otherCanonical = "https://sorrytomorrow.com/comics/new/";
    assert.throws(() => comicShareText({ ...input, canonical: otherCanonical, summary: summary.replace(canonical, otherCanonical) }), /AI-generation credit/);
  }
});
