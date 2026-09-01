# Sorry, Tomorrow

Website for *Sorry, Tomorrow*, a workplace satire about the fictional AI transformation agency Ahead AI.

The homepage leads with **Vibe Coding in Your Sleep v0.0.3** and links the three approved *Sorry, Tomorrow* comics through older/newer navigation and the archive. Each exact publication asset renders at its natural aspect ratio in ordinary page flow, followed by the cast, about section, archive, and coming-soon store treatment.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run build
npm run build:pages
npm run prepare:pages
npm run test:pages
npm test
npm run lint
```

## Deployment

Pushes to `main` deploy a static export through GitHub Actions and GitHub Pages. The Pages build preserves the repository base path for assets and comic navigation.

GitHub Pages serves the site at `sorrytomorrow.com`. No social-account, publishing-service, or store integration is configured by this repository.
