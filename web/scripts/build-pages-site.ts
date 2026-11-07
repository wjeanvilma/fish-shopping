/**
 * Finish 2.0 Phase 2 — stage legal pages + playable SPA for GitHub Pages.
 *
 * Usage:
 *   npm run pages:site
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = fileURLToPath(new URL(".", import.meta.url));
const webRoot = resolve(here, "..");
const publicDir = resolve(webRoot, "public");
const outDir = resolve(webRoot, "dist-legal");
const playOut = resolve(outDir, "play");
const catalogPath = resolve(webRoot, "../shared/ship/landing-play-cta.json");
const legalCatalogPath = resolve(webRoot, "../shared/store/legal-pages.json");
const listingPath = resolve(webRoot, "../shared/store/listing.json");

function main(): number {
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as {
    phase: number;
    viteBase: string;
    playPath: string;
    cta: { play: string; privacy: string; support: string };
  };
  const legal = JSON.parse(readFileSync(legalCatalogPath, "utf8")) as {
    urls: Record<string, string>;
  };
  const listing = JSON.parse(readFileSync(listingPath, "utf8")) as {
    webLanding: { ctaPlay: string; ctaPrivacy: string; ctaSupport: string; tagline: string; title: string };
  };

  if (catalog.phase !== 2) {
    console.error(`Expected landing-play-cta phase 2, got ${catalog.phase}`);
    return 1;
  }
  if (listing.webLanding.ctaPlay !== catalog.cta.play) {
    console.error(`listing ctaPlay ≠ catalog (${listing.webLanding.ctaPlay})`);
    return 1;
  }

  const landingHtml = readFileSync(resolve(publicDir, "landing.html"), "utf8");
  if (!landingHtml.includes(`>${catalog.cta.play}<`)) {
    console.error(`landing.html missing CTA label "${catalog.cta.play}"`);
    return 1;
  }
  if (!landingHtml.includes(`href="${catalog.playPath}"`) && !landingHtml.includes('href="play/"')) {
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
    env: { ...process.env, FISH_PAGES_BASE: catalog.viteBase },
    stdio: "inherit",
  });

  const dist = resolve(webRoot, "dist");
  if (!existsSync(resolve(dist, "index.html"))) {
    console.error("vite build did not produce dist/index.html");
    return 1;
  }
  mkdirSync(playOut, { recursive: true });
  cpSync(dist, playOut, { recursive: true });

  const playIndex = readFileSync(resolve(playOut, "index.html"), "utf8");
  if (!playIndex.includes("root") && !playIndex.includes("id=\"root\"")) {
    console.error("play/index.html missing app root");
    return 1;
  }

  console.log(`OK pages site staged → ${outDir}`);
  console.log(`  landing  ${legal.urls.landing}`);
  console.log(`  play     ${catalog.playPath} (base ${catalog.viteBase})`);
  console.log(`  support  ${legal.urls.support}`);
  console.log(`  privacy  ${legal.urls.privacy}`);
  return 0;
}

process.exit(main());
