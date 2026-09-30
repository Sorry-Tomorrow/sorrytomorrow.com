import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { imageDimensions } from "./social/policy.mjs";

export async function validateReaderSharing(root = process.cwd(), { localPreview = false } = {}) {
  const json = async path => JSON.parse(await readFile(resolve(root, path), "utf8"));
  const [catalog, sharing] = await Promise.all([json("content/episodes.json"), json("content/reader-sharing.json")]);
  assert.equal(sharing.schema, "sorry-tomorrow-reader-sharing-public-v1");
  assert.ok(["approved", "candidate"].includes(sharing.status), "Unknown sharing package state");
  if (sharing.status !== "approved" && !localPreview) throw new Error("Reader sharing assets await owner final review. SORRY_TOMORROW_LOCAL_PREVIEW=true permits local review only; do not publish this candidate.");
  const published = catalog.episodes.filter(episode => !episode.previewOnly);
  assert.deepEqual(Object.keys(sharing.episodes).sort(), published.map(episode => episode.slug).sort(), "Every public comic needs its sharing package");
  let files = 0;
  for (const episode of published) {
    const row = sharing.episodes[episode.slug];
    assert.ok(row && row.preview && row.download, `${episode.slug}: preview and download required`);
    if (!localPreview) {
      assert.equal(row.status, "approved", `${episode.slug}: candidate cannot ship`);
      assert.match(row.manifestSha256, /^[a-f0-9]{64}$/);
      assert.match(row.approvalReceiptSha256, /^[a-f0-9]{64}$/);
    }
    assert.match(row.download.filename, /^sorry-tomorrow-[a-z0-9-]+\.(jpg|jpeg|png)$/);
    for (const [role, asset] of [["preview", row.preview], ["download", row.download]]) {
      const src = asset.src.replace(/^\//, "");
      assert.ok(src.startsWith(`comics/${episode.slug}/sharing/`), "Sharing files must use their versioned comic directory");
      assert.match(src, /^comics\/[a-z0-9-]+\/sharing\/v[0-9]+\/[a-z0-9-]+\.(jpg|jpeg|png)$/);
      const bytes = await readFile(resolve(root, "public", src));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, `${episode.slug} ${role}: changed bytes`);
      assert.equal(bytes.length, asset.bytes);
      assert.ok(bytes.length < 5_000_000, `${episode.slug} ${role}: image must be under 5 MB`);
      const size = imageDimensions(bytes);
      assert.deepEqual({ width: asset.width, height: asset.height, type: asset.mimeType }, size);
      assert.ok(typeof asset.alt === "string" && asset.alt.trim().length > 0);
      if (role === "preview") assert.deepEqual([asset.width, asset.height], [1200, 630]);
      files++;
    }
  }
  return { comics: published.length, files, status: sharing.status, localPreview };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await validateReaderSharing(process.cwd(), { localPreview: process.env.SORRY_TOMORROW_LOCAL_PREVIEW === "true" })));
}
