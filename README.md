# Sorry, Tomorrow

Website for *Sorry, Tomorrow*, a workplace satire about the fictional AI transformation agency Ahead AI.

This pass combines a comic-first reader, editorial typography, a bold cover-style masthead, a restrained newspaper folio, cast and about sections, a short archive, and a coming-soon store treatment. The comic art is deliberately represented by design-review placeholders until production artwork is approved.

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

No custom domain, social account, publishing integration, or store integration is configured by this repository.
