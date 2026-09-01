import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const outputRoot = new URL("../dist/client/", import.meta.url);
const configuredBasePath = process.env.PAGES_BASE_PATH ?? "";
const pathSegment = configuredBasePath.replace(/^\/+|\/+$/g, "");
const basePath = pathSegment ? `/${pathSegment}` : "";
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const approvedComicAssets = {
  "comics/executive-twin/p1-lettered.svg": "601855a49c019ddb39d3a9e87fe3e6d13fe27fb0406d4ff4d809061a3827b645",
  "comics/executive-twin/p2-lettered.svg": "fcb6cb4e2e1a273aeb066435cee8749d441e6e61e6e24d0a8027a65a7787c1f8",
  "comics/executive-twin/p3-lettered.svg": "12c0252f6bddaa9d168475a86db1eb8c3701d0f0fb164646e27dfb73e8eed0e9",
  "comics/executive-twin/p4-lettered.svg": "2a1bbce56bc8062a6b96e3e65e7a6bb390bb8bef1ed93c76f89694afacf18936",
  "comics/undefeated/website-master.png": "02cd6ffbcd70f8941b3c507dc297caa0687c48410058fea50eab8fba7156a8ef",
  "comics/vibe-coding-in-your-sleep/website-master.png": "52fc0fb53fd0719d6ed3903fc4260ace4575e97631311cbeee4bffbfa9156d4b",
};

test("produces a complete GitHub Pages artifact", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");

  assert.match(html, /<title>Sorry, Tomorrow<\/title>/);
  assert.match(html, /id="latest-comic"/);
  assert.match(html, /Vibe Coding in Your Sleep/);
  assert.match(html, /Latest approved comic/);
  assert.match(html, /Third production-ready pilot/);
  assert.match(html, /comics\/vibe-coding-in-your-sleep\/website-master\.png/);
  assert.match(html, /First approved comic/);
  assert.match(html, /href="\?comic=vibe-coding-in-your-sleep#latest-comic"/);
  assert.match(html, /href="\?comic=undefeated#latest-comic"/);
  assert.match(html, /href="\?comic=executive-twin#latest-comic"/);
  assert.doesNotMatch(
    html,
    /Design placeholder|Latest concept strip|Placeholder artwork for design review/,
  );
  assert.match(html, /Human in the loop\?/i);
  assert.match(html, /The Social Media Prophet/);
  assert.doesNotMatch(html, /The LinkedIn Prophet/);
  assert.match(html, /id="character-spotlight"/);
  assert.doesNotMatch(html, /href="\/\?comic=/);

  if (basePath) {
    assert.match(html, new RegExp(`${basePath}/_next/`));
    await assert.rejects(
      access(new URL(`.${basePath}/`, outputRoot)),
    );
  }

  if (configuredSiteUrl) {
    assert.match(
      html,
      new RegExp(
        configuredSiteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ),
    );
  }

  await Promise.all([
    access(new URL("index.rsc", outputRoot)),
    access(new URL("_next/", outputRoot)),
    access(new URL("og.png", outputRoot)),
    access(new URL("favicon.svg", outputRoot)),
    access(new URL("characters/dex-vane.png", outputRoot)),
    access(new URL("characters/clara-fye.png", outputRoot)),
    access(new URL("characters/mina-sparks.png", outputRoot)),
    access(new URL("characters/wes-rollback.png", outputRoot)),
    access(new URL("characters/boomer-slate.png", outputRoot)),
    access(new URL("characters/token.png", outputRoot)),
    ...Object.keys(approvedComicAssets).map((assetPath) =>
      access(new URL(assetPath, outputRoot)),
    ),
    access(new URL(".nojekyll", outputRoot)),
    access(new URL("app/ComicReader.tsx", projectRoot)),
  ]);

  for (const [assetPath, expectedHash] of Object.entries(approvedComicAssets)) {
    const contents = await readFile(new URL(assetPath, outputRoot));
    assert.equal(createHash("sha256").update(contents).digest("hex"), expectedHash);
  }
});
