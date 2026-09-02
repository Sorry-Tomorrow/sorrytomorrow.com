import { stat, readFile } from "node:fs/promises";
import path from "node:path";

const catalog = JSON.parse(
  await readFile(path.resolve("content/episodes.json"), "utf8"),
);

const rows = [];
for (const episode of catalog.episodes) {
  let bytes = 0;
  for (const asset of episode.art) {
    bytes += (await stat(path.resolve("public", asset.src))).size;
  }
  rows.push({
    comic: String(episode.publicNumber).padStart(3, "0"),
    slug: episode.slug,
    assets: episode.art.length,
    bytes,
    mebibytes: Number((bytes / 1024 / 1024).toFixed(2)),
    review: bytes > 15 * 1024 * 1024 ? "performance-review-required" : "within-interim-ceiling",
  });
}

const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
console.table(
  rows.map((row) => ({
    comic: row.comic,
    slug: row.slug,
    assets: row.assets,
    mebibytes: row.mebibytes,
    review: row.review,
  })),
);
console.log(
  JSON.stringify(
    {
      episodeArtMiB: Number((totalBytes / 1024 / 1024).toFixed(2)),
      interimPerEpisodeCeilingMiB: 15,
      note: "The ceiling is diagnostic, not publication approval. Optimized derivatives must be reviewed in Approval 3.",
    },
    null,
    2,
  ),
);
