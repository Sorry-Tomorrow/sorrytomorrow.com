import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const studio = process.env.SORRY_TOMORROW_STUDIO_ROOT ?? "/Users/davidaimi/Documents/UpDragon";
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const catalogPath = path.join(project, "content/episodes.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const studioCatalog = JSON.parse(await readFile(path.join(studio, "studio/catalog/episodes.json"), "utf8"));
const selections = [
  {
    id: "ST-SCRATCH-032", number: 6, slug: "not-so-smart-thermostat", layout: "thermostat",
    manifest: "3d7dc9fcfc6911ec8d8d4eb4a79c76f5b79ec771effb24c84619b786816712e4",
    receipt: "329b6e358e43d9c4c56ad7d6fac4487fb75685494e8d4abd1294eed7d3eb4f83",
    caption: "The office gets a smart thermostat. Everyone has a request.",
    socialImage: "social/instagram-facebook/story/6-s6-token-payoff.png",
    dialogue: [
      [{ speaker: "Boomer", text: "Good news—the new smart thermostat is installed. It can finally read the room." }],
      [{ speaker: "Mina", text: "There… we… go." }, { speaker: "Mina", text: "I connected the thermostat to Token. Now you can just ask him to change it to whatever you want!" }],
      [{ speaker: "Clara", text: "The beach." }],
      [{ speaker: "Dex", text: "The aquarium!" }],
      [{ speaker: "Wes", text: "The bar…" }],
      [{ speaker: "Token", text: "NO HUMAN IN THE LOOP!" }],
    ],
  },
  {
    id: "ST-SCRATCH-033", number: 7, slug: "oops-i-drifted-again", layout: "duck",
    manifest: "b60e7d5d14aae0cb0baeed0f79468556b4e0980091ec2acfb0689aada7f39230",
    receipt: "5576f576bf712d1bc7875fc75e9d01a08478c7c1858d7bcd1c82dd78e7503d61",
    caption: "One purple duck. A very simple request.",
    socialImage: "social/instagram-facebook/story/4-p4-cinematic-focus.png",
  },
  {
    id: "ST-SCRATCH-034", number: 8, slug: "magnification-spiral", layout: "magnification",
    manifest: "c3b44b6cff8962c3c43061c03ebcb57e438a31d7068fb6a83d579e5388e69cb5",
    receipt: "cae02c921c5191d09c3035b96fe41b2e84baa5675fec653de27d6f125b2e464f",
    caption: "Clara notices one tiny detail. Boomer helps her take a closer look.",
    socialImage: "social/instagram-facebook/story/5-p5-cinematic-focus.png",
  },
];
const ledger = { kind: "private-website-preview", productionBaseline: "188bd5fab2412ff7f4d1ded46808438be4cca0d8", studioStateChanged: false, inputs: [], assets: [] };

function decode(value) {
  return value.replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

async function transfer(source, target, expected) {
  const contents = await readFile(source);
  if (sha256(contents) !== expected) throw new Error(`Unapproved source: ${source}`);
  const destination = path.join(project, "public", target);
  await mkdir(path.dirname(destination), { recursive: true });
  try {
    await copyFile(source, destination, constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (sha256(await readFile(destination)) !== expected) throw new Error(`Destination differs: ${target}`);
  }
  if (sha256(await readFile(destination)) !== expected) throw new Error(`Transfer failed: ${target}`);
  ledger.assets.push({ target, source: path.relative(studio, source), sha256: expected, bytes: contents.length });
}

const additions = [];
for (const selection of selections) {
  const episode = studioCatalog.episodes.find(item => item.identity.internalId === selection.id);
  if (episode?.production.state !== "final-approved") throw new Error(`Not approved: ${selection.id}`);
  const root = path.join(studio, episode.production.artifactRoot);
  const manifestBytes = await readFile(path.join(root, "MANIFEST.json"));
  if (sha256(manifestBytes) !== selection.manifest) throw new Error(`Manifest changed: ${selection.id}`);
  const receiptPath = episode.production.ownerApproval.receipt.path;
  if (sha256(await readFile(path.join(studio, receiptPath))) !== selection.receipt) throw new Error(`Receipt changed: ${selection.id}`);
  const manifest = JSON.parse(manifestBytes);
  const entries = Array.isArray(manifest.files) ? manifest.files : Object.entries(manifest.files).map(([file, record]) => ({ path: file, ...record }));
  const byPath = new Map(entries.map(entry => [entry.path, entry]));
  for (const entry of entries) {
    const contents = await readFile(path.join(root, entry.path));
    if (contents.length !== entry.bytes || sha256(contents) !== entry.sha256) throw new Error(`Sealed file changed: ${selection.id}/${entry.path}`);
  }
  const html = await readFile(path.join(root, "website/index.html"), "utf8");
  const art = [];
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
    const attrs = Object.fromEntries([...match[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(attribute => [attribute[1], decode(attribute[2])]));
    if (!/^panels\/[a-z0-9-]+\.(svg|png)$/.test(attrs.src)) throw new Error(`Unexpected image reference: ${attrs.src}`);
    const sourceRelative = `website/${attrs.src}`;
    const target = `comics/${selection.slug}/${path.basename(attrs.src)}`;
    await transfer(path.join(root, sourceRelative), target, byPath.get(sourceRelative).sha256);
    art.push({ src: target, width: Number(attrs.width), height: Number(attrs.height), alt: attrs.alt });
  }
  if (art.length !== episode.story.panelCount) throw new Error(`Incomplete art: ${selection.id}`);
  const socialTarget = `comics/${selection.slug}/og.png`;
  await transfer(path.join(root, selection.socialImage), socialTarget, byPath.get(selection.socialImage).sha256);
  for (const name of ["Bangers-Regular.ttf", "Fredoka.ttf", "SpaceMono-Regular.ttf"]) {
    if (selection.id !== "ST-SCRATCH-032") continue;
    const sourceRelative = `website/fonts/${name}`;
    await transfer(path.join(root, sourceRelative), `fonts/comic-shell/${name}`, byPath.get(sourceRelative).sha256);
  }
  const record = {
    internalId: selection.id, slug: selection.slug, title: episode.story.title,
    publicNumber: selection.number, publicVersion: episode.publicIdentity.displayVersion,
    label: `Comic ${String(selection.number).padStart(3, "0")} · Ahead AI`,
    websitePublishedAt: null, displayDate: episode.publicIdentity.displayVersion,
    previewOnly: true, readerLayout: selection.layout, caption: selection.caption, shell: "art-first",
    ogImage: { src: socialTarget, width: 1080, height: 1350, alt: art.at(-1).alt },
    art, panels: art.map((image, index) => ({
      lines: selection.dialogue?.[index] ?? [],
      description: selection.dialogue
        ? (index === 1 ? "Four playful, nonverbal doodle bursts emerge from Mina’s laptop." : "")
        : image.alt,
    })),
  };
  additions.push(record);
  ledger.inputs.push({ internalId: selection.id, sourceRoot: episode.production.artifactRoot, manifestSha256: selection.manifest, ownerReceipt: { path: receiptPath, sha256: selection.receipt }, sealedFilesVerified: entries.length });
}

const retained = catalog.episodes.filter(episode => !selections.some(selection => selection.id === episode.internalId));
const founder = retained.find(episode => episode.internalId === "ST-SCRATCH-015");
if (!founder) throw new Error("The Founder candidate is missing.");
delete founder.previewOnly;
founder.websitePublishedAt = "2026-09-08T16:08:44Z";
catalog.episodes = [...additions, ...retained].sort((a, b) => b.publicNumber - a.publicNumber);
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
await writeFile(path.join(project, "content/approved-slate-assets.json"), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(`Imported ${additions.length} approved episodes and ${ledger.assets.length} exact files; Founder remains published and the three additions remain previews.`);
