import { access, cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve("dist/client");
const configuredBasePath = process.env.PAGES_BASE_PATH ?? "";
const pathSegment = configuredBasePath.replace(/^\/+|\/+$/g, "");
const basePath = pathSegment ? `/${pathSegment}` : "";

if (pathSegment && !/^[a-zA-Z0-9._-]+$/.test(pathSegment)) {
  throw new Error(`Unsupported Pages base path: ${configuredBasePath}`);
}

if (pathSegment) {
  const nestedDirectory = path.join(outputDirectory, pathSegment);
  await access(nestedDirectory);

  for (const entry of await readdir(nestedDirectory)) {
    await cp(
      path.join(nestedDirectory, entry),
      path.join(outputDirectory, entry),
      { recursive: true, force: true },
    );
  }

  await rm(nestedDirectory, { recursive: true, force: true });
}

async function stageDirectoryIndex(sourceHtml, destinationDirectory) {
  await access(sourceHtml);
  await mkdir(destinationDirectory, { recursive: true });
  await cp(sourceHtml, path.join(destinationDirectory, "index.html"), {
    force: true,
  });
}

await Promise.all([
  stageDirectoryIndex(
    path.join(outputDirectory, "colophon.html"),
    path.join(outputDirectory, "colophon"),
  ),
  stageDirectoryIndex(
    path.join(outputDirectory, "privacy.html"),
    path.join(outputDirectory, "privacy"),
  ),
]);

const comicsDirectory = path.join(outputDirectory, "comics");
for (const entry of await readdir(comicsDirectory)) {
  if (!entry.endsWith(".html")) continue;
  const slug = entry.slice(0, -".html".length);
  await stageDirectoryIndex(
    path.join(comicsDirectory, entry),
    path.join(comicsDirectory, slug),
  );
}

const indexPath = path.join(outputDirectory, "index.html");
const indexHtml = await readFile(indexPath, "utf8");

if (basePath && !indexHtml.includes(`${basePath}/_next/`)) {
  throw new Error("The static HTML does not contain the configured Pages asset prefix.");
}

await access(path.join(outputDirectory, "_next"));
await access(path.join(outputDirectory, "og.png"));
await writeFile(path.join(outputDirectory, ".nojekyll"), "", "utf8");
