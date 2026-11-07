/**
 * Finish 2.0 Phase 2 — landing Play-in-browser CTA readiness + live play URL.
 *
 * Usage:
 *   npm run landing:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LANDING_PLAY_CTA,
  LANDING_PLAY_CTA_PHASE,
  LANDING_PLAY_CTA_SCHEMA,
  PLAY_IN_BROWSER_LABEL,
  PLAY_URL,
} from "../src/store/landingPlayCta";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function validate(): Promise<string[]> {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/landing-play-cta.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const copy = readJson(resolve(root, "shared/store/listing-copy.json"));
  const landing = readFileSync(resolve(root, "web/public/landing.html"), "utf8");
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pagesWf = readFileSync(resolve(root, ".github/workflows/pages.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const vite = readFileSync(resolve(root, "web/vite.config.ts"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/LandingPlayCta.kt",
    ),
    "utf8",
  );

  if (catalog.phase !== 2) errors.push(`phase expected 2, got ${catalog.phase}`);
  if (catalog.schema !== LANDING_PLAY_CTA_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (LANDING_PLAY_CTA_PHASE !== 2) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 20) errors.push("schemaVersion must stay 20");

  if (listing.webLanding?.ctaPlay !== catalog.cta.play) {
    errors.push("listing.webLanding.ctaPlay ≠ catalog");
  }
  if (copy.webLanding?.ctaPlay !== catalog.cta.play) {
    errors.push("listing-copy.webLanding.ctaPlay ≠ catalog");
  }
  if (listing.landingPlayCtaPhase !== 2) errors.push("listing.landingPlayCtaPhase must be 2");
  if (listing.landingPlayCtaCatalog !== "shared/ship/landing-play-cta.json") {
    errors.push("listing.landingPlayCtaCatalog mismatch");
  }
  if (listing.playUrl !== catalog.playUrl) errors.push("listing.playUrl ≠ catalog.playUrl");

  if (!landing.includes(`>${PLAY_IN_BROWSER_LABEL}<`)) {
    errors.push(`landing.html missing "${PLAY_IN_BROWSER_LABEL}"`);
  }
  if (!landing.includes('href="play/"') && !landing.includes(`href="${catalog.playPath}"`)) {
    errors.push("landing.html CTA must link to play/");
  }
  if (landing.includes("View project")) errors.push("landing.html still has View project CTA");
  if (!landing.includes(`>${catalog.cta.privacy}<`)) errors.push("landing missing Privacy CTA");
  if (!landing.includes(`>${catalog.cta.support}<`)) errors.push("landing missing Support CTA");

  if (pkg.scripts?.["pages:site"] !== "vite-node scripts/build-pages-site.ts") {
    errors.push("package.json pages:site script missing");
  }
  if (!vite.includes("FISH_PAGES_BASE")) errors.push("vite.config missing FISH_PAGES_BASE");
  if (!pagesWf.includes("pages:site")) errors.push("pages.yml must run pages:site");
  if (!ci.includes("landing:validate")) errors.push("ci.yml missing landing:validate");
  if (!kotlin.includes("CTA_PLAY")) errors.push("Kotlin LandingPlayCta missing CTA_PLAY");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  // Live checks
  try {
    const landRes = await fetch(catalog.landingUrl, { redirect: "follow" });
    if (!landRes.ok) errors.push(`landingUrl HTTP ${landRes.status}`);
    else {
      const html = await landRes.text();
      if (!html.includes(PLAY_IN_BROWSER_LABEL)) {
        errors.push("live landing missing Play in browser CTA (redeploy Pages)");
      }
      if (html.includes("View project") && !html.includes(PLAY_IN_BROWSER_LABEL)) {
        errors.push("live landing still shows View project as primary");
      }
      if (!html.includes("play/")) errors.push("live landing missing play/ href");
    }
  } catch (e) {
    errors.push(`landing fetch failed: ${(e as Error).message}`);
  }

  try {
    const playRes = await fetch(PLAY_URL, { redirect: "follow" });
    if (!playRes.ok) errors.push(`playUrl HTTP ${playRes.status} (need pages:site deploy)`);
    else {
      const html = await playRes.text();
      if (!html.includes("root") && !html.includes('id="root"')) {
        errors.push("playUrl HTML missing app root");
      }
      if (!html.toLowerCase().includes("fish")) {
        errors.push("playUrl HTML missing Fish Shopping markers");
      }
    }
  } catch (e) {
    errors.push(`play fetch failed: ${(e as Error).message}`);
  }

  return errors;
}

const errors = await validate();
if (errors.length) {
  console.error("landing:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK landing:validate — Play in browser CTA + live play/ SPA");
