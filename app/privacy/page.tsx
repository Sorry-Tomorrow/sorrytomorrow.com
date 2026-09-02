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
          The site can optionally use privacy-first aggregate web analytics to
          understand page views and performance. It does not use that information
          to build personal profiles or sell visitor data.
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
