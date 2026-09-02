import {
  episodePath,
  episodes,
  getEpisodeIndex,
  type Episode,
} from "@/content/episodes";
import { ComicKeyboardNavigation } from "./ComicKeyboardNavigation";
import { publicAssetPath, sitePath } from "./site";

type ComicReaderProps = {
  episode: Episode;
  anchorId?: "latest-comic" | "comic";
};

function episodeHref(target: Episode) {
  return `${sitePath(episodePath(target.slug))}#comic`;
}

export function ComicReader({
  episode,
  anchorId = "latest-comic",
}: ComicReaderProps) {
  const episodeIndex = getEpisodeIndex(episode.slug);
  const artFirst = episode.shell === "art-first";
  const older = episodes[episodeIndex + 1];
  const newer = episodes[episodeIndex - 1];
  const olderHref = older ? episodeHref(older) : undefined;
  const newerHref = newer ? episodeHref(newer) : undefined;

  return (
    <article
      className={`reader${artFirst ? " reader-art-first" : ""}`}
      id={anchorId}
    >
      <ComicKeyboardNavigation olderHref={olderHref} newerHref={newerHref} />

      {artFirst ? (
        <header className="art-first-episode-header">
          <span>{episode.label}</span>
          <div>
            <h2>{episode.title}</h2>
            <p>{episode.caption}</p>
          </div>
        </header>
      ) : (
        <header className="episode-folio">
          <span>{episode.label}</span>
          <h2>{episode.title}</h2>
          <span>{episode.displayDate}</span>
        </header>
      )}

      <div className={`reader-stage${artFirst ? " art-first-reader-stage" : ""}`}>
        {!artFirst &&
          (older && olderHref ? (
            <a
              className="edge-navigation older"
              href={olderHref}
              aria-keyshortcuts="ArrowLeft"
            >
              <span aria-hidden="true">←</span>
              <strong>Older comic</strong>
              <small>{older.title}</small>
            </a>
          ) : (
            <div
              className="edge-navigation latest"
              aria-label="You are at the first comic"
            >
              <span aria-hidden="true">—</span>
              <strong>First comic</strong>
              <small>Archive begins here</small>
            </div>
          ))}

        <figure
          className={`comic-page${artFirst ? " art-first-comic-page" : ""}`}
        >
          <div
            className={`comic-art${artFirst ? " art-first-comic-art" : ""}`}
            role="group"
            aria-label={`${episode.title}, ${episode.panels.length} panels`}
          >
            {episode.art.map((art, index) => (
              // Approved comic assets are served as approved; web-optimized derivatives
              // must enter through a later publication-candidate review.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="comic-panel-art"
                key={art.src}
                src={publicAssetPath(art.src)}
                width={art.width}
                height={art.height}
                alt={art.alt}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding="async"
              />
            ))}
          </div>
          {!artFirst && (
            <figcaption>
              <span>{episode.title}</span>
              <span>{episode.caption}</span>
            </figcaption>
          )}
        </figure>

        {!artFirst &&
          (newer && newerHref ? (
            <a
              className="edge-navigation newer"
              href={newerHref}
              aria-keyshortcuts="ArrowRight"
            >
              <span aria-hidden="true">→</span>
              <strong>Newer comic</strong>
              <small>{newer.title}</small>
            </a>
          ) : (
            <div
              className="edge-navigation latest"
              aria-label="You are at the latest comic"
            >
              <span aria-hidden="true">—</span>
              <strong>You’re at the latest</strong>
              <small>Sorry, tomorrow.</small>
            </div>
          ))}
      </div>

      <nav className="comic-navigation" aria-label="Comic chronology">
        {older && olderHref ? (
          <a href={olderHref}>← Older comic</a>
        ) : (
          <span>First comic</span>
        )}
        <a href={`${sitePath("/")}#archive`}>All strips</a>
        {newer && newerHref ? (
          <a href={newerHref}>Newer comic →</a>
        ) : (
          <span>You’re at the latest comic</span>
        )}
      </nav>

      <details className="transcript">
        <summary>Read comic transcript</summary>
        <ol>
          {episode.panels.map((panel, index) => (
            <li key={`${episode.slug}-transcript-${index}`}>
              <strong>Panel {index + 1}.</strong>{" "}
              {panel.lines
                .map((line) => `${line.speaker}: ${line.text}`)
                .join(" ") || "No dialogue."}{" "}
              {panel.description}
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
