import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const outputRoot = new URL("../dist/client/", import.meta.url);
const configuredBasePath = process.env.PAGES_BASE_PATH ?? "";
const pathSegment = configuredBasePath.replace(/^\/+|\/+$/g, "");
const basePath = pathSegment ? `/${pathSegment}` : "";
const escapedBasePath = basePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const expectedSiteUrl = new URL(
  configuredSiteUrl || "https://sorrytomorrow.com/",
);
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const approvedComicAssets = {
  "comics/the-honest-demo/p1-lettered.svg": "6376b5919624454f8182d2a542f154460fd48503597b117d4a634b90e56c0655",
  "comics/the-honest-demo/p2-lettered.svg": "3af0ed4aa5262bbcc25419fc3e976ab69ce908262ead8e104f23f1b5497b20ea",
  "comics/the-honest-demo/p3-lettered.svg": "93caf73e720fa9f1d917628c5f512c8878825a74db7cc71e53f6ad0aa31cb5e5",
  "comics/the-honest-demo/p4-lettered.svg": "a23e01463eb15672f0001d9e7e28ab2b03deb119f27d260c3e3332603342a150",
  "comics/executive-twin/p1-lettered.svg": "601855a49c019ddb39d3a9e87fe3e6d13fe27fb0406d4ff4d809061a3827b645",
  "comics/executive-twin/p2-lettered.svg": "fcb6cb4e2e1a273aeb066435cee8749d441e6e61e6e24d0a8027a65a7787c1f8",
  "comics/executive-twin/p3-lettered.svg": "12c0252f6bddaa9d168475a86db1eb8c3701d0f0fb164646e27dfb73e8eed0e9",
  "comics/executive-twin/p4-lettered.svg": "2a1bbce56bc8062a6b96e3e65e7a6bb390bb8bef1ed93c76f89694afacf18936",
  "comics/undefeated/website-master.png": "02cd6ffbcd70f8941b3c507dc297caa0687c48410058fea50eab8fba7156a8ef",
  "comics/vibe-coding-in-your-sleep/website-master.png": "52fc0fb53fd0719d6ed3903fc4260ace4575e97631311cbeee4bffbfa9156d4b",
  "comics/executive-twin/og.png": "5ff59d166ec8b8526f704e8c683716ec3ea35e4cbed78ee58c6b6e304d69e37f",
  "comics/undefeated/og.png": "1372470f785a61b4ac31beff7c5a3395d2c7ff7fd302bfee8979616bb9bb978a",
  "comics/vibe-coding-in-your-sleep/og.png": "ba32d3cfc2dada48d96527c099539a5e82ef79c9fcc90a3b402c14dfe2610ea3",
  "comics/the-honest-demo/og.png": "10c0c4aedc695c563a00217b3af22a7ab8c3a9059c4cdf474a91fe1a810343ce",
};

test("produces a complete GitHub Pages artifact", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");

  assert.match(html, /<title>Sorry, Tomorrow<\/title>/);
  assert.match(html, /id="latest-comic"/);
  assert.match(html, /The Honest Demo/);
  assert.match(html, /Comic 004 · Ahead AI/);
  assert.match(html, /comics\/the-honest-demo\/p1-lettered\.svg/);
  assert.match(html, /Vibe Coding in Your Sleep/);
  assert.doesNotMatch(html, /Latest approved comic|production-ready pilot/i);
  assert.match(
    html,
    new RegExp(`href="${escapedBasePath}/comics/the-honest-demo/#comic"`),
  );
  assert.match(
    html,
    new RegExp(`href="${escapedBasePath}/comics/vibe-coding-in-your-sleep/#comic"`),
  );
  assert.match(
    html,
    new RegExp(`href="${escapedBasePath}/comics/undefeated/#comic"`),
  );
  assert.match(
    html,
    new RegExp(`href="${escapedBasePath}/comics/executive-twin/#comic"`),
  );
  assert.doesNotMatch(
    html,
    /Design placeholder|Latest concept strip|Placeholder artwork for design review/,
  );
  assert.match(html, /Human in the loop\?/i);
  assert.match(html, /The Social Media Prophet/);
  assert.doesNotMatch(html, /The LinkedIn Prophet/);
  assert.match(html, /id="character-spotlight"/);
  assert.doesNotMatch(html, /href="\?comic=|href="\/\?comic=/);
  assert.match(html, new RegExp(`href="${escapedBasePath}/rss\\.xml"`));
  assert.match(html, /AI-assisted; human-written, directed, edited, and approved/);

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
    access(new URL("404.html", outputRoot)),
    access(new URL("robots.txt", outputRoot)),
    access(new URL("sitemap.xml", outputRoot)),
    access(new URL("rss.xml", outputRoot)),
    access(new URL("colophon.html", outputRoot)),
    access(new URL("privacy.html", outputRoot)),
    access(new URL("colophon/index.html", outputRoot)),
    access(new URL("privacy/index.html", outputRoot)),
    access(new URL("comics/the-honest-demo.html", outputRoot)),
    access(new URL("comics/vibe-coding-in-your-sleep.html", outputRoot)),
    access(new URL("comics/undefeated.html", outputRoot)),
    access(new URL("comics/executive-twin.html", outputRoot)),
    access(new URL("comics/the-honest-demo/index.html", outputRoot)),
    access(new URL("comics/vibe-coding-in-your-sleep/index.html", outputRoot)),
    access(new URL("comics/undefeated/index.html", outputRoot)),
    access(new URL("comics/executive-twin/index.html", outputRoot)),
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

  const executiveHtml = await readFile(
    new URL("comics/executive-twin/index.html", outputRoot),
    "utf8",
  );
  assert.match(executiveHtml, /<title>Executive Twin \| Sorry, Tomorrow<\/title>/);
  assert.match(
    executiveHtml,
    new RegExp(
      escapePattern(new URL("comics/executive-twin/og.png", expectedSiteUrl).toString()),
    ),
  );
  assert.match(executiveHtml, /I trained a digital twin on my entire leadership style/);

  const sitemap = await readFile(new URL("sitemap.xml", outputRoot), "utf8");
  const rss = await readFile(new URL("rss.xml", outputRoot), "utf8");
  assert.match(
    sitemap,
    new RegExp(escapePattern(new URL("comics/the-honest-demo/", expectedSiteUrl).toString())),
  );
  assert.match(
    sitemap,
    new RegExp(escapePattern(new URL("comics/executive-twin/", expectedSiteUrl).toString())),
  );
  assert.match(rss, /<title>The Honest Demo<\/title>/);
  assert.match(rss, /<title>Executive Twin<\/title>/);
});
