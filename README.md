# Sorry, Tomorrow

Website for *Sorry, Tomorrow*, a workplace satire about the fictional AI transformation agency Ahead AI.

The homepage leads with **The Honest Demo** and links four published *Sorry, Tomorrow* comics through older/newer navigation and a generated archive. Every episode has a stable `/comics/<slug>` page with its own title, canonical URL, social preview, transcript, alternative text, sitemap entry, and RSS item. Approved publication assets render at their natural aspect ratio in ordinary page flow.

The framework-independent public content source is [`content/episodes.json`](content/episodes.json). It drives the homepage, archive, episode routes, metadata, sitemap, RSS feed, and validation. Private production approvals and release authority remain in the separate Studio OS; this public repository never infers permission to release a new episode.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run build
npm run test:content
npm run build:pages
npm run prepare:pages
npm run test:pages
npm test
npm run lint
```

## Deployment

Pull requests run catalog, lint, server-render, and Pages-artifact checks. Pushes to `main` deploy a static export through GitHub Actions and GitHub Pages; production should also enable the repository/environment protections in [`docs/PRODUCTION-RELEASE-CHECKLIST.md`](docs/PRODUCTION-RELEASE-CHECKLIST.md). The Pages build preserves the configured repository base path for assets and comic navigation.

Use [`docs/WEB-ASSET-BUDGET.md`](docs/WEB-ASSET-BUDGET.md) and `npm run report:payload` before adding a new episode. Web derivatives must be approved publication assets; deployment never improvises recompression.

GitHub Pages serves the site at `sorrytomorrow.com`. Privacy-first Cloudflare Web Analytics can be enabled with `NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN`; no token is configured in source. No social-account, publishing-service, or store integration is configured by this repository.
