/**
 * Finish 2.0 Phases 2–3 — stage legal pages + hardened playable SPA for GitHub Pages.
 *
 * Usage:
 *   npm run pages:site
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = fileURLToPath(new URL(".", import.meta.url));
const webRoot = resolve(here, "..");
const publicDir = resolve(webRoot, "public");
const outDir = resolve(webRoot, "dist-legal");
const playOut = resolve(outDir, "play");
const ctaCatalogPath = resolve(webRoot, "../shared/ship/landing-play-cta.json");
const spaCatalogPath = resolve(webRoot, "../shared/ship/spa-host.json");
const legalCatalogPath = resolve(webRoot, "../shared/store/legal-pages.json");
const listingPath = resolve(webRoot, "../shared/store/listing.json");

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = resolve(dir, name);
    if (statSync(abs).isDirectory()) out.push(...walkFiles(abs));
    else out.push(abs);
  }
  return out;
}

function main(): number {
  const cta = JSON.parse(readFileSync(ctaCatalogPath, "utf8")) as {
    phase: number;
    viteBase: string;
    playPath: string;
    cta: { play: string };
  };
  const spa = JSON.parse(readFileSync(spaCatalogPath, "utf8")) as {
    phase: number;
    viteBase: string;
    playPath: string;
    build: { fallback404: boolean; stripLegalHtmlFromPlay: boolean };
    spaChecks: {
      requiredPublishedFiles: string[];
      requiredAssetSuffixes: string[];
      requiredAudioDirs: string[];
    };
  };
  const legal = JSON.parse(readFileSync(legalCatalogPath, "utf8")) as {
    urls: Record<string, string>;
  };
  const listing = JSON.parse(readFileSync(listingPath, "utf8")) as {
    webLanding: { ctaPlay: string };
  };

  if (cta.phase !== 2) {
    console.error(`Expected landing-play-cta phase 2, got ${cta.phase}`);
    return 1;
  }
  if (spa.phase !== 3) {
    console.error(`Expected spa-host phase 3, got ${spa.phase}`);
    return 1;
  }
  if (cta.viteBase !== spa.viteBase) {
    console.error("landing-play-cta.viteBase ≠ spa-host.viteBase");
    return 1;
  }
  if (listing.webLanding.ctaPlay !== cta.cta.play) {
    console.error(`listing ctaPlay ≠ catalog (${listing.webLanding.ctaPlay})`);
    return 1;
  }

  const landingHtml = readFileSync(resolve(publicDir, "landing.html"), "utf8");
  if (!landingHtml.includes(`>${cta.cta.play}<`)) {
    console.error(`landing.html missing CTA label "${cta.cta.play}"`);
    return 1;
  }
  if (!landingHtml.includes('href="play/"')) {
    console.error("landing.html primary CTA must href play/");
    return 1;
  }
  if (landingHtml.includes("View project")) {
    console.error("landing.html must not use View project as primary CTA");
    return 1;
  }
  for (const name of ["privacy.html", "support.html", "landing.html"] as const) {
    const html = readFileSync(resolve(publicDir, name), "utf8");
    if (html.includes('href="/') || html.includes('src="/')) {
      console.error(`${name} still has root-absolute asset paths; use relative links for Pages`);
      return 1;
    }
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  for (const name of ["privacy.html", "support.html", "landing.html"] as const) {
    writeFileSync(resolve(outDir, name), readFileSync(resolve(publicDir, name), "utf8"));
  }
  writeFileSync(resolve(outDir, "index.html"), readFileSync(resolve(publicDir, "landing.html"), "utf8"));

  for (const asset of ["favicon.svg", "apple-touch-icon.png", "icon-512.png"]) {
    cpSync(resolve(publicDir, asset), resolve(outDir, asset));
  }
  writeFileSync(
    resolve(outDir, ".nojekyll"),
    "# Finish 2.0: publish legal + /play SPA without Jekyll processing.\n",
  );

  console.log("Building Vite SPA for Pages play/ …");
  execFileSync("npx", ["vite", "build"], {
    cwd: webRoot,
    env: { ...process.env, FISH_PAGES_BASE: spa.viteBase },
    stdio: "inherit",
  });

  const dist = resolve(webRoot, "dist");
  if (!existsSync(resolve(dist, "index.html"))) {
    console.error("vite build did not produce dist/index.html");
    return 1;
  }
  mkdirSync(playOut, { recursive: true });
  cpSync(dist, playOut, { recursive: true });

  // Phase 3: legal HTML at site root is authoritative — strip copies from /play/.
  if (spa.build.stripLegalHtmlFromPlay) {
    for (const name of ["landing.html", "privacy.html", "support.html"]) {
      const abs = resolve(playOut, name);
      if (existsSync(abs)) unlinkSync(abs);
    }
  }

  const playIndexPath = resolve(playOut, "index.html");
  const playIndex = readFileSync(playIndexPath, "utf8");
  if (!playIndex.includes("id=\"root\"") && !playIndex.includes("id='root'")) {
    console.error("play/index.html missing app root");
    return 1;
  }
  if (!playIndex.includes(spa.viteBase.replace(/\/$/, "") + "/assets/") && !playIndex.includes("/assets/")) {
    console.error("play/index.html missing assets references");
    return 1;
  }

  // Phase 3: SPA deep-link fallback for GitHub Pages.
  if (spa.build.fallback404) {
    writeFileSync(resolve(playOut, "404.html"), playIndex);
  }
  writeFileSync(
    resolve(playOut, ".nojekyll"),
    "# Finish 2.0 Phase 3: SPA under /play without Jekyll.\n",
  );

  const published = walkFiles(playOut).map((f) => f.slice(playOut.length + 1).replaceAll("\\", "/"));
  for (const req of spa.spaChecks.requiredPublishedFiles) {
    if (!published.includes(req)) {
      console.error(`play/ missing required file ${req}`);
      return 1;
    }
  }
  for (const suffix of spa.spaChecks.requiredAssetSuffixes) {
    if (!published.some((f) => f.startsWith("assets/") && f.endsWith(suffix))) {
      console.error(`play/assets missing *${suffix}`);
      return 1;
    }
  }
  for (const dir of spa.spaChecks.requiredAudioDirs) {
    if (!published.some((f) => f.startsWith(`${dir}/`) && f.endsWith(".wav"))) {
      console.error(`play/${dir} missing wav clips`);
      return 1;
    }
  }

  console.log(`OK pages site staged → ${outDir}`);
  console.log(`  landing  ${legal.urls.landing}`);
  console.log(`  play     ${spa.playPath} (base ${spa.viteBase}, spa-host phase ${spa.phase})`);
  console.log(`  support  ${legal.urls.support}`);
  console.log(`  privacy  ${legal.urls.privacy}`);
  return 0;
}

process.exit(main());
