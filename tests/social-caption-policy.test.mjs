import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { accounts } from "../scripts/social-connections.mjs";
import { campaignUrl, DISCLOSURE, hash, validateDraftCaption, validateManifest } from "../scripts/social/policy.mjs";

const digest = "a".repeat(64), newDigest = "b".repeat(64);
const platforms = ["x", "instagram", "facebook"];
function fixture() {
  const release = { schema: "sorry-tomorrow-social-release-v1", internalId: "ST-NEW", slug: "new", title: "New", number: 19,
    canonicalUrl: "https://sorrytomorrow.com/comics/new/", approval3Sha256: digest, sourceManifestSha256: digest,
    releaseAuthoritySha256: digest, panelOrder: ["p1"], platforms: {} };
  for (const platform of platforms) release.platforms[platform] = {
    accountId: platform === "x" ? accounts.xUserId : platform === "instagram" ? accounts.instagramId : accounts.facebookPageId,
    posts: [{ text: `New\n${campaignUrl("new", 19, platform)}`, media: [{ path: `public/social/new/${platform}/p1.${platform === "instagram" ? "jpg" : "png"}`,
      sha256: digest, bytes: 100, width: 1000, height: 1000, type: platform === "instagram" ? "image/jpeg" : "image/png",
      alt: "Complete panel.", panelIds: ["p1"] }] }],
  };
  return { release, approved: { internalId: release.internalId, manifestSha256: digest, approval3Sha256: digest,
    sourceManifestSha256: digest, releaseAuthoritySha256: digest }, policy: { baselineExcludedIds: [] },
    catalog: { episodes: [{ internalId: release.internalId, slug: release.slug, title: release.title, publicNumber: 19, art: [{}] }] } };
}
const validate = f => validateManifest(f.release, f.approved, f.catalog, f.policy);
const creditVariants = [DISCLOSURE, "AI-generated", "ai created", "AI—assisted", "AI‑generated", "AI_created",
  "artificial intelligence-assisted", "Created by AI", "Made using AI", "Illustrated with AI"];
