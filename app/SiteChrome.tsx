import { episodes, series } from "@/content/episodes";
import { sitePath } from "./site";

export function SiteHeader() {
  const latest = episodes[0];

  return (
    <header className="masthead">
      <div className="folio" aria-label="Issue details">
        <span>The Saturday edition</span>
        <span>Ahead AI public deliverable</span>
        <span>
          Issue {String(latest.publicNumber).padStart(2, "0")} · {latest.displayDate}
        </span>
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
        <a href={`${sitePath("/")}#latest-comic`}>Latest</a>
        <a href={`${sitePath("/")}#characters`}>Characters</a>
        <a href={`${sitePath("/")}#about`}>About</a>
        <a href={`${sitePath("/")}#archive`}>Archive</a>
        <a href={sitePath("rss.xml")}>RSS</a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <a href={`${sitePath("/")}#latest-comic`}>Latest</a>
      <a href={`${sitePath("/")}#characters`}>Characters</a>
      <a href={`${sitePath("/")}#about`}>About</a>
      <a href={`${sitePath("/")}#archive`}>Archive</a>
      <a href={sitePath("rss.xml")}>RSS</a>
      <a href={sitePath("colophon/")}>Colophon</a>
      <a href={sitePath("privacy/")}>Privacy</a>
      {Object.values(series.social).map((social) => (
        <a key={social.url} href={social.url} rel="me noreferrer">
          {social.label}
        </a>
      ))}
      <span className="site-disclosure">{series.disclosure}</span>
      <span>© {new Date().getFullYear()} Sorry, Tomorrow</span>
    </footer>
  );
}
