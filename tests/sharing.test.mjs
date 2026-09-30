import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
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
    assert.equal(copy, approved, episode.slug);
    assert.equal(copy.split(episode.title).length - 1, 1, episode.slug);
    assert.equal(copy.split(canonical).length - 1, 1, episode.slug);
    const native = nativeShareText(text, canonical);
    assert.ok(!native.includes(canonical), episode.slug);
    assert.ok(native.includes(episode.title) && native.includes("AI-assisted comic by Sorry, Tomorrow."));
    assert.equal(shareDescription(approved, episode.caption, canonical), episode.caption);
  }
});

test("candidate summary captions keep the title, disclosure and canonical link once", async () => {
  const sharing = JSON.parse(await readFile(new URL("../content/reader-sharing.json", import.meta.url), "utf8"));
  const { series, episodes } = JSON.parse(await readFile(new URL("../content/episodes.json", import.meta.url), "utf8"));
  for (const episode of episodes.filter(item => item.publicNumber <= 14)) {
    const canonical = `${series.canonicalOrigin}/comics/${episode.slug}/`;
    const summary = sharing.episodes[episode.slug].shareText;
    const text = comicShareText({ title: episode.title, seriesTitle: series.title, summary, disclosure: series.disclosure, canonical });
    assert.equal(shareCaption(text, canonical), `${episode.title} — ${series.title}\n${summary}\n${series.disclosure}\n${canonical}`);
    assert.equal(nativeShareText(text, canonical), text);
    assert.equal(shareDescription(summary, episode.caption, canonical), summary);
  }
});