for (const platform of platforms) for (const credit of creditVariants) test(`${platform} rejects prohibited credit: ${credit}`, () => {
  const f = fixture(); f.release.platforms[platform].posts[0].text += `\n${credit}`;
  assert.throws(() => validate(f), /AI-generation credit/);
  assert.throws(() => validateDraftCaption(f.release.platforms[platform].posts[0].text, platform, f.release), /AI-generation credit/);
});
test("AI topic language does not become a blanket ban on AI jokes", () => {
  const f = fixture();
  for (const platform of platforms) f.release.platforms[platform].posts[0].text = `Our AI assistant needs a nap.\nNew\n${campaignUrl("new", 19, platform)}`;
  assert.equal(validate(f), f.release);
});
test("draft preflight needs no fabricated approval, release manifest, or catalog entry", () => {
  const draft = { title: 'Dyson "Sphere Pressure"', slug: "dyson-sphere-pressure", number: 19 };
  const text = `The data center plan hit a wall.\n${draft.title}\n${campaignUrl(draft.slug, draft.number, "x")}`;
  const result = validateDraftCaption(text, "x", draft);
  assert.equal(result.campaignUrl, campaignUrl(draft.slug, draft.number, "x"));
  assert.equal(result.limit, 280); assert.ok(result.count < result.limit);
  assert.throws(() => validateDraftCaption(text + " @someone", "x", draft), /mention/);
  assert.throws(() => validateDraftCaption(text + "\n", "x", draft), /whitespace/);
  assert.throws(() => validateDraftCaption(text.replace(draft.title, "Wrong"), "x", draft), /title/);
  assert.throws(() => validateDraftCaption(text + " https://elsewhere.example/", "x", draft), /campaign link/);
  assert.throws(() => validateDraftCaption("x".repeat(300) + text, "x", draft), /limit/);
});
test("a new exact-caption override cannot bypass the prohibition", () => {
  const f = fixture(), text = `New\n\n${f.release.canonicalUrl}\n\nAI-assisted comic by Sorry, Tomorrow.`;
  for (const d of Object.values(f.release.platforms)) d.posts[0].text = text;
  f.policy.exactApprovedCaptions = { "ST-NEW": { title: "New", canonicalUrl: f.release.canonicalUrl, text,
    textSha256: hash(text), sourceCaption: { sha256: hash(`${text}\n`) }, approval3: { sha256: digest },
    sourceManifest: { sha256: digest }, releaseAuthority: { sha256: digest } } };
  assert.throws(() => validate(f), /AI-generation credit/);
});
test("all eight historical manifests keep their exact caption bytes and remain valid", async () => {
  const readJson = async file => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
  const [policy, catalog, index] = await Promise.all(["social/policy.json", "content/episodes.json", "social/approved-releases.json"].map(readJson));
  assert.equal(Object.keys(policy.historicalCaptionManifests).length, 8);
  const historicalHashes = [
    "0514c1e89c6b1a2b05b379cc356632dfecca6b9c54eafcbfae0e1a1fe910a585",
    "773e350d026b89c24a915078056c0b928680be7c3056c53464ce03ec598ece2a",
    "9f68dafcf7cc5734a5f16d5970b0d280766896c554ad70727a0362bb8ac106d6",
    "a578d810f0391e2f927db23172c4839080449cb65e1555854151cb390fd685b8",
    "bf2c2b2554253c335fe3d253a9619f81af135a7401ac202ba72cbfdfb8c8fbfd",
    "cb8f25d34cabbef2526d5b2c6d85355234205304f799677a9b7b169b1e76589d",
    "cc5b0b14a06d0c222867ec8fe60a608413e4ba5dc734a72c010939c1669d35b8",
    "e664d073ef355acb3e8e984bee4501230b2a6c03f340250564304b31f794b418",
  ];
  assert.deepEqual(Object.keys(policy.historicalCaptionManifests).sort(), historicalHashes.sort());
  const historicalEntries = Object.entries(index).filter(([, row]) => historicalHashes.includes(row.manifestSha256));
  assert.equal(historicalEntries.length, 8);
  for (const [slug, approved] of historicalEntries) {
    const bytes = await readFile(new URL(`../social/releases/${slug}.json`, import.meta.url));
    assert.equal(hash(bytes), approved.manifestSha256);
    const release = JSON.parse(bytes); assert.equal(validateManifest(release, approved, catalog, policy), release);
    for (const platform of platforms) {
      const altered = structuredClone(release); altered.platforms[platform].posts[0].text += " Changed.";
      assert.throws(() => validateManifest(altered, approved, catalog, policy));
    }
    const newlyRegistered = { ...approved, manifestSha256: newDigest };
    assert.throws(() => validateManifest(release, newlyRegistered, catalog, policy));
  }
});

test("new registered releases validate through the standard no-credit path without a historical exemption", async () => {
  const readJson = async file => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
  const [policy, catalog, index] = await Promise.all(["social/policy.json", "content/episodes.json", "social/approved-releases.json"].map(readJson));
  for (const [slug, approved] of Object.entries(index)) {
    if (Object.hasOwn(policy.historicalCaptionManifests, approved.manifestSha256)) continue;
    const bytes = await readFile(new URL(`../social/releases/${slug}.json`, import.meta.url));
    assert.equal(hash(bytes), approved.manifestSha256, slug);
    const release = JSON.parse(bytes);
    assert.ok(!Object.hasOwn(policy.exactApprovedCaptions ?? {}, release.internalId), slug);
    assert.equal(validateManifest(release, approved, catalog, policy), release);
    for (const platform of platforms) {
      for (const post of release.platforms[platform].posts) validateDraftCaption(post.text, platform, release);
      const altered = structuredClone(release);
      altered.platforms[platform].posts[0].text += `\n${DISCLOSURE}`;
      assert.throws(() => validateManifest(altered, approved, catalog, policy), /AI-generation credit/, `${slug}: ${platform}`);
    }
  }
});
