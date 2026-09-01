"use client";

import { useCallback, useEffect, useState } from "react";
import type { MouseEvent } from "react";

type Line = {
  speaker: string;
  text: string;
};

type ComicArt = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

type TranscriptPanel = {
  lines: Line[];
  description: string;
};

type Episode = {
  slug: string;
  title: string;
  label: string;
  date: string;
  caption: string;
  shell?: "art-first";
  art: ComicArt[];
  panels: TranscriptPanel[];
};

const episodes: Episode[] = [
  {
    slug: "the-honest-demo",
    title: "The Honest Demo",
    label: "Comic 004 · Ahead AI",
    date: "September 2026",
    caption: "The Ahead AI Agent is live on the client’s servers. What could possibly be in the executive summary?",
    shell: "art-first",
    art: [
      {
        src: "comics/the-honest-demo/p1-lettered.svg",
        width: 1536,
        height: 1024,
        alt: "Ahead AI begins a live client demonstration. Dex says the Ahead AI Agent is live on the client’s servers, and the middle client CEO asks for the executive summary. Token watches from the left.",
      },
      {
        src: "comics/the-honest-demo/p2-lettered.svg",
        width: 1536,
        height: 1024,
        alt: "The Agent reports that the lease payment is 38 days late and that a customer has been waiting on Line 2 for 36 hours. The room maintains its polite presentation composure.",
      },
      {
        src: "comics/the-honest-demo/p3-lettered.svg",
        width: 1536,
        height: 1024,
        alt: "The Agent reports an empty toilet-paper roll in the lobby restroom and names Marcio, the cafeteria cashier, as top performer with zero missed deliveries. Every human stares in synchronized shock while Token remains dry.",
      },
      {
        src: "comics/the-honest-demo/p4-lettered.svg",
        width: 1536,
        height: 1024,
        alt: "The display says Executive Summary Complete. The middle client CEO beams and says, Brilliant! Roll it out immediately. The clients are pleased, Ahead AI is stunned, and Token looks unimpressed.",
      },
    ],
    panels: [
      {
        lines: [
          { speaker: "Dex", text: "The Ahead AI Agent is live on your servers." },
          { speaker: "Client CEO", text: "Give me the executive summary." },
        ],
        description: "Dex presents the live Agent while the middle client CEO requests its executive summary.",
      },
      {
        lines: [
          { speaker: "Ahead AI Agent", text: "Lease payment: 38 days late." },
          { speaker: "Ahead AI Agent", text: "Customer has been waiting on Line 2 for 36 hours." },
        ],
        description: "Finance and customer-support findings appear while everyone holds their presentation composure.",
      },
      {
        lines: [
          { speaker: "Ahead AI Agent", text: "Lobby restroom: out of toilet paper." },
          { speaker: "Ahead AI Agent", text: "Marcio, cafeteria cashier. Zero missed deliveries." },
        ],
        description: "The facilities finding and Marcio’s respectful top-performer result trigger synchronized human shock.",
      },
      {
        lines: [
          { speaker: "Display", text: "Executive summary complete." },
          { speaker: "Client CEO", text: "Brilliant!! Roll it out immediately!" },
        ],
        description: "The clients are delighted, Ahead AI remains stunned, and Token gives the reader a dry look.",
      },
    ],
  },
  {
    slug: "vibe-coding-in-your-sleep",
    title: "Vibe Coding in Your Sleep",
    label: "Comic 003 · Ahead AI",
    date: "v0.0.3",
    caption: "Mina talks in her sleep. Token treats it as a requirements document.",
    art: [
      {
        src: "comics/vibe-coding-in-your-sleep/website-master.png",
        width: 1700,
        height: 1838,
        alt: "At 2:17 A.M., Mina has fallen asleep at her desk while Token waits beside her. Still asleep, she murmurs four disconnected fragments: “auto-magical…”, “add glitter…”, “add joy…”, and “make token pretty…”. Token treats the fragments as requirements. By morning, the workstation has become pastel and decorative under an enabled automated beauty profile. In the silent final panel, Token stands alone beneath a glittering halo, covered in fluffy trim and charms, visibly irritated by the makeover he executed.",
      },
    ],
    panels: [
      {
        lines: [{ speaker: "Clock", text: "2:17 A.M." }],
        description: "Mina has fallen asleep at her desk while Token waits beside her in ambient listening mode.",
      },
      {
        lines: [
          { speaker: "Mina", text: "auto-magical…" },
          { speaker: "Mina", text: "add glitter…" },
          { speaker: "Mina", text: "add joy…" },
          { speaker: "Mina", text: "make token pretty…" },
        ],
        description: "Still asleep, Mina murmurs four disconnected fragments and Token treats them as requirements.",
      },
      {
        lines: [{ speaker: "System", text: "AUTOMATED BEAUTY PROFILE ENABLED" }],
        description: "By morning, the same workstation has become pastel and decorative while Mina remains asleep.",
      },
      {
        lines: [],
        description: "Token stands alone beneath a glittering halo, covered in fluffy trim and charms, visibly irritated by the makeover he executed.",
      },
    ],
  },
  {
    slug: "undefeated",
    title: "Undefeated",
    label: "Comic 002 · Ahead AI",
    date: "v0.0.2",
    caption: "Zero mistakes. The methodology is flawless.",
    art: [
      {
        src: "comics/undefeated/website-master.png",
        width: 1700,
        height: 3398,
        alt: "Two-panel workplace comic. In Panel 1, Mina hands Token a substantial unchecked launch checklist beside a dark, untouched workstation and says, “And make no mistakes.” In Panel 2, the workstation is still untouched and the checklist remains empty. A small, smug Token stands on a tiny podium holding an enormous gold trophy while a scoreboard reads zero mistakes and zero tasks attempted. Mina throws up her hands in stunned disbelief. Token says, “Undefeated.”",
      },
    ],
    panels: [
      {
        lines: [{ speaker: "Mina", text: "And make no mistakes." }],
        description: "Mina hands Token a substantial unchecked launch checklist beside a dark, untouched workstation. The checklist is labeled LAUNCH CHECKLIST.",
      },
      {
        lines: [{ speaker: "Token", text: "Undefeated." }],
        description: "The workstation remains untouched and the checklist remains empty. Token stands on a tiny podium holding an enormous gold trophy while a scoreboard reads MISTAKES: 0 and TASKS ATTEMPTED: 0. Mina throws up her hands in stunned disbelief.",
      },
    ],
  },
  {
    slug: "executive-twin",
    title: "Executive Twin",
    label: "Comic 001 · Ahead AI",
    date: "v0.0.1",
    caption: "Leadership at machine speed. Accountability sold separately.",
    art: [
      {
        src: "comics/executive-twin/p1-lettered.svg",
        width: 1700,
        height: 1620,
        alt: "Panel 1. Dex says, “I trained a digital twin on my entire leadership style.” Clara says, “Were outcomes included?” Dex presents a miniature holographic copy while Clara tests the premise.",
      },
      {
        src: "comics/executive-twin/p2-lettered.svg",
        width: 1700,
        height: 1560,
        alt: "Panel 2. Mina says, “It can now make executive decisions at machine speed.” Wes says, “Can it explain one?” Mina celebrates the working prototype as Wes reaches toward rollback.",
      },
      {
        src: "comics/executive-twin/p3-lettered.svg",
        width: 1700,
        height: 1570,
        alt: "Panel 3. AI Dex says, “My recommendation: delegate all accountability.” Dex says, “See? It understands management.” The digital twin reproduces Dex’s blind spot perfectly.",
      },
      {
        src: "comics/executive-twin/p4-lettered.svg",
        width: 1700,
        height: 1240,
        alt: "Panel 4. Four holographic Dexes route accountability clockwise around the proudly posing original as Clara and Token stare, Mina applauds, and Wes reaches for rollback.",
      },
    ],
    panels: [
      {
        lines: [
          { speaker: "Dex", text: "I trained a digital twin on my entire leadership style." },
          { speaker: "Clara", text: "Were outcomes included?" },
        ],
        description: "Dex presents a miniature holographic copy while Clara tests the premise.",
      },
      {
        lines: [
          { speaker: "Mina", text: "It can now make executive decisions at machine speed." },
          { speaker: "Wes", text: "Can it explain one?" },
        ],
        description: "Mina celebrates the working prototype as Wes reaches toward rollback.",
      },
      {
        lines: [
          { speaker: "AI Dex", text: "My recommendation: delegate all accountability." },
          { speaker: "Dex", text: "See? It understands management." },
        ],
        description: "The digital twin reproduces Dex’s blind spot perfectly.",
      },
      {
        lines: [],
        description: "Four holographic Dexes route accountability clockwise around the proudly posing original as Clara and Token stare, Mina applauds, and Wes reaches for rollback.",
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
  const artFirst = episode.shell === "art-first";
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
    <article className={`reader${artFirst ? " reader-art-first" : ""}`} id="latest-comic" aria-live="polite">
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
          <span>{episode.date}</span>
        </header>
      )}

      <div className={`reader-stage${artFirst ? " art-first-reader-stage" : ""}`}>
        {!artFirst && (older ? (
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
        ))}

        <figure className={`comic-page${artFirst ? " art-first-comic-page" : ""}`} key={episode.slug}>
          <div className={`comic-art${artFirst ? " art-first-comic-art" : ""}`} role="group" aria-label={`${episode.title}, ${episode.panels.length} panels`}>
            {episode.art.map((art, index) => (
              // Approved comic assets must be served byte-for-byte; image optimization is intentionally bypassed.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="comic-panel-art"
                key={art.src}
                src={art.src}
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

        {!artFirst && (newer ? (
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
        ))}
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
