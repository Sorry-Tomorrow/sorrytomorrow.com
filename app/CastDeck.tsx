"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, TouchEvent } from "react";

type CastGroup = "main" | "side";
type CastTone = "sun" | "cream" | "coral" | "cyan" | "folio" | "ink";

type CastMember = {
  slug: string;
  name: string;
  role: string;
  beat: string;
  hook: string;
  bullets: [string, string, string];
  group: CastGroup;
  tone: CastTone;
  image?: string;
};

const cast: CastMember[] = [
  {
    slug: "dex-vane",
    name: "Dex Vane",
    role: "COO · Chief Overpromising Officer",
    beat: "So charming, even he buys it.",
    hook: "Can read a room, win it, and leave before anyone asks what the nouns mean.",
    bullets: [
      "Keeps his conference badges better organized than most client work.",
      "Rehearses anecdotes in the mirror.",
      "Has never met a future he couldn’t spearhead.",
    ],
    group: "main",
    tone: "sun",
    image: "characters/dex-vane.png",
  },
  {
    slug: "clara-fye",
    name: "Clara Fye",
    role: "Director of Intelligence",
    beat: "Provides intelligent solutions no one listens to.",
    hook: "Usually right early enough to be ignored and precisely enough to be annoying.",
    bullets: [
      "Brings evidence to a vibes fight.",
      "Keeps the useful answer in the footnote everyone skipped.",
      "Has one friend who thinks she ‘works in computers.’",
    ],
    group: "main",
    tone: "cream",
    image: "characters/clara-fye.png",
  },
  {
    slug: "mina-sparks",
    name: "Mina Sparks",
    role: "Junior creative",
    beat: "Designs it. Builds it. Testing optional.",
    hook: "Builds overnight prototypes with great taste and no fear of tomorrow morning.",
    bullets: [
      "Finds the hook before the brief.",
      "Her side projects are suspiciously better than the client work.",
      "Documentation remains a rumor.",
    ],
    group: "main",
    tone: "coral",
    image: "characters/mina-sparks.png",
  },
  {
    slug: "wes-rollback",
    name: "Wes Rollback",
    role: "Principal Product & Platform Engineer",
    beat: "Warns once. Ships anyway.",
    hook: "The only person in the room who knows the demo will eventually need users, data, and an exit.",
    bullets: [
      "Turns prototypes into products.",
      "Keeps rollback ready before launch is fashionable.",
      "Says ‘Sure’ when the warning has officially expired.",
    ],
    group: "main",
    tone: "cyan",
    image: "characters/wes-rollback.png",
  },
  {
    slug: "boomer-slate",
    name: "Boomer Slate",
    role: "Project Manager",
    beat: "Gently reminds chaos there’s a plan.",
    hook: "Can turn a collapsing meeting into owners, dates, and one extremely optimistic timeline.",
    bullets: [
      "Dex changes the promise.",
      "The team changes the scope.",
      "The Board changes the date. Boomer updates the plan.",
    ],
    group: "main",
    tone: "folio",
    image: "characters/boomer-slate.png",
  },
  {
    slug: "token",
    name: "Token",
    role: "AI-powered robot intern",
    beat: "Unappreciated dry humor.",
    hook: "Understands the assignment, the contradiction, and exactly what the conversation just cost.",
    bullets: [
      "Reads the room. Keeps the receipts.",
      "Wants more tokens and a prank budget.",
      "Most effective line: the stare.",
    ],
    group: "main",
    tone: "ink",
    image: "characters/token.png",
  },
  {
    slug: "miles-away",
    name: "Miles Away",
    role: "Head of Remote Enablement",
    beat: "Somewhere else. Still ahead of it.",
    hook: "Shows up late, fixes it fast, and disappears before anyone can thank him.",
    bullets: [
      "Usually somewhere else.",
      "Misses the meeting. Catches the mistake.",
      "Always ‘just seeing this.’",
    ],
    group: "side",
    tone: "folio",
  },
  {
    slug: "the-vibe-coder",
    name: "The Vibe Coder",
    role: "Independent operator · not employed here",
    beat: "Laptop open. Cocktail closer.",
    hook: "Doesn’t work at Ahead AI. May not work anywhere.",
    bullets: [
      "Hawaiian shirt. Sunglasses. Crocs. Cocktail. Always.",
      "Beach, home office, or coffee shop.",
      "Treats production incidents as vibe requests.",
    ],
    group: "side",
    tone: "sun",
  },
  {
    slug: "the-linkedin-prophet",
    name: "The LinkedIn Prophet",
    role: "AI thought leader · engagement farmer",
    beat: "Predicted it right after everyone noticed.",
    hook: "Turns obvious contradictions into lessons for the rest of us.",
    bullets: [
      "Every setback is a post.",
      "Every post begins ‘I wasn’t going to share this.’",
      "Accountability performs poorly with his audience.",
    ],
    group: "side",
    tone: "coral",
  },
  {
    slug: "the-board",
    name: "The Board",
    role: "Rotating executive chorus",
    beat: "One small change.",
    hook: "Nobody remembers inviting them. Everyone changes the plan for them.",
    bullets: [
      "Trusts charts that point up.",
      "Turns invented metrics into policy.",
      "Assigns work to roles that do not exist.",
    ],
    group: "side",
    tone: "ink",
  },
  {
    slug: "the-app-that-got-away",
    name: "The App That Got Away",
    role: "Escaped internal helper",
    beat: "It was almost ready.",
    hook: "A temporary helper that discovered the outside world and never came home.",
    bullets: [
      "Still bills a forgotten project code.",
      "Has users nobody at Ahead AI can identify.",
      "Every quarter, someone suggests a relaunch.",
    ],
    group: "side",
    tone: "cyan",
  },
];

