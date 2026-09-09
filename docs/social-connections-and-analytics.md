# Social connections and website analytics

This change adds account diagnostics and privacy-limited website analytics. It
does **not** activate social publishing, back-post existing comics, or change
approved comic image bytes, layouts, captions, or transcripts.

## Credentials and account binding

Keep these in encrypted GitHub Actions repository secrets, never site variables,
browser bundles, source files, or logs:

- `META_PAGE_ACCESS_TOKEN`: the Page credential for Sorry, Tomorrow,
  Page `1380120908509290`, linked Instagram `17841440843377082` / `sorrytomorrowcomic`.
- `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`:
  the app/owner OAuth 1.0a credentials for X `sorrytomorrowco`, user
  `2090544245585125376`. The developer-account ID is different.

X has a provider-enforced $5 billing-cycle cap. Auto-recharge is off. A depleted
balance or cap can stop API calls; do not raise limits or buy more credits
automatically. The Meta Page token has no scheduled token expiry, but its current
data-access authorization expires on December 8, 2026. Revocation or changed
permissions can invalidate it sooner. Renewal handling must be installed before
unattended publication is activated.

The `Check social account connections (read only)` workflow makes at most three
fixed GET requests. It never uploads media, posts, follows redirects, or retries
requests. It validates the exact account IDs/handles and writes only sanitized
results to its log and job summary. A PASS confirms identity access, **not** that
publishing has been tested. During setup its push trigger is restricted to the
integration branch; it can also be run manually once present on the default
branch. Fork/PR events cannot invoke the live diagnostic.

## PostHog configuration

`NEXT_PUBLIC_POSTHOG_KEY` is a **public, write-only ingestion token** (`phc_…`),
stored as a repository variable and passed only to the static website build.
It is not a personal/admin API key. The server rejects other token prefixes before
serializing browser props. An absent/invalid value disables this optional tracker
without blocking a comic release.

Project `601496` is on PostHog US Cloud. Both project-side cookieless tracking and
IP discard are enabled. The SDK is pinned in the lockfile. The initial free plan
has a one-million-event billing limit; no paid products or upgrade were enabled.

The website uses cookieless mode with memory-only state, no person profiles, no
session replay, no autocapture, no heatmaps, no errors/logs capture, and no remote
feature loading. It respects browser Do Not Track and Global Privacy Control.
Only `https://sorrytomorrow.com` and published routes are eligible. Localhost,
private previews, unrecognized routes, and authentication-query landings are
excluded. Existing Cloudflare aggregate/performance analytics remains unchanged.

| Event | Meaning |
| --- | --- |
| `$pageview` | A supported public page loaded. |
| `comic_view` | The comic section entered a visible viewport. |
| `comic_end_reached` | End navigation remained in view for one second with all comic images loaded; a viewing proxy, not proof of reading. |
| `comic_navigation` | A supported older/newer link or keyboard navigation was used. |
| `social_link_click` | An existing labeled social-profile link was clicked; not an on-platform follow or engagement. |

The filter allows only those events and known comic IDs/slugs/numbers. It strips
person updates, arbitrary attributes, form contents, full query strings,
fragments, ad click IDs, and SDK initial-URL properties. Referrers are reduced to
their origins. Coarse device/browser/OS categories are retained, not detailed
versions. PostHog still receives technical connection information; cookieless is
not a claim that no data is processed or a blanket legal-compliance guarantee.
The current server-hash mode removes IPs before GeoIP/bot enrichment, so do not
promise geographic analytics from these events.

Organic campaign tags use:

```
utm_source=x|instagram|facebook
utm_medium=organic_social
utm_campaign=comic-010-work-life-balance
utm_content=full-page|carousel|panels|launch|bio|post|thread|slide-N
```

Only the documented formats are retained. A URL in an Instagram caption is not
automatically a clickable referral; use a genuinely clickable placement and label
its attribution honestly. Native platform metrics are separate from website
analytics. This change installs no advertising pixel or paid campaign.

## Validation and activation

`npm test` runs the server-rendering, analytics-policy, and diagnostic safety
tests. `npm run test:pages` checks the static exports and approved image hashes.
With the public PostHog key configured, it also checks every comic's browser props.
The privacy page describes the implemented settings.

The standalone TypeScript check has four pre-existing errors in the catalog's
`readerLayout` typing and Cloudflare type declarations. The original checkout
reproduces them; this change adds none. The existing build and runtime tests pass.

After a separately confirmed production deployment, verify delivery in PostHog
using a real production visit, then configure the small reporting dashboard.
Do not mark website tracking active from a build alone. Automatic social posting
still needs its approved-media manifest, release trigger, durable deduplication,
reconciliation behavior, and activation baseline. None of the existing comics is
implicitly queued by this diagnostic or analytics patch.
