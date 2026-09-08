# Four-comic website preview

Local preparation authorized on 2026-09-08. This branch is for reviewing Founder, Inc. LLC, Not-So-Smart Thermostat, Oops… I Drifted Again, and The Magnification Spiral together.

Open `/review/`, then follow the four links in v0.0.5 through v0.0.8 order. Founder is the published reference; the following three are private previews. The review pages preserve the approved images, panel reading order, intrinsic dimensions, text, and episode-specific desktop/mobile layout. The existing homepage, archive, RSS, sitemap, and published-episode navigation continue to show the five released website comics.

## Sources

- Founder uses the released presentation from commit `188bd5fab2412ff7f4d1ded46808438be4cca0d8`, following the September 8 owner approval and website release recorded in Studio OS during this work. Its existing assets and publication timestamp are retained.
- Thermostat uses Approval 3 manifest `3d7dc9fcfc6911ec8d8d4eb4a79c76f5b79ec771effb24c84619b786816712e4`.
- Oops uses Approval 3 manifest `b60e7d5d14aae0cb0baeed0f79468556b4e0980091ec2acfb0689aada7f39230`.
- Magnification uses Approval 3 manifest `c3b44b6cff8962c3c43061c03ebcb57e438a31d7068fb6a83d579e5388e69cb5`.

`content/approved-slate-assets.json` binds the three imported episode packages, owner receipts, 15 panel files, three existing social images reused as review thumbnails, and three fonts. Each transfer is byte-identical; no source package was changed. Thermostat and Oops use their approved SVGs; Magnification uses its approved PNGs. No new image was generated or edited.

The three new short episode captions and the website integration are proposed website copy for review. Existing approved dialogue, alt text, and wordless panel descriptions are retained. Reusing the existing social images here does not authorize a social upload or a new publication.

## Preview boundaries

The three new records have `previewOnly: true` and `websitePublishedAt: null`. Their draft number/slug fields are proposed route keys inside this isolated checkout; no public identity has been assigned in Studio OS for those three. The previews have `noindex, nofollow`, omit publication dates in metadata, and are excluded from discovery feeds and the published homepage. Founder retains its separately authorized publication state. The default Pages preparation command refuses a catalog containing private previews. The local review export requires `SORRY_TOMORROW_LOCAL_PREVIEW=true` and disallows crawlers in its generated robots file.

Before a later release of the three previews: review their integrated website pages, choose the public identity/order/date of the selected episodes, and give an explicit destination-scoped release instruction. Only then should preview records be converted to publication records and a production change be prepared. Do not push, merge, upload, deploy, schedule, or publish this branch under the preview authorization.

## Local verification

```sh
npm run test:content
npm run lint
npm test
npm run build:pages
SORRY_TOMORROW_LOCAL_PREVIEW=true npm run prepare:pages
npm run test:pages
npm run report:payload
```

Thermostat’s six exact SVGs total about 25.34 MiB; the existing 15 MiB per-episode diagnostic flags this for performance review. Images below the first panel load lazily. A compressed derivative would be a separately reviewable artifact, not an alteration to the accepted originals.

To restart the private preview, run `npm run dev -- --host 127.0.0.1 --port 3106` and open `http://localhost:3106/review`.
