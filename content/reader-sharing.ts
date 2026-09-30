import assets from "./reader-sharing.json";
import postLinks from "./official-posts.json";
import { validatedOfficialPosts } from "@/app/official-posts.mjs";
import type { ComicArt } from "./episodes";

type ShareAsset = ComicArt & { bytes: number; sha256: string; mimeType: string };
type ReaderSharing = {
  preview: ShareAsset;
  download: ShareAsset & { filename: string };
  shareText?: string;
};

export function getReaderSharing(slug: string) {
  const episodes = assets.episodes as Record<string, ReaderSharing>;
  return { assets: episodes[slug], officialPosts: validatedOfficialPosts(postLinks, slug) as Record<string, string> ?? {} };
}
