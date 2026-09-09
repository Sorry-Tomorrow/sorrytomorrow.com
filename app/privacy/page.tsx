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
          views, referral sources, and page performance. It does not use analytics
          cookies or track individual visitors. We do not use this information to
          build personal profiles or sell visitor data. Learn more about{" "}
          <a href="https://developers.cloudflare.com/web-analytics/about/">
            Cloudflare Web Analytics
          </a>.
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
