"use client";

import { useCallback, useEffect, useState } from "react";
import type { MouseEvent } from "react";

type Line = {
  speaker: string;
  text: string;
};

type Panel = {
  scene: "dex" | "mina" | "wes" | "token";
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
    label: "Latest concept strip",
    date: "Design placeholder",
    panels: [
      {
        scene: "dex",
        lines: [
          { speaker: "Dex", text: "I trained a digital twin on my entire leadership style." },
          { speaker: "Clara", text: "Were outcomes included?" },
        ],
        description: "Dex presents a miniature holographic copy while Clara tests the premise.",
      },
      {
        scene: "mina",
        lines: [
          { speaker: "Mina", text: "It can now make executive decisions at machine speed." },
          { speaker: "Wes", text: "Can it explain one?" },
        ],
        description: "Mina celebrates the working prototype as Wes reaches toward rollback.",
      },
      {
        scene: "wes",
        lines: [
          { speaker: "AI Dex", text: "My recommendation: delegate all accountability." },
          { speaker: "Dex", text: "See? It understands management." },
        ],
        description: "The digital twin reproduces Dex’s blind spot perfectly.",
      },
      {
        scene: "token",
        lines: [],
        description: "Four Dex holograms point blame in a circle while Token stares at the reader.",
      },
    ],
  },
  {
    slug: "meeting-reduction",
    title: "Meeting Reduction",
    label: "Older concept strip",
    date: "Design placeholder",
    panels: [
      {
        scene: "mina",
        lines: [{ speaker: "Mina", text: "I built a bot that attends meetings for us." }],
        description: "Mina unveils a cheerful meeting assistant.",
      },
      {
        scene: "wes",
        lines: [{ speaker: "Wes", text: "What does it do with the summary?" }],
        description: "Wes asks the only operational question.",
      },
      {
        scene: "dex",
        lines: [{ speaker: "Dex", text: "It schedules a meeting to review it." }],
        description: "Dex presents the recursive workflow as a breakthrough.",
      },
      {
        scene: "token",
        lines: [{ speaker: "Token", text: "Attendance is now fully autonomous." }],
        description: "An empty conference room contains a wall of overlapping meeting windows.",
      },
    ],
  },
  {
    slug: "context-window",
    title: "Context Window",
    label: "Oldest concept strip",
    date: "Design placeholder",
    panels: [
      {
        scene: "wes",
        lines: [{ speaker: "Clara", text: "The context window is full." }],
        description: "Clara points to the limit in her annotated notebook.",
      },
      {
        scene: "dex",
        lines: [{ speaker: "Dex", text: "Then let’s create capacity." }],
        description: "Dex confidently approaches the conference-room window.",
      },
      {
        scene: "mina",
        lines: [{ speaker: "Mina", text: "Technically, it is more open now." }],
        description: "Source documents sail through the open window.",
      },
      {
        scene: "token",
        lines: [],
        description: "The team watches the documents scatter across the city as Token faces the reader.",
      },
    ],
  },
];

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
    window.history.pushState({}, "", `?comic=${target.slug}#latest-comic`);
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
          <div className="edge-navigation latest" aria-label="You are at the oldest concept comic">
            <span aria-hidden="true">—</span>
            <strong>Oldest reached</strong>
            <small>Archive begins here</small>
          </div>
        )}

        <figure className="comic-page" key={episode.slug}>
          <div className="comic-grid">
            {episode.panels.map((panel, index) => (
              <section
                className={`comic-panel panel-${panel.scene}`}
                key={`${episode.slug}-${index}`}
                aria-label={`Panel ${index + 1}`}
              >
                <span className="panel-number">{String(index + 1).padStart(2, "0")}</span>
                <div className="panel-scene" aria-hidden="true">
                  <span className="character-shape" />
                  {panel.scene === "token" ? <span className="blame-loop">DEX → DEX → DEX</span> : null}
                </div>
                <div className="panel-copy">
                  {panel.lines.length ? (
                    panel.lines.map((line) => (
                      <p className="speech" key={`${line.speaker}-${line.text}`}>
                        <strong>{line.speaker}:</strong> {line.text}
                      </p>
                    ))
                  ) : (
                    <p className="silent-panel">Silent payoff</p>
                  )}
                </div>
              </section>
            ))}
          </div>
          <figcaption>
            <span>{episode.title}</span>
            <span>Placeholder artwork for design review</span>
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
          <span>Oldest concept comic</span>
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
