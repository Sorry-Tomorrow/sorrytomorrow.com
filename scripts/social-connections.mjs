import { createHmac, randomBytes } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// This diagnostic deliberately has no publishing, media-upload, or retry path.
export const accounts = Object.freeze({
  repository: "Sorry-Tomorrow/sorrytomorrow.com",
  xHandle: "sorrytomorrowco",
  xUserId: "2090544245585125376",
  facebookPageId: "1380120908509290",
  instagramId: "17841440843377082",
  instagramHandle: "sorrytomorrowcomic",
});

const percentEncode = (value) => encodeURIComponent(value).replace(
  /[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
);

export function xReadAuthorization(url, credentials, {
  nonce = randomBytes(16).toString("hex"),
  timestamp = Math.floor(Date.now() / 1000).toString(),
} = {}) {
  const target = new URL(url);
  if (target.origin !== "https://api.x.com" || target.username || target.password) {
    throw new Error("Unsupported X API origin");
  }
  const oauth = {
    oauth_consumer_key: credentials.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: credentials.accessToken,
    oauth_version: "1.0",
  };
  const encoded = [...target.searchParams, ...Object.entries(oauth)]
    .map(([key, value]) => [percentEncode(key), percentEncode(value)])
    .sort(([ak, av], [bk, bv]) => ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0)
    .map(([key, value]) => `${key}=${value}`).join("&");
  const base = ["GET", `${target.origin}${target.pathname}`, encoded]
    .map(percentEncode).join("&");
  oauth.oauth_signature = createHmac(
    "sha1", `${percentEncode(credentials.apiSecret)}&${percentEncode(credentials.accessTokenSecret)}`,
  ).update(base).digest("base64");
  return `OAuth ${Object.entries(oauth).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`).join(", ")}`;
}

class DiagnosticFailure extends Error {
  constructor(code, httpStatus) {
    super(code);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function required(env, name) {
  const value = env[name];
  if (typeof value !== "string" || !value || value.trim() !== value || /[\r\n]/.test(value)) {
    throw new DiagnosticFailure(`missing_or_invalid_${name}`);
  }
  return value;
}

export async function checkConnections({ env, fetchImpl = fetch, now = new Date() }) {
  const report = {
    checkedAt: now.toISOString(),
    mode: "read-only-account-identities",
    publicationTested: false,
    publishingEnabled: false,
    requestCount: 0,
    checks: [],
  };
  let x;
  let meta;
  try {
    x = {
      apiKey: required(env, "X_API_KEY"),
      apiSecret: required(env, "X_API_SECRET"),
      accessToken: required(env, "X_ACCESS_TOKEN"),
      accessTokenSecret: required(env, "X_ACCESS_TOKEN_SECRET"),
    };
    meta = required(env, "META_PAGE_ACCESS_TOKEN");
  } catch (error) {
    return { ...report, status: "failed", error: error.code };
  }

  async function get(url, authorization) {
    report.requestCount += 1;
    let response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: { Authorization: authorization, Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new DiagnosticFailure("network_or_redirect_error");
    }
    if (!response.ok) throw new DiagnosticFailure("http_error", response.status);
    try {
      return await response.json();
    } catch {
      throw new DiagnosticFailure("invalid_json");
    }
  }

  async function record(platform, operation) {
    try {
      const identity = await operation();
      report.checks.push({ platform, status: "passed", ...identity });
      return true;
    } catch (error) {
      report.checks.push({
        platform,
        status: "failed",
        error: error instanceof DiagnosticFailure ? error.code : "invalid_response",
        ...(error instanceof DiagnosticFailure && Number.isInteger(error.httpStatus)
          ? { httpStatus: error.httpStatus } : {}),
      });
      return false;
    }
  }

  await record("x", async () => {
    const url = "https://api.x.com/2/users/me";
    const result = await get(url, xReadAuthorization(url, x));
    if (result?.data?.username?.toLowerCase() !== accounts.xHandle
      || result?.data?.id !== accounts.xUserId) {
      throw new DiagnosticFailure("unexpected_account");
    }
    return { id: result.data.id, handle: accounts.xHandle };
  });

  const pagePassed = await record("facebook", async () => {
    const result = await get(
      "https://graph.facebook.com/v26.0/me?fields=id,name,instagram_business_account",
      `Bearer ${meta}`,
    );
    if (result?.id !== accounts.facebookPageId
      || result?.instagram_business_account?.id !== accounts.instagramId) {
      throw new DiagnosticFailure("unexpected_page_or_instagram_link");
    }
    return { id: accounts.facebookPageId, linkedInstagramId: accounts.instagramId };
  });

  if (pagePassed) {
    await record("instagram", async () => {
      const result = await get(
        `https://graph.facebook.com/v26.0/${accounts.instagramId}?fields=id,username`,
        `Bearer ${meta}`,
      );
      if (result?.id !== accounts.instagramId || result?.username !== accounts.instagramHandle) {
        throw new DiagnosticFailure("unexpected_account");
      }
      return { id: accounts.instagramId, handle: accounts.instagramHandle };
    });
  } else {
    report.checks.push({ platform: "instagram", status: "blocked", error: "page_check_failed" });
  }

  report.status = report.checks.every((check) => check.status === "passed") ? "passed" : "failed";
  return report;
}

export function allowLiveRun(env, args) {
  return args.length === 1 && args[0] === "--live"
    && env.GITHUB_ACTIONS === "true"
    && env.GITHUB_REPOSITORY === accounts.repository
    && ["refs/heads/main", "refs/heads/codex/social-publishing-analytics"].includes(env.GITHUB_REF)
    && ["push", "workflow_dispatch"].includes(env.GITHUB_EVENT_NAME);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!allowLiveRun(process.env, process.argv.slice(2))) {
    console.error("Live check refused: use the trusted repository's read-only connection workflow.");
    process.exitCode = 1;
  } else {
    const report = await checkConnections({ env: process.env });
    console.log(`SOCIAL_CONNECTION_CHECK ${JSON.stringify(report)}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY,
        `## Social connection check\n\nRead-only identities; publishing is not tested or enabled.\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
    }
    process.exitCode = report.status === "passed" ? 0 : 1;
  }
}
