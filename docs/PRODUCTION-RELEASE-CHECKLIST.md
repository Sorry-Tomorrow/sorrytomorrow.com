# Production release checklist

This repository prepares and verifies public website releases. It does not infer owner release permission from an approved comic package.

## One-time GitHub settings

These settings require repository-owner access and are intentionally not applied by local code:

- Protect `main`; require a pull request.
- Require the catalog, lint, server-render, Pages-build, and Pages-artifact checks.
- Disallow force pushes and branch deletion.
- Require the branch to be current before merge.
- Add a required human reviewer to the `github-pages` environment.
- Confirm the custom domain is verified and HTTPS is enforced for both the apex and intended `www` behavior.

## Per release

1. Resolve the exact Studio OS episode and final-approved package.
2. Confirm a separate destination-scoped website release receipt.
3. Import only approved public assets, metadata, transcript, alt text, and episode-specific preview image.
4. Run `npm run test:content`, `npm test`, `npm run lint`, and the full Pages build/test sequence.
5. Review the branch diff and the private local preview.
6. Record the approved commit before merge.
7. Merge only after exact owner release authorization.
8. Verify the live canonical episode URL, title, preview metadata, assets, transcript, sitemap/feed entry, and older/newer navigation.
9. Append the commit, workflow run, public URL, publication time, and verification evidence to the Studio OS release ledger.

Any content or asset change after publication-candidate approval returns the episode to the relevant approval stage. A failed live verification pauses the release; it does not trigger an improvised replacement upload.
