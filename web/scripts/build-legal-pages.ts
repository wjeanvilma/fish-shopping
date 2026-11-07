/**
 * Phase 7 (post-1.0) — stage privacy / support / landing for GitHub Pages.
 *
 * Usage:
 *   npm run pages:legal
 *   npx vite-node scripts/build-legal-pages.ts
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const publicDir = resolve(here, "../public");
const outDir = resolve(here, "../dist-legal");
const catalogPath = resolve(here, "../../shared/store/legal-pages.json");

function main(): number {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
    phase: number;
    publishRoot: string;
    sources: Record<string, string>;
    urls: Record<string, string>;
  };
  if (catalog.phase !== 7) {
    console.error(`Expected legal-pages phase 7, got ${catalog.phase}`);
    return 1;
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const pages = ["privacy.html", "support.html", "landing.html"] as const;
  for (const name of pages) {
    const src = resolve(publicDir, name);
    const html = readFileSync(src, "utf8");
    if (html.includes('href="/') || html.includes('src="/')) {
      console.error(`${name} still has root-absolute asset paths; use relative links for Pages`);
      return 1;
    }
    writeFileSync(resolve(outDir, name), html);
  }
  // Project Pages serves / as index.html
  writeFileSync(resolve(outDir, "index.html"), readFileSync(resolve(publicDir, "landing.html"), "utf8"));

  for (const asset of ["favicon.svg", "apple-touch-icon.png", "icon-512.png"]) {
    copyFileSync(resolve(publicDir, asset), resolve(outDir, asset));
  }

  writeFileSync(
    resolve(outDir, ".nojekyll"),
    "# Phase 7: publish static legal pages without Jekyll processing.\n",
  );

  console.log(`OK legal pages staged → ${outDir}`);
  console.log(`  landing  ${catalog.urls.landing}`);
  console.log(`  support  ${catalog.urls.support}`);
  console.log(`  privacy  ${catalog.urls.privacy}`);
  return 0;
}

process.exit(main());
