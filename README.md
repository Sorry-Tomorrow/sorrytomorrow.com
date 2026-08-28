# Sorry, Tomorrow

Website for *Sorry, Tomorrow*, a workplace satire about the fictional AI transformation agency Ahead AI.

The homepage leads with **Executive Twin v0.0.1**, the first approved *Sorry, Tomorrow* comic, followed by the cast, about section, archive, and coming-soon store treatment. Its four final lettered SVG panels render in a full-width natural-scroll sequence; Panel 1 loads immediately and Panels 2–4 load as the reader approaches them.

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
