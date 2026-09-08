import type { Metadata } from "next";
import { episodePath, episodes } from "@/content/episodes";
import { SiteFooter, SiteHeader } from "../SiteChrome";
import { publicAssetPath, sitePath } from "../site";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Four-comic preview",
  description: "Read Founder, Inc. LLC, Not-So-Smart Thermostat, Oops… I Drifted Again, and The Magnification Spiral.",
  robots: { index: false, follow: false },
  openGraph: { images: [] },
  twitter: { images: [] },
};

export default function ReviewPage() {
  const sequence = episodes.filter(episode => episode.previewOnly || episode.internalId === "ST-SCRATCH-015").sort((a, b) => a.publicNumber - b.publicNumber);
  return (
    <div className="site-shell">
      <a className="skip-link" href="#preview-comics">Skip to comic previews</a>
      <SiteHeader preview />
      <main className="preview-collection" id="preview-comics">
        <header>
          <p className="preview-kicker">Private website preview</p>
          <h2>Four comics. Ready to read.</h2>
          <p>Founder is already on the website. Read the next three previews here: Thermostat, Oops, and Magnification. Publication dates for those three are still open.</p>
        </header>
        <ol className="preview-grid">
          {sequence.map(episode => (
            <li key={episode.slug}>
              <a href={`${sitePath(episodePath(episode.slug))}#comic`}>
                <div className="preview-cover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={publicAssetPath(episode.ogImage.src)} width={episode.ogImage.width} height={episode.ogImage.height} alt={episode.ogImage.alt} loading="lazy" />
                </div>
                <span className="preview-version">{episode.publicVersion}</span>
                <h3>{episode.title}</h3>
                <p>{episode.caption}</p>
                <strong>Read comic →</strong>
              </a>
              <p className="preview-disposition">{episode.internalId === "ST-SCRATCH-015" ? "Published · website reference" : "Comic approved · website preview"}</p>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </div>
  );
}
