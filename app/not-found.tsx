import { SiteFooter, SiteHeader } from "./SiteChrome";
import { sitePath } from "./site";

export default function NotFound() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className="not-found-page">
        <p className="eyebrow">404 · ownership pending</p>
        <h2>That deliverable does not exist yet.</h2>
        <p>It was probably approved before anyone created it.</p>
        <a href={`${sitePath("/")}#latest-comic`}>Read the latest comic →</a>
      </main>
      <SiteFooter />
    </div>
  );
}
