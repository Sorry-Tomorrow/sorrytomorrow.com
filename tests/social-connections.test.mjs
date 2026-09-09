import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { accounts, allowLiveRun, checkConnections, xReadAuthorization } from "../scripts/social-connections.mjs";

const env = {
  X_API_KEY: "test-key", X_API_SECRET: "test-consumer-secret",
  X_ACCESS_TOKEN: "test-token", X_ACCESS_TOKEN_SECRET: "test-token-secret",
  META_PAGE_ACCESS_TOKEN: "test-page-token",
};

function fixtureFetch({ xHandle = accounts.xHandle, pageId = accounts.facebookPageId } = {}) {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      assert.equal(options.method, "GET");
      assert.equal(options.redirect, "error");
      assert.ok(options.signal instanceof AbortSignal);
      let body;
      if (url === "https://api.x.com/2/users/me") {
        assert.match(options.headers.Authorization, /^OAuth /);
        body = { data: { id: "1234567890", username: xHandle } };
      } else if (url === "https://graph.facebook.com/v26.0/me?fields=id,name,instagram_business_account") {
        assert.equal(options.headers.Authorization, `Bearer ${env.META_PAGE_ACCESS_TOKEN}`);
        body = { id: pageId, instagram_business_account: { id: accounts.instagramId } };
      } else if (url === `https://graph.facebook.com/v26.0/${accounts.instagramId}?fields=id,username`) {
        body = { id: accounts.instagramId, username: accounts.instagramHandle };
      } else {
        assert.fail("Unexpected endpoint");
      }
      return { ok: true, json: async () => body };
    },
  };
}

test("OAuth GET signature uses the independently specified normalized base", () => {
  const header = xReadAuthorization("https://api.x.com/2/users/me", {
    apiKey: "ck", apiSecret: "cs", accessToken: "at", accessTokenSecret: "ts",
  }, { nonce: "n", timestamp: "1" });
  const base = "GET&https%3A%2F%2Fapi.x.com%2F2%2Fusers%2Fme&oauth_consumer_key%3Dck%26oauth_nonce%3Dn%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1%26oauth_token%3Dat%26oauth_version%3D1.0";
  const expected = createHmac("sha1", "cs&ts").update(base).digest("base64");
  const signature = decodeURIComponent(header.match(/oauth_signature="([^"]+)"/)[1]);
  assert.equal(signature, expected);
  assert.ok(!header.includes("cs") && !header.includes("ts\""));
});

test("signing rejects another origin", () => {
  assert.throws(() => xReadAuthorization("https://example.com/2/users/me", {}), /Unsupported/);
});

test("three fixed read-only identity requests pass without revealing secrets", async () => {
  const fixture = fixtureFetch();
  const result = await checkConnections({ env, fetchImpl: fixture.fetchImpl });
  assert.equal(result.status, "passed");
  assert.equal(result.requestCount, 3);
  assert.equal(result.publishingEnabled, false);
  assert.equal(result.publicationTested, false);
  for (const value of Object.values(env)) assert.ok(!JSON.stringify(result).includes(value));
  for (const { url } of fixture.calls) assert.ok(!url.includes("access_token="));
});

test("the wrong X account fails closed", async () => {
  const fixture = fixtureFetch({ xHandle: "different_account" });
  const result = await checkConnections({ env, fetchImpl: fixture.fetchImpl });
  assert.equal(result.status, "failed");
  assert.equal(result.checks[0].error, "unexpected_account");
  assert.ok(!JSON.stringify(result).includes("different_account"));
});

test("an incorrect Page token blocks the Instagram query", async () => {
  const fixture = fixtureFetch({ pageId: "999" });
  const result = await checkConnections({ env, fetchImpl: fixture.fetchImpl });
  assert.equal(result.status, "failed");
  assert.equal(result.requestCount, 2);
  assert.equal(result.checks[2].status, "blocked");
});

test("missing secrets prevent every network request", async () => {
  const fixture = fixtureFetch();
  const result = await checkConnections({ env: {}, fetchImpl: fixture.fetchImpl });
  assert.equal(result.status, "failed");
  assert.equal(fixture.calls.length, 0);
});

test("HTTP errors do not read or print a provider error body and are not retried", async () => {
  let calls = 0;
  const result = await checkConnections({ env, fetchImpl: async () => {
    calls += 1;
    return { ok: false, status: 401, json: async () => assert.fail("Do not read failure bodies") };
  } });
  assert.equal(calls, 2);
  assert.equal(result.checks[0].httpStatus, 401);
  assert.equal(result.checks[2].status, "blocked");
});

test("network exception details cannot leak credentials", async () => {
  const result = await checkConnections({ env, fetchImpl: async () => {
    throw new Error(env.X_API_SECRET);
  } });
  assert.equal(result.status, "failed");
  assert.ok(!JSON.stringify(result).includes(env.X_API_SECRET));
});

test("live execution is opt-in and cannot be triggered by a fork or pull request", () => {
  const trusted = { GITHUB_ACTIONS: "true", GITHUB_REPOSITORY: accounts.repository,
    GITHUB_REF: "refs/heads/codex/social-publishing-analytics", GITHUB_EVENT_NAME: "push" };
  assert.equal(allowLiveRun(trusted, ["--live"]), true);
  assert.equal(allowLiveRun(trusted, []), false);
  assert.equal(allowLiveRun({ ...trusted, GITHUB_EVENT_NAME: "pull_request_target" }, ["--live"]), false);
  assert.equal(allowLiveRun({ ...trusted, GITHUB_REPOSITORY: "someone/fork" }, ["--live"]), false);
  assert.equal(allowLiveRun({ ...trusted, GITHUB_REF: "refs/heads/untrusted" }, ["--live"]), false);
});
