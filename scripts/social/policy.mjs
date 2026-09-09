import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { accounts } from "../social-connections.mjs";

export const ORIGIN = "https://sorrytomorrow.com";
export const PLATFORMS = ["x", "instagram", "facebook"];
export const DISCLOSURE = "AI-assisted; human-written, directed, edited, and approved.";
export const hash = value => createHash("sha256").update(value).digest("hex");
export const json = value => `${JSON.stringify(value, null, 2)}\n`;
const sha = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export const numericId = value => typeof value === "string" && /^[0-9]{1,30}$/.test(value);
export const slugValid = value => typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 120;

export function imageDimensions(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    assert.ok(bytes.length > 33 && bytes.toString("ascii", 12, 16) === "IHDR", "Invalid PNG");
    return { type: "image/png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  assert.ok(bytes[0] === 255 && bytes[1] === 216, "Unsupported image encoding");
  let i = 2;
  while (i + 4 < bytes.length) {
    assert.equal(bytes[i++], 255, "Malformed JPEG marker");
    while (bytes[i] === 255) i++;
    const marker = bytes[i++];
    if (marker === 217 || marker === 218) break;
    if (marker === 1 || marker >= 208 && marker <= 215) continue;
    const length = bytes.readUInt16BE(i);
    assert.ok(length >= 2 && i + length <= bytes.length, "Malformed JPEG length");
    if ([192,193,194].includes(marker)) {
      assert.ok(length >= 8, "Malformed JPEG dimensions");
      return { type: "image/jpeg", width: bytes.readUInt16BE(i + 5), height: bytes.readUInt16BE(i + 3) };
    }
    i += length;
  }
  throw new Error("JPEG dimensions missing");
}

export async function safeRead(root, relative) {
  assert.ok(typeof relative === "string" && /^[a-zA-Z0-9_./-]+$/.test(relative)
    && !relative.startsWith("/") && !relative.split("/").some(p => !p || p === "." || p === ".."), "Unsafe local path");
  const base = await realpath(root), full = await realpath(path.join(base, relative));
  assert.ok(full.startsWith(base + path.sep), "Path escapes checkout");
  return readFile(full);
}

export function campaignUrl(slug, number, platform) {
  assert.ok(slugValid(slug) && Number.isSafeInteger(number) && number > 0 && PLATFORMS.includes(platform));
  const url = new URL(`/comics/${slug}/`, ORIGIN);
  url.search = new URLSearchParams({ utm_source: platform, utm_medium: "organic_social",
    utm_campaign: `comic-${String(number).padStart(3, "0")}-${slug}`, utm_content: platform === "x" ? "panels" : "carousel" }).toString();
  return url.href;
}

function validateText(text, platform, release) {
  assert.ok(typeof text === "string" && text.trim() === text && text.includes(release.title) && text.includes(DISCLOSURE), "Missing approved title/disclosure");
  assert.ok(!/@[a-zA-Z0-9_]/.test(text), "Unapproved mention");
  const links = text.match(/https?:\/\/[^\s]+/g) ?? [];
  assert.deepEqual(links, [campaignUrl(release.slug, release.number, platform)], "Unexpected campaign link");
  const count = platform === "x"
    ? [...text.replace(links[0], "")].reduce((n, c) => n + (c.codePointAt(0) <= 0x10ff ? 1 : 2), 23)
    : [...text].length;
  assert.ok(count <= (platform === "x" ? 280 : 2200), "Caption exceeds limit");
}

export function validateManifest(release, approved, catalog, policy) {
  assert.equal(release.schema, "sorry-tomorrow-social-release-v1");
  assert.ok(slugValid(release.slug) && typeof release.internalId === "string" && release.internalId.length <= 100);
  assert.ok(Number.isSafeInteger(release.number) && release.number > 0);
  const episode = catalog.episodes.find(e => e.internalId === release.internalId && e.slug === release.slug);
  assert.ok(episode && !episode.previewOnly, "Comic absent from released catalog");
  assert.equal(episode.publicNumber, release.number);
  assert.equal(episode.title, release.title);
  assert.equal(release.canonicalUrl, `${ORIGIN}/comics/${release.slug}/`);
  assert.ok(approved && sha(approved.manifestSha256) && sha(release.approval3Sha256)
    && sha(release.sourceManifestSha256) && sha(release.releaseAuthoritySha256), "Missing hash-bound approval evidence");
  assert.equal(approved.approval3Sha256, release.approval3Sha256);
  assert.equal(approved.sourceManifestSha256, release.sourceManifestSha256);
  assert.equal(approved.releaseAuthoritySha256, release.releaseAuthoritySha256);
  assert.equal(approved.internalId, release.internalId);
  assert.ok(!policy.baselineExcludedIds.includes(release.internalId), "Existing comic excluded from backfill");
  assert.deepEqual(Object.keys(release.platforms).sort(), [...PLATFORMS].sort(), "Require each approved destination");
  assert.deepEqual(release.panelOrder, episode.art.map((_, i) => `p${i + 1}`), "Canonical panel order differs");
  for (const platform of PLATFORMS) {
    const destination = release.platforms[platform];
    assert.equal(destination.accountId, platform === "x" ? accounts.xUserId : platform === "instagram" ? accounts.instagramId : accounts.facebookPageId);
    assert.ok(Array.isArray(destination.posts) && destination.posts.length > 0 && destination.posts.length <= (platform === "x" ? 3 : 1));
    const order = [];
    for (const post of destination.posts) {
      validateText(post.text, platform, release);
      assert.ok(Array.isArray(post.media) && post.media.length > 0 && post.media.length <= (platform === "x" ? 4 : 10));
      const shapes = [];
      for (const media of post.media) {
        assert.ok(sha(media.sha256) && Number.isSafeInteger(media.bytes) && media.bytes > 0);
        assert.ok(Number.isSafeInteger(media.width) && media.width > 0 && Number.isSafeInteger(media.height) && media.height > 0);
        assert.ok(media.path.startsWith(`public/social/${release.slug}/`) && /^public\/social\/[a-z0-9-]+\/[a-z0-9/-]+\.(png|jpg)$/.test(media.path), "Unsafe media path");
        assert.ok(typeof media.alt === "string" && media.alt.trim() && [...media.alt].length <= 1000, "Missing or excessive alt text");
        assert.ok(Array.isArray(media.panelIds) && media.panelIds.length > 0);
        order.push(...media.panelIds);
        assert.ok(media.bytes <= (platform === "x" ? 5_000_000 : 8_000_000), "Image exceeds platform limit");
        assert.ok(["image/png", "image/jpeg"].includes(media.type));
        if (platform === "instagram") {
          assert.equal(media.type, "image/jpeg", "Instagram requires approved JPEG");
          assert.ok(media.width >= 320 && media.width / media.height >= 0.8 && media.width / media.height <= 1.91, "Instagram aspect ratio invalid");
          shapes.push(media.width / media.height);
        }
      }
      if (shapes.length) assert.ok(shapes.every(ratio => Math.abs(ratio - shapes[0]) < 0.00001), "Carousel aspect ratios differ");
    }
    assert.deepEqual(order, release.panelOrder, "Missing, duplicated or reordered story panels");
  }
  return release;
}

export async function loadReleases(root) {
  const catalog = JSON.parse(await safeRead(root, "content/episodes.json"));
  const policy = JSON.parse(await safeRead(root, "social/policy.json"));
  const index = JSON.parse(await safeRead(root, "social/approved-releases.json"));
  assert.equal(policy.schema, "sorry-tomorrow-social-policy-v1");
  assert.equal(policy.repository, accounts.repository);
  assert.equal(policy.xMonthlyCapUsd, 5);
  assert.ok(Array.isArray(policy.baselineExcludedIds) && new Set(policy.baselineExcludedIds).size === policy.baselineExcludedIds.length);
  const releases = [];
  for (const [slug, approved] of Object.entries(index)) {
    assert.ok(slugValid(slug));
    const bytes = await safeRead(root, `social/releases/${slug}.json`);
    assert.equal(hash(bytes), approved.manifestSha256, "Release manifest changed after selection");
    const release = validateManifest(JSON.parse(bytes), approved, catalog, policy);
    assert.equal(release.slug, slug);
    assert.equal(hash(await safeRead(root, `social/authorities/${slug}.json`)), release.releaseAuthoritySha256, "Release authority changed");
    for (const destination of Object.values(release.platforms)) for (const post of destination.posts) for (const media of post.media) {
      const payload = await safeRead(root, media.path);
      assert.equal(payload.length, media.bytes, "Media size changed");
      assert.equal(hash(payload), media.sha256, "Media bytes changed");
      assert.deepEqual(imageDimensions(payload), {type: media.type, width: media.width, height: media.height});
    }
    releases.push({ release, manifestSha256: approved.manifestSha256 });
  }
  return { catalog, policy, releases };
}
