/** Approved newer packages already contain a complete caption; older packages provide a summary. */
function containsCanonicalLine(text, canonical) {
  return text.split(/\r?\n/).some(line => line.trim() === canonical);
}

export function comicShareText({ title, seriesTitle, summary, disclosure, canonical }) {
  return containsCanonicalLine(summary, canonical)
    ? summary
    : summary.trim() === `${title} | ${seriesTitle}`
      ? `${summary}\n${disclosure}`
    : `${title} — ${seriesTitle}\n${summary}\n${disclosure}`;
}

export function shareCaption(text, canonical) {
  return containsCanonicalLine(text, canonical) ? text : `${text}\n${canonical}`;
}

/** Native sharing has its own tagged URL field, so avoid a second clean URL in the text. */
export function nativeShareText(text, canonical) {
  return text.split(/\r?\n/).filter(line => line.trim() !== canonical).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function shareDescription(text, fallback, canonical) {
  return text && !containsCanonicalLine(text, canonical) ? text : fallback;
}

/** Links are built from the episode's canonical URL, never the visitor's current location. */
export function readerShareUrl(canonical, method, slug, number) {
  const url = new URL(canonical);
  url.search = "";
  url.hash = "";
  if (slug && Number.isInteger(number)) {
    url.searchParams.set("utm_source", ["x", "facebook", "linkedin", "bluesky", "threads"].includes(method) ? method : "reader");
    url.searchParams.set("utm_medium", "reader_share");
    url.searchParams.set("utm_campaign", `comic-${String(number).padStart(3, "0")}-${slug}`);
    url.searchParams.set("utm_content", method);
  }
  return url.toString();
}

export function shareTargets(canonical, title, slug, number) {
  const encoded = method => encodeURIComponent(readerShareUrl(canonical, method, slug, number));
  const text = encodeURIComponent(slug ? `${title} — Sorry, Tomorrow` : title);
  return [
    { method: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded("linkedin")}` },
    { method: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encoded("facebook")}` },
    { method: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${text}&url=${encoded("x")}` },
    { method: "bluesky", label: "Bluesky", href: `https://bsky.app/intent/compose?text=${text}%20${encoded("bluesky")}` },
    { method: "threads", label: "Threads", href: `https://www.threads.com/intent/post?text=${text}&url=${encoded("threads")}` },
    { method: "email", label: "Email", href: `mailto:?subject=${text}&body=${text}%0A${encoded("email")}` },
  ];
}