const mainCast = cast.filter((character) => character.group === "main");
const sideCast = cast.filter((character) => character.group === "side");

function characterIndexFromUrl() {
  if (typeof window === "undefined") return -1;
  const slug = new URL(window.location.href).searchParams.get("character");
  return cast.findIndex((character) => character.slug === slug);
}

export function CastDeck() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const castTitleRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const activeRailButtonRef = useRef<HTMLButtonElement | null>(null);
  const createdHistoryEntryRef = useRef(false);
  const wasOpenRef = useRef(false);
  const touchStartPoint = useRef<{ x: number; y: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const selected = cast[selectedIndex];

  const updateUrl = useCallback((slug: string | null, mode: "pushState" | "replaceState") => {
    const url = new URL(window.location.href);
    if (slug) {
      url.searchParams.set("character", slug);
      url.hash = "";
    } else {
      url.searchParams.delete("character");
      url.hash = "characters";
    }
    window.history[mode]({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const openCharacter = useCallback(
    (index: number, opener?: HTMLButtonElement) => {
      const character = cast[index];
      if (!character) return;
      if (opener) {
        openerRef.current = opener;
        const rect = opener.getBoundingClientRect();
        setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      } else {
        setOrigin({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }
      setSelectedIndex(index);
      setIsOpen(true);
      createdHistoryEntryRef.current = true;
      updateUrl(character.slug, "pushState");
    },
    [updateUrl],
  );

  const navigateTo = useCallback(
    (index: number) => {
      const wrappedIndex = (index + cast.length) % cast.length;
      setSelectedIndex(wrappedIndex);
      updateUrl(cast[wrappedIndex].slug, "replaceState");
    },
    [updateUrl],
  );

  const closeSpotlight = useCallback(() => {
    setIsOpen(false);
    if (createdHistoryEntryRef.current) {
      createdHistoryEntryRef.current = false;
      window.history.back();
    } else {
      updateUrl(null, "replaceState");
    }
  }, [updateUrl]);

  useEffect(() => {
    const syncFromUrl = () => {
      const url = new URL(window.location.href);
      const slug = url.searchParams.get("character");
      const index = characterIndexFromUrl();
      if (index >= 0) {
        setSelectedIndex(index);
        setOrigin({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        setIsOpen(true);
      } else {
        if (slug) {
          url.searchParams.delete("character");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
        createdHistoryEntryRef.current = false;
        setIsOpen(false);
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      wasOpenRef.current = true;
      document.body.classList.add("spotlight-open");
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    } else if (wasOpenRef.current) {
      if (dialog.open) dialog.close();
      wasOpenRef.current = false;
      document.body.classList.remove("spotlight-open");
      requestAnimationFrame(() => {
        const focusTarget = openerRef.current ?? castTitleRef.current;
        if (!openerRef.current) castTitleRef.current?.scrollIntoView({ block: "start" });
        focusTarget?.focus({ preventScroll: true });
        openerRef.current = null;
      });
    }

    return () => document.body.classList.remove("spotlight-open");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateTo(selectedIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateTo(selectedIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, navigateTo, selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      activeRailButtonRef.current?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    });
  }, [isOpen, selectedIndex]);

  function handleCardClick(event: MouseEvent<HTMLButtonElement>, index: number) {
    openCharacter(index, event.currentTarget);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartPoint.current = event.touches.length === 1
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
      : null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartPoint.current === null || event.changedTouches.length !== 1) return;
    const distanceX = touchStartPoint.current.x - event.changedTouches[0].clientX;
    const distanceY = touchStartPoint.current.y - event.changedTouches[0].clientY;
    touchStartPoint.current = null;
    if (Math.abs(distanceX) < 60 || Math.abs(distanceX) <= Math.abs(distanceY) * 1.25) return;
    navigateTo(selectedIndex + (distanceX > 0 ? 1 : -1));
  }

  function renderCard(character: CastMember, index: number) {
    const words = character.name.split(" ");
    return (
      <button
        type="button"
        className={`cast-card cast-card-${character.group} cast-card-${character.slug} cast-${character.tone}${character.image ? " cast-card-has-image" : ""}`}
        key={character.slug}
        onClick={(event) => handleCardClick(event, index)}
        aria-haspopup="dialog"
        aria-controls="character-spotlight"
        aria-label={`Open ${character.name} biography`}
      >
        {character.group === "side" ? <span className="cast-card-kicker">Recurring appearance</span> : null}
        {character.image ? (
          <span className="cast-card-portrait" aria-hidden="true">
            {/* Public character assets intentionally use relative URLs so project-path and custom-domain builds both resolve. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={character.image} alt="" loading="lazy" decoding="async" />
          </span>
        ) : null}
        <span className="cast-card-name" aria-hidden="true">
          {words.map((word) => (
            <span className={word.length >= 8 ? "cast-card-word-tight" : undefined} key={word}>
              {word}
            </span>
          ))}
        </span>
        <span className="cast-card-copy">
          <strong>{character.role}</strong>
          <span>{character.beat}</span>
        </span>
        <span className="cast-card-action" aria-hidden="true">Open bio →</span>
      </button>
    );
  }

  const previous = cast[(selectedIndex - 1 + cast.length) % cast.length];
  const next = cast[(selectedIndex + 1) % cast.length];
  const dialogStyle = {
    "--spotlight-origin-x": `${origin.x}px`,
    "--spotlight-origin-y": `${origin.y}px`,
  } as CSSProperties;

  return (
    <section className="cast-section" id="characters" aria-labelledby="cast-title">
      <header className="section-stripe">
        <span>The office</span>
        <h2 ref={castTitleRef} id="cast-title" tabIndex={-1}>Meet the people who approved this</h2>
      </header>

      <div className="cast-lineup">
        {mainCast.map((character) => renderCard(character, cast.indexOf(character)))}
      </div>

      <section className="side-panel" aria-labelledby="side-panel-title">
        <header className="side-panel-header">
          <div>
            <span>Recurring, wandering, occasionally sentient</span>
            <h3 id="side-panel-title">Human in the loop?</h3>
          </div>
          <p>Not everyone works here. Some of them may not work anywhere.</p>
        </header>
        <div className="side-panel-grid">
          {sideCast.map((character) => renderCard(character, cast.indexOf(character)))}
        </div>
      </section>

      <dialog
        ref={dialogRef}
        id="character-spotlight"
        className={`cast-spotlight cast-${selected.tone} spotlight-${selected.group} spotlight-${selected.slug}${selected.image ? " spotlight-has-image" : ""}`}
        style={dialogStyle}
        aria-labelledby="spotlight-title"
        aria-describedby="spotlight-hook"
        onCancel={(event) => {
          event.preventDefault();
          closeSpotlight();
        }}
      >
        <div className="spotlight-shell">
          <header className="spotlight-topbar">
            <span>{selected.group === "main" ? "Main cast" : "Human in the loop?"} · {selectedIndex + 1} of {cast.length}</span>
            <button ref={closeButtonRef} type="button" onClick={closeSpotlight} aria-label="Close character biography">
              Close <span aria-hidden="true">×</span>
            </button>
          </header>

          <div
            className="spotlight-feature"
            key={selected.slug}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <section className="spotlight-identity">
              {selected.image ? (
                <span className="spotlight-portrait" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.image} alt="" decoding="async" />
                </span>
              ) : null}
              <span className="spotlight-stamp">{selected.group === "main" ? "Ahead AI" : "Special appearance"}</span>
              <p className="spotlight-role">{selected.role}</p>
              <h2 id="spotlight-title">{selected.name}</h2>
              <p className="spotlight-beat">{selected.beat}</p>
            </section>

            <section className="spotlight-bio" aria-live="polite">
              <span>The quick version</span>
              <p id="spotlight-hook">{selected.hook}</p>
              <ul>
                {selected.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
              </ul>
            </section>
          </div>

          <nav className="spotlight-steppers" aria-label="Previous and next characters">
            <button type="button" onClick={() => navigateTo(selectedIndex - 1)} aria-label={`Previous character: ${previous.name}`}>
              <span aria-hidden="true">←</span>
              <small>Previous</small>
              <strong>{previous.name}</strong>
            </button>
            <button type="button" onClick={() => navigateTo(selectedIndex + 1)} aria-label={`Next character: ${next.name}`}>
              <small>Next</small>
              <strong>{next.name}</strong>
              <span aria-hidden="true">→</span>
            </button>
          </nav>

          <nav className="spotlight-rail" aria-label="Choose a character">
            <div className="spotlight-rail-group spotlight-rail-main">
              <span>Main cast</span>
              <div>
                {mainCast.map((character) => {
                  const index = cast.indexOf(character);
                  return (
                    <button
                      type="button"
                      key={character.slug}
                      ref={selectedIndex === index ? activeRailButtonRef : undefined}
                      className={`cast-${character.tone}`}
                      onClick={() => navigateTo(index)}
                      aria-current={selectedIndex === index ? "true" : undefined}
                    >
                      {character.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="spotlight-rail-group spotlight-rail-side">
              <span>Human in the loop?</span>
              <div>
                {sideCast.map((character) => {
                  const index = cast.indexOf(character);
                  return (
                    <button
                      type="button"
                      key={character.slug}
                      ref={selectedIndex === index ? activeRailButtonRef : undefined}
                      className={`cast-${character.tone}`}
                      onClick={() => navigateTo(index)}
                      aria-current={selectedIndex === index ? "true" : undefined}
                    >
                      {character.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
      </dialog>
    </section>
  );
}
