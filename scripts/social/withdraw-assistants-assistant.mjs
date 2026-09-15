// One owner-authorized incident only. Never import this into the publisher.
import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { accounts } from "../social-connections.mjs";
import { makeApi, safeError, SocialError, verifyPlatform } from "./adapters.mjs";
import { githubApi, loadLedger } from "./ledger.mjs";

export const TARGET = Object.freeze({
  internalId: "ST-ASSISTANTS-ASSISTANT",
  sourceCommit: "13fa60877f2228b91c747ad00cb0f3445007c4e2",
  manifestSha256: "5c541809eecdb09a2ac3c9fb2b8f489f47a6c563048c540124703343fd5ec037",
  x: "2099596479601975452",
  facebook: "1380120908509290_122109675897458114",
  photos: Object.freeze(["122109675621458114", "122109675669458114", "122109675735458114", "122109675801458114"]),
});
const enc = value => encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
export function xDeleteAuthorization(url, env, { nonce = randomBytes(16).toString("hex"), timestamp = String(Math.floor(Date.now()/1000)) } = {}) {
  assert.equal(url, `https://api.x.com/2/tweets/${TARGET.x}`);
  for (const key of ["X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"]) assert.ok(env[key]?.trim());
  const oauth = { oauth_consumer_key: env.X_API_KEY, oauth_nonce: nonce, oauth_signature_method: "HMAC-SHA1", oauth_timestamp: timestamp, oauth_token: env.X_ACCESS_TOKEN, oauth_version: "1.0" };
  const parameters = Object.entries(oauth).map(([k,v]) => [enc(k), enc(v)]).sort(([a],[b]) => a.localeCompare(b)).map(p => p.join("=")).join("&");
  oauth.oauth_signature = createHmac("sha1", `${enc(env.X_API_SECRET)}&${enc(env.X_ACCESS_TOKEN_SECRET)}`).update(["DELETE", url, parameters].map(enc).join("&")).digest("base64");
  return `OAuth ${Object.entries(oauth).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${enc(k)}="${enc(v)}"`).join(", ")}`;
}

export function exactDeleteUrl(platform, id) {
  if (platform === "x") { assert.equal(id, TARGET.x); return `https://api.x.com/2/tweets/${id}`; }
  assert.equal(platform, "facebook");
  assert.ok([TARGET.facebook, ...TARGET.photos].includes(id));
  return `https://graph.facebook.com/v26.0/${id}`;
}

