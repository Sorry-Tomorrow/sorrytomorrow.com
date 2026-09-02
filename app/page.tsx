import { ComicReader } from "./ComicReader";
import { CastDeck } from "./CastDeck";
import { episodePath, episodes } from "@/content/episodes";
import { LegacyComicRedirect } from "./LegacyComicRedirect";
import { SiteFooter, SiteHeader } from "./SiteChrome";
import { publicBasePath, sitePath } from "./site";

export const dynamic = "force-static";

export default function Home() {
  const latest = episodes[0];

  return (
    <div className="site-shell">
      <LegacyComicRedirect
        knownSlugs={episodes.map((episode) => episode.slug)}
        basePath={publicBasePath}
      />
      <a className="skip-link" href="#latest-comic">
        Skip to the latest comic
      </a>

      <SiteHeader />

      <main>
        <ComicReader episode={latest} />

        <CastDeck />

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="about-declaration">
            <span>About the comic</span>
            <h2 id="about-title">Brilliant.<br />Confidently<br />clueless.</h2>
          </div>
          <div className="about-copy">
            <p className="about-lead">
              <em>Sorry, Tomorrow</em> follows Ahead AI, an AI transformation agency that is always slightly ahead of the plan.
            </p>
            <p>
              Everyone is genuinely excellent at something and dangerously wrong about something adjacent to it. The satire targets hype, incentives, process theater, and misplaced certainty—not the people caught underneath them.
            </p>
            <p className="margin-note">Internal status: insight identified. Ownership pending.</p>
          </div>
        </section>

        <section className="archive-section" id="archive" aria-labelledby="archive-title">
          <header>
            <span>All strips</span>
            <h2 id="archive-title">The short archive</h2>
          </header>
          <ol>
            {episodes.map((episode, index) => (
              <li key={episode.slug}>
                <a href={`${sitePath(episodePath(episode.slug))}#comic`}>
                  <span>{String(episode.publicNumber).padStart(2, "0")}</span>
                  <strong>{episode.title}</strong>
                  <small>
                    {index === 0
                      ? "Latest comic"
                      : `Comic ${String(episode.publicNumber).padStart(3, "0")}`}
                  </small>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section className="store-section" id="store" aria-labelledby="store-title">
          <span className="store-kicker">The back-cover ad</span>
          <h2 id="store-title">Store<br />coming soon</h2>
          <p>The Board approved it before the merchandise existed.</p>
          <span className="store-stamp">Procurement status: optimistic</span>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
