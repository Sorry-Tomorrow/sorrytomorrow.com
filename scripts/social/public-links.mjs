import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { isOfficialPost } from "../../app/official-posts.mjs";
import { githubApi, LEDGER_BRANCH, LEDGER_PATH } from "./ledger.mjs";

export function projectPublicLinks(ledger, approved, catalog, historical = {}) {
  assert.equal(ledger.schema, "sorry-tomorrow-social-ledger-v1");
  assert.ok(ledger.releases && typeof ledger.releases === "object");
  const comics = {};
  const rows = Object.entries(ledger.releases);
  const superseded = new Set(rows.map(([, row]) => row.correction?.supersedesManifestSha256).filter(Boolean));
  for (const episode of catalog.episodes.filter(episode => !episode.previewOnly)) {
    const links = {};
    const episodeRows = rows.filter(([key, row]) => (row.internalId ?? key.split("@")[0]) === episode.internalId);
    // Once an episode has entered the durable ledger, old seed URLs cannot revive it.
    if (episodeRows.length === 0) {
      for (const [channel, url] of Object.entries(historical[episode.slug] ?? {})) {
        assert.ok(isOfficialPost(channel, url), "Invalid historical public post URL");
        links[channel] = url;
      }
    }
    const binding = approved[episode.slug];
    for (const [, row] of episodeRows) {
      if (row.slug !== episode.slug || row.withdrawal || superseded.has(row.manifestSha256)) continue;
      if (!binding || binding.internalId !== episode.internalId || row.manifestSha256 !== binding.manifestSha256) continue;
      for (const channel of ["x", "instagram", "facebook"]) {
        const state = row.platforms?.[channel];
        if (state?.status !== "published" || !state.verifiedAt) continue;
        // The first verified post is the thread entry point; never fall back to raw results.
        const first = state.verified?.[0];
        if (first?.copyAndAltVerified === true && isOfficialPost(channel, first.url)) links[channel] = first.url;
      }
    }
    if (Object.keys(links).length) comics[episode.slug] = links;
  }
  return { schema: "sorry-tomorrow-public-social-posts-v1", comics };
}

export async function refreshPublicLinks({ root = process.cwd(), remote = false, env = process.env, request } = {}) {
  const readJson = async path => JSON.parse(await readFile(resolve(root, path), "utf8"));
  const [approved, catalog, historical] = await Promise.all([
    readJson("social/approved-releases.json"), readJson("content/episodes.json"), readJson("social/historical-post-links.json"),
  ]);
  let ledger;
  const gh = request ?? (remote ? githubApi(env) : null);
  const prefix = "/repos/Sorry-Tomorrow/sorrytomorrow.com/contents/";
  if (remote) {
    const file = await gh("GET", `${prefix}${LEDGER_PATH}?ref=${LEDGER_BRANCH}`);
    ledger = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
  } else {
    ledger = JSON.parse(execFileSync("git", ["show", `origin/${LEDGER_BRANCH}:${LEDGER_PATH}`], { cwd: root, encoding: "utf8" }));
  }
  const projection = projectPublicLinks(ledger, approved, catalog, historical);
  const text = JSON.stringify(projection, null, 2) + "\n";
  if (remote) {
    const endpoint = `${prefix}public-social-posts.json`;
    const current = await gh("GET", `${endpoint}?ref=${LEDGER_BRANCH}`, undefined, { allow404: true });
    if (current && Buffer.from(current.content, "base64").toString("utf8") === text) return projection;
    await gh("PUT", endpoint, {
      branch: LEDGER_BRANCH, message: "Refresh verified public comic post links",
      content: Buffer.from(text).toString("base64"), ...(current ? { sha: current.sha } : {}),
    });
  } else {
    await writeFile(resolve(root, "content/official-posts.json"), text);
  }
  return projection;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] ?? "local";
  assert.ok(["local", "remote"].includes(mode), "Use local or remote");
  const result = await refreshPublicLinks({ remote: mode === "remote" });
  console.log(`Public links refreshed for ${Object.keys(result.comics).length} comics; no social posts created.`);
}