export function withdrawalApi(env, fetchImpl = fetch) {
  const reads = makeApi({ env, fetchImpl });
  return { ...reads, async remove(platform, id) {
    const url = exactDeleteUrl(platform, id);
    assert.ok(platform === "x" || env.META_PAGE_ACCESS_TOKEN?.trim());
    let response;
    try { response = await fetchImpl(url, { method: "DELETE", headers: { Authorization: platform === "x" ? xDeleteAuthorization(url, env) : `Bearer ${env.META_PAGE_ACCESS_TOKEN}`, Accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(30_000) }); }
    catch { throw new SocialError("delete_network_outcome_unknown"); }
    let data;
    try { data = await response.json(); } catch { throw new SocialError("delete_invalid_json_outcome_unknown", response.status); }
    if (!response.ok || data.error || data.errors?.length) throw new SocialError("delete_provider_rejected", response.status, data.error?.code);
    assert.equal(platform === "x" ? data.data?.deleted : data === true || data.success === true, true);
    return { id, providerAcknowledgedDeletion: true, httpStatus: response.status };
  }};
}

export function resolveRecord(ledger, manifest) {
  const record = ledger.data.releases[TARGET.internalId];
  assert.ok(record);
  assert.equal(record.manifestSha256, TARGET.manifestSha256);
  assert.equal(record.sourceCommit, TARGET.sourceCommit);
  assert.equal(manifest.internalId, TARGET.internalId);
  for (const platform of ["x", "facebook"]) {
    const result = record.platforms[platform].results;
    assert.equal(result.length, 1);
    assert.equal(result[0].id, TARGET[platform]);
    assert.equal(record.platforms[platform].verified[0].id, TARGET[platform]);
    assert.deepEqual(result[0].images.map(i => i.sha256), manifest.platforms[platform].posts[0].media.map(i => i.sha256));
  }
  assert.deepEqual(record.platforms.facebook.results[0].images.map(i => i.id), TARGET.photos);
  assert.equal(manifest.platforms.x.accountId, accounts.xUserId);
  assert.equal(manifest.platforms.facebook.accountId, accounts.facebookPageId);
  return record;
}

async function probe(api, platform, id) {
  try {
    const data = await api.request(platform, "GET", platform === "x" ? `/2/tweets/${id}` : `/v26.0/${id}?fields=id`);
    return { status: "still-readable", id: data.data?.id ?? data.id };
  } catch (error) {
    // FB code 100 does NOT by itself prove deletion; it may mean permissions.
    return { status: "unavailable-or-read-failed", error: safeError(error) };
  }
}

export async function deleteOnce({ ledger, withdrawal, api, platform, id }) {
  const key = `${platform}:${id}`;
  assert.ok(!withdrawal.operations[key], "Deletion already attempted; inspect, never blindly retry");
  const op = withdrawal.operations[key] = { status: "in-flight", platform, id, startedAt: new Date().toISOString() };
  await ledger.save(); // A failed durable intent means no DELETE call.
  try {
    op.result = await api.remove(platform, id);
    op.status = "provider-confirmed-deleted";
    op.completedAt = new Date().toISOString();
    await ledger.save();
  } catch (error) {
    op.status = "reconciliation-required";
    op.error = safeError(error);
    await ledger.save();
    throw error;
  }
  op.verification = await probe(api, platform, id);
  op.verifiedAt = new Date().toISOString();
  await ledger.save();
  assert.notEqual(op.verification.status, "still-readable", "Provider acknowledged deletion but object remains readable");
}

export async function runWithdrawal({ mode, ledger, manifest, api, runId }) {
  assert.ok(["inspect", "withdraw"].includes(mode));
  const record = resolveRecord(ledger, manifest);
  const xIdentity = await api.request("x", "GET", "/2/users/me");
  assert.equal(xIdentity.data?.id, accounts.xUserId);
  const fbIdentity = await api.request("facebook", "GET", `/v26.0/${accounts.facebookPageId}?fields=id`);
  assert.equal(fbIdentity.id, accounts.facebookPageId);
  if (record.withdrawal) {
    assert.equal(mode, "inspect", "Withdrawal already started; no automatic retry");
    return { withdrawal: record.withdrawal, x: await probe(api, "x", TARGET.x), facebook: await probe(api, "facebook", TARGET.facebook) };
  }
  // Verify current exact author, caption, attachment order, alt and dimensions.
  for (const platform of ["x", "facebook"]) await verifyPlatform({ platform, destination: manifest.platforms[platform], results: record.platforms[platform].results, api });
  if (mode === "inspect") return { status: "exact-targets-verified-no-mutation", x: TARGET.x, facebook: TARGET.facebook, photos: TARGET.photos };
  const withdrawal = record.withdrawal = {
    schema: "sorry-tomorrow-exact-withdrawal-v1", status: "withdrawn-do-not-republish", requestedAt: new Date().toISOString(), runId,
    authority: "Owner: take everything down and fix the comic; The Assistant’s Assistant, September 14, 2026",
    reason: "Owner-reported material anatomy defect; replacement requires new creative approval",
    preflight: { accountCaptionMediaAndAltVerified: true, manifestSha256: TARGET.manifestSha256 },
    instagram: "separate-owner-authorized-UI-withdrawal-by-root", operations: {},
  };
  await ledger.save(); // Preserve every original platform state, result and attempt.
  const failures = [];
  for (const platform of ["x", "facebook"]) {
    try {
      await deleteOnce({ ledger, withdrawal, api, platform, id: TARGET[platform] });
      if (platform === "facebook") {
        // Only these four original uploads, and only if still readable after parent deletion.
        for (const [i, id] of TARGET.photos.entries()) {
          let photo;
          try { photo = await api.request("facebook", "GET", `/v26.0/${id}?fields=id,from,alt_text_custom,width,height`); }
          catch (error) {
            withdrawal.operations[`facebook:${id}`] = { status: "no-delete-photo-unavailable-or-read-failed", id, error: safeError(error), checkedAt: new Date().toISOString() };
            await ledger.save();
            continue;
          }
          assert.equal(photo.id, id);
          assert.equal(photo.from?.id, accounts.facebookPageId);
          assert.equal(photo.alt_text_custom, manifest.platforms.facebook.posts[0].media[i].alt);
          assert.ok(photo.width > 0 && photo.height > 0);
          await deleteOnce({ ledger, withdrawal, api, platform, id });
        }
      }
    } catch (error) { failures.push({ platform, error: safeError(error) }); }
  }
  withdrawal.executionStatus = failures.length ? "reconciliation-required" : "post-deletions-provider-confirmed";
  withdrawal.failures = failures;
  withdrawal.completedAt = new Date().toISOString();
  await ledger.save();
  return withdrawal;
}

async function main() {
  assert.equal(process.env.GITHUB_REPOSITORY, accounts.repository);
  assert.equal(process.env.GITHUB_REF, "refs/heads/main");
  const gh = githubApi(process.env);
  const file = await gh("GET", `/repos/${accounts.repository}/contents/social/releases/the-assistants-assistant.json?ref=${TARGET.sourceCommit}`);
  const bytes = Buffer.from(file.content, "base64");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), TARGET.manifestSha256);
  const ledger = await loadLedger(gh);
  const result = await runWithdrawal({ mode: process.argv[2] ?? "inspect", ledger, manifest: JSON.parse(bytes), api: withdrawalApi(process.env), runId: process.env.GITHUB_RUN_ID });
  console.log(JSON.stringify(result, null, 2));
  if (result.executionStatus === "reconciliation-required") process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(JSON.stringify(safeError(error))); process.exitCode = 1; });
