# Reader sharing

`ComicShare` appears once below each comic on the homepage and episode page.
It always receives the displayed episode's production permalink; preview origins,
query data and anchors are never copied. The footer deliberately shares the series.

Native Web Share is enhanced by Copy link, ordinary destination links, and a
keyboard-accessible dialog. Image sharing is two clicks when file preparation is
needed so the second call retains user activation. Save comic image remains a
normal same-origin download without JavaScript. Downloads contain the whole story;
long strips are reading/message editions, not guaranteed Instagram feed formats.
The original Instagram link is the reliable route to native Instagram resharing.

## Deliverables and release

`content/reader-sharing.json` is staged by the private Studio's
`studio/scripts/stage-reader-sharing.mjs`. It contains only public asset metadata
and approval digests, never private source paths or receipts. Each episode has a
1200×630 preview and a complete image, with immutable versioned file paths.
The original catalog and approved art files remain unchanged. Metadata reads the
new preview while the reader continues using the original comic panels.

Sharing text accepts either the original summary or a complete authored caption
containing its canonical URL on a separate line. A complete caption is copied
unchanged; summaries receive one title, disclosure and canonical link. Native
sharing removes the clean URL line from its text because the tagged URL is sent
in the Web Share URL field. Metadata uses the episode description when a package
contains a complete caption. This keeps comics 015/016's already-approved copy
and images intact while avoiding duplicate titles and URLs.

New/changed comic approvals require both assets in the existing Approval 3 package.
The Studio validates sources, panel order, hash-bound QA and the exact owner receipt.
The public build verifies its staged bytes/dimensions and every episode's approval
marker. Candidate packages cannot build for publication. The explicit
`SORRY_TOMORROW_LOCAL_PREVIEW=true` flag is only for local review; it is not set in CI.
An approved metadata stage after the owner decision preserves the same image bytes.

## Original social posts

`content/official-posts.json` is a verified initial snapshot. Opening options fetches
only `public-social-posts.json` from the existing public ledger branch; it sends no
referrer, credentials, copied caption or reader identifier. A current empty row
removes withdrawn links. An unavailable feed preserves the bundled snapshot.

`node scripts/social/public-links.mjs local` refreshes the snapshot from cached
`origin/social-publication-state`; fetch that branch first when updating it.
The existing publisher and withdrawal workflows refresh the public feed using
their existing repository write permission. No extra platform API calls occur.
The projection accepts only current approved-manifest matches with verified posts,
rejects withdrawals and superseded versions, and never publishes operational data.
Historical confirmed X links can seed episodes outside the ledger; once an episode
enters the ledger, the seed cannot revive a removed post. Add future withdrawal
workflows to the same refresh contract.

The local integration review refreshed the bundled projection from publication
state commit `6f14a067d346793a796a6b47cc10bb2b354adbeb`, including original posts for
comics 015/016. This updates only local public URL data; it does not create posts
or publish the remote feed.

## Measurement

The existing private PostHog project receives `reader_share` with validated
`comic_slug`, `action`, `method`, and `placement`. Actions are `opened`, `copied`,
`target_opened`, `handed_off`, and `download_requested`. These are user actions,
not verified social publications. Native target identity is unavailable.
DNT/GPC behavior, cookieless collection and property filtering remain intact.

Original-post links use the existing `social_link_click` event with
`destination_type=original_post`; footer profile links use `destination_type=profile`.
Historical social-click events without this optional property remain unclassified.
These clicks are separate from `reader_share` actions and do not confirm resharing.

Composer/native links use `utm_medium=reader_share`, separate from the owner's
`organic_social` launches. Copy link stays clean; copy/paste arrivals may therefore
be un-attributed. Do not interpret totals as complete sharing or unique reach.

The existing [Comic Performance dashboard](https://us.posthog.com/project/601496/dashboard/2081178) now includes [reader sharing actions](https://us.posthog.com/project/601496/insights/XWUWFgct) and [reader-share arrivals](https://us.posthog.com/project/601496/insights/KXAHya15), alongside its existing comic-view report. The new queries execute successfully; no matching events are expected until this website release. Use these comparisons:

1. `reader_share` count by `action`, `method`, and `comic_slug` (exclude `opened`
   when reporting explicit copy/target/download actions).
2. `$pageview` filtered to `utm_medium=reader_share`, broken down by `utm_source`
   and `utm_campaign`.
3. `comic_view` → `reader_share` trend by comic. Label it sharing intent, never
   publication conversion; cookieless identities and blocked tracking limit it.

## Verification

Run `npm run test:sharing`, the standard content/server tests, and the static Pages
build/prepare/tests. All public pages must emit correct tags in initial HTML.
Check the dialog and copy fallback on desktop/mobile; native iOS/Android target
behavior needs actual devices. Refresh Facebook/LinkedIn cards only after the
approved versioned image URLs are publicly available. Existing platform posts may
retain cached cards; no website build can guarantee replacement of old previews.
