import { ComicReader } from "./ComicReader";
import { CastDeck } from "./CastDeck";

export const dynamic = "force-static";

export default function Home() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#latest-comic">
        Skip to the latest comic
      </a>

      <header className="masthead">
        <div className="folio" aria-label="Issue details">
          <span>The Saturday edition</span>
          <span>Ahead AI public deliverable</span>
          <span>Issue 02 · v0.0.3</span>
        </div>

        <div className="cover-lockup">
          <p className="eyebrow">A workplace satire about artificial confidence</p>
          <h1>
            <span>Sorry,</span>
            <span>Tomorrow</span>
          </h1>
          <p className="cover-note">Brilliant. Confidently clueless.</p>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <a href="#latest-comic" aria-current="page">
            Latest
          </a>
          <a href="#characters">Characters</a>
          <a href="#about">About</a>
          <a href="#archive">Archive</a>
          <a href="#store">
            Store <small>coming soon</small>
          </a>
        </nav>
      </header>

      <main>
        <ComicReader />

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
            <li><a href="?comic=vibe-coding-in-your-sleep#latest-comic"><span>02</span><strong>Vibe Coding in Your Sleep</strong><small>Latest approved comic</small></a></li>
            <li><a href="?comic=undefeated#latest-comic"><span>01</span><strong>Undefeated</strong><small>Approved comic · v0.0.2</small></a></li>
            <li><a href="?comic=executive-twin#latest-comic"><span>00</span><strong>Executive Twin</strong><small>First approved comic</small></a></li>
          </ol>
        </section>

        <section className="store-section" id="store" aria-labelledby="store-title">
          <span className="store-kicker">The back-cover ad</span>
          <h2 id="store-title">Store<br />coming soon</h2>
          <p>The Board approved it before the merchandise existed.</p>
          <span className="store-stamp">Procurement status: optimistic</span>
        </section>
      </main>

      <footer className="site-footer">
        <a href="#latest-comic">Latest</a>
        <a href="#characters">Characters</a>
        <a href="#about">About</a>
        <a href="#archive">Archive</a>
        <span>© Sorry, Tomorrow</span>
      </footer>
    </div>
  );
}
