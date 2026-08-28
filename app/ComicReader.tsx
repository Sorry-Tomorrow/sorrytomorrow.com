"use client";

import { useCallback, useEffect, useState } from "react";
import type { MouseEvent } from "react";

type Line = {
  speaker: string;
  text: string;
};

type Panel = {
  image: {
    src: string;
    width: number;
    height: number;
  };
  lines: Line[];
  description: string;
};

type Episode = {
  slug: string;
  title: string;
  label: string;
  date: string;
  panels: Panel[];
};

const episodes: Episode[] = [
  {
    slug: "executive-twin",
    title: "Executive Twin",
    label: "First approved comic",
    date: "v0.0.1",
    panels: [
      {
        image: {
          src: "comics/executive-twin/p1-lettered.svg",
          width: 1700,
          height: 1620,
        },
        lines: [
          { speaker: "Dex", text: "I trained a digital twin on my entire leadership style." },
          { speaker: "Clara", text: "Were outcomes included?" },
        ],
        description: "Dex presents a miniature holographic copy while Clara tests the premise.",
      },
      {
        image: {
          src: "comics/executive-twin/p2-lettered.svg",
          width: 1700,
          height: 1560,
        },
        lines: [
          { speaker: "Mina", text: "It can now make executive decisions at machine speed." },
          { speaker: "Wes", text: "Can it explain one?" },
        ],
        description: "Mina celebrates the working prototype as Wes reaches toward rollback.",
      },
      {
        image: {
          src: "comics/executive-twin/p3-lettered.svg",
          width: 1700,
          height: 1570,
        },
        lines: [
          { speaker: "AI Dex", text: "My recommendation: delegate all accountability." },
          { speaker: "Dex", text: "See? It understands management." },
        ],
        description: "The digital twin reproduces Dex’s blind spot perfectly.",
      },
      {
        image: {
          src: "comics/executive-twin/p4-lettered.svg",
          width: 1700,
          height: 1240,
        },
        lines: [],
        description: "Four holographic Dexes route accountability clockwise around the proudly posing original as Clara and Token stare, Mina applauds, and Wes reaches for rollback.",
      },
    ],
  },
];

function panelAlt(panel: Panel, index: number) {
  const dialogue = panel.lines
    .map((line) => `${line.speaker} says, “${line.text}”`)
    .join(" ");

  return `Panel ${index + 1}. ${dialogue ? `${dialogue} ` : ""}${panel.description}`;
}

function getEpisodeIndex() {
  if (typeof window === "undefined") return 0;
  const slug = new URL(window.location.href).searchParams.get("comic");
  const index = episodes.findIndex((episode) => episode.slug === slug);
  return index >= 0 ? index : 0;
}

export function ComicReader() {
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const episode = episodes[episodeIndex];
  const older = episodes[episodeIndex + 1];
  const newer = episodes[episodeIndex - 1];

  const navigateTo = useCallback((nextIndex: number) => {
    const target = episodes[nextIndex];
    if (!target) return;
    const url = new URL(window.location.href);
    url.searchParams.set("comic", target.slug);
    url.searchParams.delete("character");
    url.hash = "latest-comic";
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setEpisodeIndex(nextIndex);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("latest-comic")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  useEffect(() => {
    const syncWithUrl = () => setEpisodeIndex(getEpisodeIndex());
    syncWithUrl();
    window.addEventListener("popstate", syncWithUrl);
    return () => window.removeEventListener("popstate", syncWithUrl);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("a, button, input, textarea, select, summary")) return;

      if (event.key === "ArrowLeft" && older) {
        event.preventDefault();
        navigateTo(episodeIndex + 1);
      }

      if (event.key === "ArrowRight" && newer) {
        event.preventDefault();
        navigateTo(episodeIndex - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [episodeIndex, navigateTo, newer, older]);

  function episodeHref(target: Episode) {
    return `?comic=${target.slug}#latest-comic`;
  }

  function handleEpisodeClick(event: MouseEvent<HTMLAnchorElement>, nextIndex: number) {
    event.preventDefault();
    navigateTo(nextIndex);
  }

  return (
    <article className="reader" id="latest-comic" aria-live="polite">
      <header className="episode-folio">
        <span>{episode.label}</span>
        <h2>{episode.title}</h2>
        <span>{episode.date}</span>
      </header>

      <div className="reader-stage">
        {older ? (
          <a
            className="edge-navigation older"
            href={episodeHref(older)}
            onClick={(event) => handleEpisodeClick(event, episodeIndex + 1)}
            aria-keyshortcuts="ArrowLeft"
          >
            <span aria-hidden="true">←</span>
            <strong>Older comic</strong>
            <small>{older.title}</small>
          </a>
        ) : (
          <div className="edge-navigation latest" aria-label="You are at the first comic">
            <span aria-hidden="true">—</span>
            <strong>First comic</strong>
            <small>Archive begins here</small>
          </div>
        )}

        <figure className="comic-page" key={episode.slug}>
          <div className="comic-art" role="group" aria-label={`${episode.title}, four panels`}>
            {episode.panels.map((panel, index) => (
              // The approved SVG authorities must be served byte-for-byte; image optimization is intentionally bypassed.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="comic-panel-art"
                key={`${episode.slug}-${index}`}
                src={panel.image.src}
                width={panel.image.width}
                height={panel.image.height}
                alt={panelAlt(panel, index)}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding="async"
              />
            ))}
          </div>
          <figcaption>
            <span>{episode.title}</span>
            <span>First production-ready pilot · v0.0.1</span>
          </figcaption>
        </figure>

        {newer ? (
          <a
            className="edge-navigation newer"
            href={episodeHref(newer)}
            onClick={(event) => handleEpisodeClick(event, episodeIndex - 1)}
            aria-keyshortcuts="ArrowRight"
          >
            <span aria-hidden="true">→</span>
            <strong>Newer comic</strong>
            <small>{newer.title}</small>
          </a>
        ) : (
          <div className="edge-navigation latest" aria-label="You are at the latest comic">
            <span aria-hidden="true">—</span>
            <strong>You’re at the latest</strong>
            <small>Sorry, tomorrow.</small>
          </div>
        )}
      </div>

      <nav className="comic-navigation" aria-label="Comic chronology">
        {older ? (
          <a href={episodeHref(older)} onClick={(event) => handleEpisodeClick(event, episodeIndex + 1)}>
            ← Older comic
          </a>
        ) : (
          <span>First comic</span>
        )}
        <a href="#archive">All strips</a>
        {newer ? (
          <a href={episodeHref(newer)} onClick={(event) => handleEpisodeClick(event, episodeIndex - 1)}>
            Newer comic →
          </a>
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
              {panel.lines.map((line) => `${line.speaker}: ${line.text}`).join(" ") || "No dialogue."}{" "}
              {panel.description}
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
