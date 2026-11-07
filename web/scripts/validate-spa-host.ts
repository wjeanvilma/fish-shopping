/**
 * Finish 2.0 Phase 3 — SPA host on canonicalHost readiness + live asset checks.
 *
 * Usage:
 *   npm run spa:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SPA_HOST, SPA_HOST_PHASE, SPA_HOST_SCHEMA, SPA_PLAY_URL } from "../src/store/spaHost";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function validate(): Promise<string[]> {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/spa-host.json"));
  const cta = readJson(resolve(root, "shared/ship/landing-play-cta.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const publicShip = readJson(resolve(root, "shared/ship/public-ship.json"));
  const pagesWf = readFileSync(resolve(root, ".github/workflows/pages.yml"), "utf8");
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const buildScript = readFileSync(resolve(root, "web/scripts/build-pages-site.ts"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/SpaHost.kt"),
    "utf8",
  );

  if (catalog.phase !== 3) errors.push(`phase expected 3, got ${catalog.phase}`);
  if (catalog.schema !== SPA_HOST_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (SPA_HOST_PHASE !== 3) errors.push("SPA_HOST_PHASE mirror mismatch");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must stay 21");
  if (catalog.viteBase !== cta.viteBase) errors.push("spa viteBase ≠ landing-play-cta");
  if (catalog.playUrl !== cta.playUrl) errors.push("spa playUrl ≠ landing-play-cta");

  if (listing.spaHostPhase !== 3) errors.push("listing.spaHostPhase must be 3");
  if (listing.spaHostCatalog !== "shared/ship/spa-host.json") {
    errors.push("listing.spaHostCatalog mismatch");
  }
  if (listing.playUrl !== catalog.playUrl) errors.push("listing.playUrl ≠ spa playUrl");

  if (publicShip.web?.spaHostPhase !== 3) errors.push("public-ship.web.spaHostPhase must be 3");
  if (publicShip.web?.spaHostCatalog !== "shared/ship/spa-host.json") {
    errors.push("public-ship.web.spaHostCatalog mismatch");
  }
  if (publicShip.web?.playUrl !== catalog.playUrl) errors.push("public-ship.web.playUrl mismatch");

  if (!catalog.build.fallback404) errors.push("fallback404 must be true");
  if (!catalog.build.stripLegalHtmlFromPlay) errors.push("stripLegalHtmlFromPlay must be true");
  if (!buildScript.includes("404.html")) errors.push("build-pages-site missing 404.html");
  if (!buildScript.includes("stripLegalHtmlFromPlay")) {
    errors.push("build-pages-site missing stripLegalHtmlFromPlay");
  }
  if (!pagesWf.includes("pages:site")) errors.push("pages.yml missing pages:site");
  if (!ci.includes("spa:validate")) errors.push("ci.yml missing spa:validate");
  if (!kotlin.includes("FALLBACK_404")) errors.push("Kotlin SpaHost missing FALLBACK_404");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  // Live SPA index + assets
  let indexHtml = "";
  try {
    const res = await fetch(SPA_PLAY_URL, { redirect: "follow" });
    if (!res.ok) errors.push(`playUrl HTTP ${res.status}`);
    else {
      indexHtml = await res.text();
      for (const needle of SPA_HOST.spaChecks.indexMustInclude) {
        if (!indexHtml.includes(needle)) errors.push(`play index missing ${needle}`);
      }
      if (indexHtml.includes("<h1>Privacy Policy</h1>")) {
        errors.push("playUrl serving privacy page instead of SPA");
      }
    }
  } catch (e) {
    errors.push(`playUrl fetch failed: ${(e as Error).message}`);
  }

  const assetUrls = Array.from(
    indexHtml.matchAll(/(?:src|href)="(\/fish-shopping\/play\/assets\/[^"]+)"/g),
  ).map((m) => m[1]);
  const js = assetUrls.find((u) => u.endsWith(".js") && u.includes("/index-"));
  const css = assetUrls.find((u) => u.endsWith(".css"));
  for (const rel of [js, css].filter(Boolean) as string[]) {
    try {
      const res = await fetch(`https://wjeanvilma.github.io${rel}`, { redirect: "follow" });
      if (!res.ok) errors.push(`asset ${rel} → HTTP ${res.status}`);
    } catch (e) {
      errors.push(`asset ${rel} fetch failed: ${(e as Error).message}`);
    }
  }

  try {
    const fb = await fetch(`${SPA_PLAY_URL}404.html`, { redirect: "follow" });
    if (!fb.ok) errors.push(`play/404.html HTTP ${fb.status}`);
    else {
      const html = await fb.text();
      if (!html.includes('id="root"')) errors.push("play/404.html missing app root");
    }
  } catch (e) {
    errors.push(`404.html fetch failed: ${(e as Error).message}`);
  }

  // Legal paths remain stable (not SPA shell)
  for (const legal of SPA_HOST.legalPathsStable) {
    try {
      const res = await fetch(legal.url, { redirect: "follow" });
      if (!res.ok) errors.push(`${legal.path} HTTP ${res.status}`);
      else {
        const html = await htmlText(res);
        if (!html.includes(legal.mustInclude)) {
          errors.push(`${legal.path} missing "${legal.mustInclude}"`);
        }
        if (legal.path !== "/" && html.includes('id="root"') && html.includes("/assets/index-")) {
          errors.push(`${legal.path} looks like SPA shell (legal path unstable)`);
        }
      }
    } catch (e) {
      errors.push(`${legal.path} fetch failed: ${(e as Error).message}`);
    }
  }

  return errors;
}

async function htmlText(res: Response): Promise<string> {
  return res.text();
}

const errors = await validate();
if (errors.length) {
  console.error("spa:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK spa:validate — /play SPA hosted; legal paths stable on canonicalHost");
