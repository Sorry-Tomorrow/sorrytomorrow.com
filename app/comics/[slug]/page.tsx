import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  episodePath,
  episodes,
  getEpisode,
  series,
} from "@/content/episodes";
import { ComicReader } from "@/app/ComicReader";
import { getReaderSharing } from "@/content/reader-sharing";
import { SiteFooter, SiteHeader } from "@/app/SiteChrome";
import { absolutePageUrl, absolutePublicUrl, siteUrl } from "@/app/site";
import { shareDescription } from "@/app/sharing.mjs";

type EpisodePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-static";

export function generateStaticParams() {
  return episodes.map((episode) => ({ slug: episode.slug }));
}

export async function generateMetadata({
  params,
}: EpisodePageProps): Promise<Metadata> {
  const { slug } = await params;
  const episode = getEpisode(slug);
  if (!episode) return {};

  const canonical = absolutePageUrl(episodePath(episode.slug));
  const share = !episode.previewOnly ? getReaderSharing(episode.slug).assets : undefined;
  const preview = share?.preview ?? episode.ogImage;
  const description = shareDescription(share?.shareText, episode.caption, canonical.toString());
  const image = absolutePublicUrl(preview.src);

  return {
    title: episode.title,
    description,
    ...(episode.previewOnly ? { robots: { index: false, follow: false } } : {}),
    alternates: {
      canonical,
      types: {
        "application/rss+xml": new URL("rss.xml", siteUrl).toString(),
      },
    },
    openGraph: {
      type: "article",
      url: canonical,
      siteName: series.title,
      title: `${episode.title} | ${series.title}`,
      description,
      ...(!episode.previewOnly && episode.websitePublishedAt ? { publishedTime: episode.websitePublishedAt } : {}),
      images: [
        {
          url: image,
          width: preview.width,
          height: preview.height,
          alt: preview.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${episode.title} | ${series.title}`,
      description,
      images: [{ url: image, alt: preview.alt }],
    },
  };
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { slug } = await params;
  const episode = getEpisode(slug);
  if (!episode) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: episode.title,
    description: episode.caption,
    ...(!episode.previewOnly && episode.websitePublishedAt ? { datePublished: episode.websitePublishedAt } : {}),
    url: absolutePageUrl(episodePath(episode.slug)).toString(),
    image: absolutePublicUrl(episode.ogImage.src),
    isPartOf: {
      "@type": "CreativeWorkSeries",
      name: series.title,
      url: siteUrl.toString(),
    },
  };

  return (
    <div className="site-shell">
      <a className="skip-link" href="#comic">
        Skip to comic
      </a>
      <SiteHeader preview={episode.previewOnly} />
      <main>
        <ComicReader episode={episode} anchorId="comic" />
        <section className="episode-disclosure" aria-label="Production note">
          <p>{series.disclosure}</p>
        </section>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </div>
  );
}
