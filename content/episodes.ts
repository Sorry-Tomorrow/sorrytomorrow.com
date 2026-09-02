import catalog from "./episodes.json";

export type Line = {
  speaker: string;
  text: string;
};

export type ComicArt = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type TranscriptPanel = {
  lines: Line[];
  description: string;
};

export type Episode = {
  internalId: string;
  slug: string;
  title: string;
  publicNumber: number;
  publicVersion: string;
  label: string;
  websitePublishedAt: string;
  displayDate: string;
  caption: string;
  shell: "art-first" | "classic";
  ogImage: ComicArt;
  art: ComicArt[];
  panels: TranscriptPanel[];
};

export type SeriesCatalog = {
  title: string;
  description: string;
  canonicalOrigin: string;
  disclosure: string;
  social: Record<string, { label: string; url: string }>;
};

export const series = catalog.series satisfies SeriesCatalog;
export const episodes = catalog.episodes satisfies Episode[];

export function getEpisode(slug: string) {
  return episodes.find((episode) => episode.slug === slug);
}

export function getEpisodeIndex(slug: string) {
  return episodes.findIndex((episode) => episode.slug === slug);
}

export function episodePath(slug: string) {
  return `/comics/${slug}/`;
}
