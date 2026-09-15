import test from "node:test";
import assert from "node:assert/strict";
import { TARGET, exactDeleteUrl, xDeleteAuthorization, deleteOnce, withdrawalApi } from "../scripts/social/withdraw-assistants-assistant.mjs";
import { executeRelease, reconcileRelease } from "../scripts/social/ledger.mjs";

test("only the two exact posts and four exact FB uploads can be removed", () => {
  assert.equal(exactDeleteUrl("x", TARGET.x), `https://api.x.com/2/tweets/${TARGET.x}`);
  for (const id of [TARGET.facebook, ...TARGET.photos]) assert.ok(exactDeleteUrl("facebook", id).endsWith(id));
  for (const [platform, id] of [["x", "1"], ["facebook", "1"], ["instagram", TARGET.x], ["facebook", "1380120908509290"]]) assert.throws(() => exactDeleteUrl(platform, id));
});
test("DELETE signer refuses any other origin, query or post", () => {
  const env = { X_API_KEY: "key", X_API_SECRET: "secret", X_ACCESS_TOKEN: "token", X_ACCESS_TOKEN_SECRET: "tokensecret" };
  const url = exactDeleteUrl("x", TARGET.x);
  assert.match(xDeleteAuthorization(url, env, { nonce: "n", timestamp: "1" }), /^OAuth /);
  for (const invalid of [url + "?x=1", url + "0", "https://evil.example/2/tweets/" + TARGET.x]) assert.throws(() => xDeleteAuthorization(invalid, env));
});
test("durable intent failure prevents deletion", async () => {
  let removed = 0;
  await assert.rejects(deleteOnce({ ledger: { save: async () => { throw new Error("storage"); } }, withdrawal: { operations: {} }, api: { remove: async () => removed++ }, platform: "x", id: TARGET.x }));
  assert.equal(removed, 0);
});
test("unknown outcome is preserved and cannot be retried", async () => {
  let removed = 0;
  const withdrawal = { operations: {} }, ledger = { save: async () => {} };
  const api = { remove: async () => { removed++; throw new Error("private secret"); } };
  await assert.rejects(deleteOnce({ ledger, withdrawal, api, platform: "x", id: TARGET.x }));
  assert.equal(withdrawal.operations[`x:${TARGET.x}`].status, "reconciliation-required");
  assert.ok(!JSON.stringify(withdrawal).includes("private secret"));
  await assert.rejects(deleteOnce({ ledger, withdrawal, api, platform: "x", id: TARGET.x }));
  assert.equal(removed, 1);
});
test("confirmed deletion preserves ambiguous subsequent read as ambiguous", async () => {
  const withdrawal = { operations: {} };
  await deleteOnce({ ledger: { save: async () => {} }, withdrawal, api: { remove: async () => ({ providerAcknowledgedDeletion: true }), request: async () => { throw new Error("permission unknown"); } }, platform: "facebook", id: TARGET.facebook });
  assert.equal(withdrawal.operations[`facebook:${TARGET.facebook}`].status, "provider-confirmed-deleted");
  assert.equal(withdrawal.operations[`facebook:${TARGET.facebook}`].verification.status, "unavailable-or-read-failed");
});
test("DELETE transport rejects server refusal without leaking response", async () => {
  const api = withdrawalApi({ META_PAGE_ACCESS_TOKEN: "private" }, async () => ({ ok: false, status: 403, json: async () => ({ error: { code: 200, message: "private" } }) }));
  await assert.rejects(api.remove("facebook", TARGET.facebook), { code: "delete_provider_rejected", status: 403, providerCode: 200 });
});
test("withdrawal blocks publishing and reconciliation without clearing history", async () => {
  const entry = { release: { internalId: TARGET.internalId } };
  const record = { withdrawal: { status: "withdrawn-do-not-republish" }, platforms: { x: { results: [{ id: TARGET.x }] } } };
  const ledger = { data: { baselineExcludedIds: [], releases: { [TARGET.internalId]: record } } };
  const before = JSON.stringify(record);
  for (const fn of [executeRelease, reconcileRelease]) assert.deepEqual(await fn({ entry, ledger }), [{ platform: "all", status: "withdrawn-do-not-republish" }]);
  assert.equal(JSON.stringify(record), before);
});
