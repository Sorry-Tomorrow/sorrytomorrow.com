# Approved comic → verified social release

The existing GitHub Pages deployment remains the website host. A separate workflow
posts only hash-registered, destination-approved comic packages from trusted main.
It does not generate art, rewrite captions, backfill old comics, message users,
follow accounts, moderate comments, buy credits, boost posts, or create paid ads.

## Normal release

1. Finish the ordinary three owner creative approvals, including exact API-ready
   social files, captions and alt text. The Studio skill explains the local stager.
2. Commit the website episode and `social/releases/SLUG.json`, corresponding owner
   authority, `social/approved-releases.json` binding, and exact public media.
3. Existing Pages checks deploy the website. The social workflow verifies the
   actual deploy job/current commit, live comic and media hashes, and all account
   identities before any upload.
4. With repository variable `SOCIAL_PUBLISHING_ENABLED=true`, the workflow posts
   the selected images and verifies the returned account, copy, ordered attachments
   and alt text. Missing/false disables posting. A later no-social/website-only
   instruction means no social manifest for that comic and a documented hold.

Never edit the media, caption or authority for a comic already attempted in the
durable ledger. A changed package is a new owner disposition, not a rerun.

## First activation / maintenance

The manual workflow defaults to `dry-run`. Before activation:

- Run `initialize` once against successfully deployed main to create the ledger
  and validate the fresh already-live baseline. Existing ledger is never reset.
- Run `dry-run` for the exact first-release slug. It verifies real files/accounts
  but has no platform upload/post writes.
- Enable the kill switch only after the owner-authorized readiness review and
  no-write test; run `publish` once for the identified initial test comic.
- Use `reconcile` for existing known post IDs. It makes only provider reads, and
  never creates another post. Unknown IDs require account inspection and an
  explicit, evidenced disposition before an operator considers another attempt.

Authoritative receipts live on branch `social-publication-state` in
`social-publication-ledger.json`, not in the static website. Every external mutation
has durable intent before the call. Crashes/unknown responses are held, not retried.
One concurrency group serializes all runs. Successful destinations are skipped
on subsequent runs, including an ordinary website rebuild.

`health` runs weekly on Monday at 14:17 UTC and can be run manually. It verifies
identities, checks the recorded Meta data-access expiration and snapshots aggregate
native metrics for at most ten recently released comics. Failure/renewal warnings
surface as failed GitHub Actions runs; GitHub notification preferences control
delivery. It does not rotate credentials or raise spending limits automatically.
The optional `metrics` mode only reads verified own posts and records counts.
Missing/hidden/unsupported metrics are null/unavailable, never fabricated zero.
No follower lists, comments, DMs or individual audience records are collected.

Aggregate metric snapshots are also sent to PostHog project 601496 using its
existing public write-only project token. The service event `social_post_metrics`
is separate from visitor pageviews and disables person-profile processing.
It contains public post IDs, comic/channel identifiers and allowlisted counts,
not viewer identities, comment bodies or account credentials. The public GitHub
ledger and job log retain collection/delivery status, not ongoing private insight
counts. A failed analytics delivery leaves a reporting gap and does not affect
the published post or trigger a duplicate publication. Use the most recent
snapshot per post; summing cumulative snapshots would overcount engagement.

Meta's current data access expires December 8, 2026; a Page token with no scheduled
token expiry can still be revoked. Reauthorization is an owner browser handoff.
X retains the provider-enforced $5 billing-cycle cap and auto-recharge off. Local
$0.50-per-post rolling reservations are conservative safety headroom, not actual
provider invoices; no refund/retry is inferred for a failed or unknown attempt.

## Organic marketing / reporting

One comic is one organic launch campaign: `comic-NNN-slug` across X, Instagram and
Facebook. Each posted link carries its channel, `organic_social`, and the approved
format. No paid targeting, ad account, pixel, retargeting or geographical campaign
is activated. Instagram captions do not promise clickable links; do not change a
profile link or add a link sticker without an applicable placement decision.

PostHog project 601496 measures website pageviews, comic views, end-reached viewing
signals, navigation and outbound social clicks. It does not measure everyone who
sees an image on a social platform. Native platform counts remain separate. Read
the first-week comparison as observed exposure/engagement/referrals, not proof
of causal attribution, unique cross-platform people, or comic quality.

## Current API references

- [X image upload](https://docs.x.com/x-api/media/upload-media): current OpenAPI
  explicitly supports OAuth 1.0a UserToken and base64 JSON media.
- [X metadata](https://docs.x.com/x-api/media/create-media-metadata): `id` plus
  `metadata.alt_text.text`, not legacy v1.1 parameter names.
- [Meta image/carousel publishing](https://developers.facebook.com/documentation/instagram-platform/content-publishing):
  JPEG, ordered containers, and AI disclosure on the parent only.
- [Instagram media fields](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media):
  owner, alt text, caption, AI label and aggregate own-media counters.
- [Facebook Page photos](https://developers.facebook.com/docs/graph-api/reference/page/photos/):
  unpublished images with custom alt text, followed by one multi-photo feed post.
- [Facebook Insights](https://developers.facebook.com/docs/graph-api/reference/insights/):
  current `post_media_view` and `post_reactions_like_total` lifetime metrics use
  the already granted aggregate-insight permission. Facebook's like metric also
  includes care reactions. Deprecated impressions and user-generated comment
  edges are not substitutes; broader comment permissions are not requested.

These references describe capabilities, not permission to expand this workflow.
