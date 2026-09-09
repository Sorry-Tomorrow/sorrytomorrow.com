import { SiteFooter, SiteHeader } from "../SiteChrome";
import { siteUrl } from "../site";

export const metadata = {
  title: "Privacy",
  description: "Privacy information for the Sorry, Tomorrow website.",
  alternates: { canonical: new URL("privacy/", siteUrl) },
};

export default function PrivacyPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="information-page">
        <span className="store-kicker">Privacy</span>
        <h2>A comic should not need your dossier.</h2>
        <p className="information-lead">
          Sorry, Tomorrow does not provide accounts, advertising trackers, payment
          forms, or a comment system.
        </p>
        <p>
          The site uses Cloudflare Web Analytics to understand aggregate page
          views, referral sources, and page performance. Cloudflare does not use
          analytics cookies. Learn more about{" "}
          <a href="https://developers.cloudflare.com/web-analytics/about/">
            Cloudflare Web Analytics
          </a>.
        </p>
        <p>
          We also use PostHog US Cloud for cookieless website analytics: which
          comics appear on screen, whether the end of a comic is reached, navigation
          between comics, and clicks to our social profiles. Reaching the end is
          a viewing signal, not proof that someone read the comic. Selected comic
          campaign tags help us understand where visits come from.
        </p>
        <p>
          PostHog receives technical connection information and uses a server-side
          hash to estimate visitors without analytics cookies or browser storage.
          We configure it to discard IP addresses, create no person profiles, and
          record no sessions, form contents, or advertising click identifiers.
          We do not send full query strings or URL fragments. We respect supported
          Do Not Track and Global Privacy Control signals for this tracking, and
          we do not sell visitor data. See{" "}
          <a href="https://posthog.com/tutorials/cookieless-tracking">PostHog’s cookieless analytics documentation</a>.
        </p>
        <p>
          Links to social platforms are governed by those platforms’ own privacy
          policies after you leave this site.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
