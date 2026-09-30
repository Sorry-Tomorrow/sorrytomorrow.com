import assert from "node:assert/strict";
import test from "node:test";
import { projectPublicLinks } from "../scripts/social/public-links.mjs";
import { validatedOfficialPosts } from "../app/official-posts.mjs";

const catalog = { episodes: [{ internalId: "ST-ONE", slug: "one" }, { internalId: "ST-TWO", slug: "two" }] };
const url = "https://x.com/sorrytomorrowco/status/123";
const old = "https://x.com/sorrytomorrowco/status/100";
const state = { status: "published", verifiedAt: "2026-09-20", verified: [{ url, copyAndAltVerified: true }] };
const row = { slug: "one", manifestSha256: "current", platforms: { x: state } };
const approved = { one: { internalId: "ST-ONE", manifestSha256: "current" } };
const makeLedger = releases => ({ schema: "sorry-tomorrow-social-ledger-v1", releases });

test("projection includes only minimal verified URL fields", () => {
  const result = projectPublicLinks(makeLedger({ "ST-ONE": { ...row, secret: "never-expose", spend: 99 } }), approved, catalog);
  assert.deepEqual(result, { schema: "sorry-tomorrow-public-social-posts-v1", comics: { one: { x: url } } });
});

test("withdrawn, failed, unverified and obsolete manifests cannot be presented as current", () => {
  for (const changed of [
    { ...row, withdrawal: { status: "withdrawn-do-not-republish" } },
    { ...row, manifestSha256: "old" },
    { ...row, platforms: { x: { ...state, status: "reconciliation-required" } } },
    { ...row, platforms: { x: { ...state, verified: [{ url, copyAndAltVerified: false }] } } },
  ]) {
    assert.deepEqual(projectPublicLinks(makeLedger({ "ST-ONE": changed }), approved, catalog, { one: { x: old } }).comics, {});
  }
});

test("corrected receipt supersedes the old row, without reviving historical seeds", () => {
  const ledger = makeLedger({
    "ST-ONE": { ...row, manifestSha256: "old", platforms: { x: { ...state, verified: [{ url: old, copyAndAltVerified: true }] } } },
    "ST-ONE@current": { ...row, internalId: "ST-ONE", correction: { supersedesManifestSha256: "old" } },
  });
  assert.deepEqual(projectPublicLinks(ledger, approved, catalog, { one: { x: old }, two: { x: old } }).comics, { one: { x: url }, two: { x: old } });
});

test("client feed validation rejects redirected or untrusted destinations and supports removal", () => {
  const feed = comics => ({ schema: "sorry-tomorrow-public-social-posts-v1", comics });
  assert.deepEqual(validatedOfficialPosts(feed({}), "one"), {});
  assert.deepEqual(validatedOfficialPosts(feed({ one: { x: url } }), "one"), { x: url });
  for (const malicious of ["javascript:alert(1)", `${url}?next=https://example.com`, "https://x.com/anotheraccount/status/123", "https://x.com.evil.example/sorrytomorrowco/status/123"]) {
    assert.equal(validatedOfficialPosts(feed({ one: { x: malicious } }), "one"), null);
  }
});
