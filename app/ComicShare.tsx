"use client";

import { useRef, useState } from "react";
import { shareTargets, readerShareUrl, shareCaption, nativeShareText } from "./sharing.mjs";
import { officialPostsFeed, validatedOfficialPosts } from "./official-posts.mjs";

type Download = { url: string; filename: string; bytes: number; mimeType: string };
type Props = {
  title: string;
  url: string;
  slug?: string;
  number?: number;
  text: string;
  download?: Download;
  officialPosts?: Record<string, string>;
  placement: "home" | "episode" | "footer";
};

export function ComicShare({ title, url, slug, number, text, download, officialPosts = {}, placement }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const linkField = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File>();
  const [preparing, setPreparing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [posts, setPosts] = useState(officialPosts);
  const [manualCopy, setManualCopy] = useState(url);
  const [manualCopyLabel, setManualCopyLabel] = useState("Permanent link");
  const returnFocus = useRef<HTMLElement | null>(null);
  const label = slug ? "Share this comic" : "Share the series";
  const targets = shareTargets(url, title, slug, number);

  function track(action: string, method: string) {
    window.dispatchEvent(new CustomEvent("sorrytomorrow:share", {
      detail: { action, method, comic_slug: slug, placement },
    }));
  }

  function openOptions() {
    setMessage("");
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : trigger.current;
    if (!dialog.current?.open) dialog.current?.showModal();
    track("opened", "options");
    if (slug) {
      // Public URLs only. A current empty row also removes withdrawn post links.
      void fetch(officialPostsFeed, { credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(5000) })
        .then(response => response.ok ? response.json() : null)
        .then(feed => { const fresh = validatedOfficialPosts(feed, slug); if (fresh) setPosts(fresh); })
        .catch(() => { /* Retain the last verified snapshot if GitHub is unavailable. */ });
    }
  }

  function closeOptions() {
    dialog.current?.close();
    returnFocus.current?.focus();
  }

  async function shareLink() {
    if (sharing) return;
    if (!navigator.share) { openOptions(); return; }
    setSharing(true);
    setMessage("");
    track("opened", "native");
    try {
      await navigator.share({ title, text: nativeShareText(text, url), url: readerShareUrl(url, "native", slug, number) });
      track("handed_off", "native");
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) openOptions();
    } finally { setSharing(false); }
  }

  async function copy(value: string, method: "copy_link" | "copy_caption") {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      setMessage(method === "copy_link" ? "Link copied." : "Caption and link copied.");
      track("copied", method);
    } catch {
      if (!dialog.current?.open) returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : trigger.current;
      setManualCopy(value);
      setManualCopyLabel(method === "copy_link" ? "Permanent link" : "Caption and link");
      if (!dialog.current?.open) dialog.current?.showModal();
      setMessage(method === "copy_link" ? "Select and copy the link below." : "Select and copy the caption and link below.");
      requestAnimationFrame(() => { linkField.current?.focus(); linkField.current?.select(); });
    }
  }

  async function shareImage() {
    if (!download || preparing || sharing) return;
    if (file) {
      setSharing(true);
      try {
        // This invocation remains directly inside the second click's user gesture.
        await navigator.share({ files: [file] });
        track("handed_off", "image");
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) setMessage("Use Save comic image, then attach it in your app.");
      } finally { setSharing(false); }
      return;
    }
    if (!navigator.share || !navigator.canShare) {
      setMessage("Use Save comic image, then attach it in your app.");
      return;
    }
    setPreparing(true);
    setMessage("Preparing the complete comic…");
    try {
      const response = await fetch(download.url, { credentials: "omit", signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error("Image unavailable");
      const blob = await response.blob();
      if (blob.size !== download.bytes || blob.type !== download.mimeType) throw new Error("Image changed");
      const candidate = new File([blob], download.filename, { type: download.mimeType });
      if (!navigator.canShare({ files: [candidate] })) throw new Error("File sharing unavailable");
      setFile(candidate);
      setMessage("Image ready. Choose Share image to pick an app.");
    } catch { setMessage("Use Save comic image, then attach it in your app."); }
    finally { setPreparing(false); }
  }

  const saveLink = download && (
    <a href={download.url} download={download.filename} onClick={() => track("download_requested", "image")}>
      Save comic image <span className="share-file-size">JPG · {(download.bytes / 1_000_000).toFixed(1)} MB</span>
    </a>
  );

  return (
    <section className={`comic-share${placement === "footer" ? " series-share" : ""}`} aria-label={label}>
      <div className="share-actions">
        <button type="button" ref={trigger} className="share-primary" onClick={shareLink} disabled={sharing}>
          <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m8 6 4-4 4 4M12 2v13M5 10v11h14V10" /></svg>
          {label}
        </button>
        <button type="button" onClick={() => copy(url, "copy_link")}>Copy link</button>
        {saveLink}
        <button type="button" className="share-more" onClick={openOptions} aria-haspopup="dialog">More options</button>
      </div>
      <p className="share-status" role="status" aria-live="polite">{message}</p>
      <noscript><p>Share on {targets.map((target, index) => <span key={target.method}>{index > 0 && " · "}<a href={target.href} target="_blank" rel="noopener noreferrer">{target.label}</a></span>)}</p></noscript>
      <dialog ref={dialog} className="share-dialog" aria-label={label} onClose={() => returnFocus.current?.focus()}>
        <div className="share-dialog-heading"><p>{label}</p><button type="button" className="share-close" onClick={closeOptions} aria-label="Close sharing options">×</button></div>
        <h2>{title}</h2>
        <nav className="share-destinations" aria-label="Choose where to share">
          {targets.map(target => <a key={target.method} href={target.href} target="_blank" rel="noopener noreferrer" onClick={() => track("target_opened", target.method)}>{target.label}<span aria-hidden="true">↗</span></a>)}
        </nav>
        <label className="share-link-label">{manualCopyLabel}<textarea ref={linkField} readOnly rows={manualCopyLabel === "Permanent link" ? 2 : 4} value={manualCopy} onFocus={event => event.currentTarget.select()} /></label>
        <div className="share-secondary-actions">
          <button type="button" onClick={() => copy(url, "copy_link")}>Copy link</button>
          <button type="button" onClick={() => copy(shareCaption(text, url), "copy_caption")}>Copy caption + link</button>
        </div>
        {download && <div className="share-image-options"><p>Share the complete comic as an image</p><div className="share-secondary-actions">{saveLink}<button type="button" onClick={shareImage} disabled={preparing || sharing}>{preparing ? "Preparing…" : file ? "Share image" : "Prepare image to share"}</button></div><small>Save the full comic for reading or sending in messages.{posts.instagram ? " To share on Instagram, open the original post below." : " You can also copy its caption and link."}</small></div>}
        {Object.keys(posts).length > 0 && <div className="share-originals"><p>Find the original post</p>{Object.entries(posts).map(([channel, href]) => <a key={channel} href={href} target="_blank" rel="noopener noreferrer" data-social-channel={channel} data-social-destination-type="original_post">{channel === "x" ? "X" : channel === "instagram" ? "Instagram" : "Facebook"} ↗</a>)}</div>}
        <p className="share-status" role="status" aria-live="polite">{message}</p>
      </dialog>
    </section>
  );
}
