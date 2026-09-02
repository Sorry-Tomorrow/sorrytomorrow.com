import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  episodePath,
  episodes,
  getEpisode,
  series,
} from "@/content/episodes";
import { ComicReader } from "@/app/ComicReader";
import { SiteFooter, SiteHeader } from "@/app/SiteChrome";
import { absolutePageUrl, absolutePublicUrl, siteUrl } from "@/app/site";

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
  const image = absolutePublicUrl(episode.ogImage.src);

  return {
    title: episode.title,
    description: episode.caption,
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
      description: episode.caption,
      publishedTime: episode.websitePublishedAt,
      images: [
        {
          url: image,
          width: episode.ogImage.width,
          height: episode.ogImage.height,
          alt: episode.ogImage.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${episode.title} | ${series.title}`,
      description: episode.caption,
      images: [image],
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
    datePublished: episode.websitePublishedAt,
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
      <SiteHeader />
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
