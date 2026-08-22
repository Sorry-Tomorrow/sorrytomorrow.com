import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);
const outputRoot = new URL("../dist/client/", import.meta.url);
const configuredBasePath = process.env.PAGES_BASE_PATH ?? "";
const pathSegment = configuredBasePath.replace(/^\/+|\/+$/g, "");
const basePath = pathSegment ? `/${pathSegment}` : "";
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

test("produces a complete GitHub Pages artifact", async () => {
  const html = await readFile(new URL("index.html", outputRoot), "utf8");

  assert.match(html, /<title>Sorry, Tomorrow<\/title>/);
  assert.match(html, /id="latest-comic"/);
  assert.match(html, /Human in the loop\?/i);
  assert.match(html, /id="character-spotlight"/);
  assert.match(html, /href="\?comic=meeting-reduction#latest-comic"/);
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
    access(new URL(".nojekyll", outputRoot)),
    access(new URL("app/ComicReader.tsx", projectRoot)),
  ]);
});
