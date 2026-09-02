import { series } from "@/content/episodes";
import { SiteFooter, SiteHeader } from "../SiteChrome";
import { siteUrl } from "../site";

export const metadata = {
  title: "Colophon",
  description: "How Sorry, Tomorrow is made and how to request a correction.",
  alternates: { canonical: new URL("colophon/", siteUrl) },
};

export default function ColophonPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="information-page">
        <span className="store-kicker">Colophon</span>
        <h2>Human judgment stays in the loop.</h2>
        <p className="information-lead">{series.disclosure}</p>
        <p>
          The writing, joke selection, character direction, editing, accessibility
          copy, and final publication decisions are human-led. AI tools assist with
          illustration and production under review.
        </p>
        <p>
          Ahead AI is fictional. Real companies, products, and people are not
          affiliated with the comic unless a specific post says otherwise.
        </p>
        <h3>Corrections and accessibility</h3>
        <p>
          To report a factual, accessibility, or rights concern, contact the comic
          through{" "}
          <a href={series.social.x.url}>{series.social.x.label}</a> or{" "}
          <a href={series.social.instagram.url}>
            {series.social.instagram.label}
          </a>
          . Published corrections are reviewed and propagated across active
          destinations rather than silently replacing the record.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
