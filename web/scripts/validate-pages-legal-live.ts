/**
 * Finish 2.0 Phase 1 — GitHub Pages legal/landing HTTP 200 gate.
 *
 * Usage:
 *   npm run pages:live
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PAGES_LEGAL_LIVE,
  PAGES_LEGAL_LIVE_PHASE,
  PAGES_LEGAL_LIVE_SCHEMA,
  pagesLegalLiveUrls,
} from "../src/store/pagesLegalLive";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function statusOf(url: string): Promise<number> {
  const res = await fetch(url, { method: "GET", redirect: "follow" });
  return res.status;
}

async function validate(): Promise<string[]> {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/pages-legal-live.json"));
  const legal = readJson(resolve(root, "shared/store/legal-pages.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pagesWf = readFileSync(resolve(root, ".github/workflows/pages.yml"), "utf8");
  const web = readFileSync(resolve(root, "web/src/store/pagesLegalLive.ts"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/PagesLegalLive.kt",
    ),
    "utf8",
  );

  if (catalog.phase !== 1) errors.push(`phase expected 1, got ${catalog.phase}`);
  if (catalog.schema !== PAGES_LEGAL_LIVE_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must stay 21");
  if (PAGES_LEGAL_LIVE_PHASE !== 1) errors.push("PAGES_LEGAL_LIVE_PHASE mirror mismatch");

  if (catalog.canonicalHost !== legal.canonicalHost) {
    errors.push("canonicalHost ≠ legal-pages");
  }
  if (catalog.urls.landing !== legal.urls.landing) errors.push("landing URL ≠ legal-pages");
  if (catalog.urls.support !== legal.urls.support) errors.push("support URL ≠ legal-pages");
  if (catalog.urls.privacy !== legal.urls.privacy) errors.push("privacy URL ≠ legal-pages");
  if (listing.supportUrl !== catalog.urls.support) errors.push("listing.supportUrl mismatch");
  if (listing.privacyPolicyUrl !== catalog.urls.privacy) {
    errors.push("listing.privacyPolicyUrl mismatch");
  }
  if (listing.pagesLegalLivePhase !== 1) errors.push("listing.pagesLegalLivePhase must be 1");
  if (listing.pagesLegalLiveCatalog !== "shared/ship/pages-legal-live.json") {
    errors.push("listing.pagesLegalLiveCatalog mismatch");
  }

  if (catalog.pages.buildType !== "workflow") errors.push("pages.buildType must be workflow");
  if (catalog.pages.requirePublicRepo !== true) errors.push("requirePublicRepo must be true");
  if (!pagesWf.includes("deploy-pages")) errors.push("pages.yml missing deploy-pages");
  if (!pagesWf.includes("pages:site") && !pagesWf.includes("pages:legal")) {
    errors.push("pages.yml missing pages:site (or pages:legal)");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  const gate = (dod.closeout?.operatorGates as any[] | undefined)?.find(
    (g) => g.id === "legal_urls_http_200",
  );
  if (!gate) errors.push("DoD missing operatorGate legal_urls_http_200");
  else if (gate.status !== "verified") {
    errors.push("DoD legal_urls_http_200 status must be verified");
  }

  if (!web.includes("pagesLegalLiveUrls")) errors.push("web pagesLegalLive missing helper");
  if (!kotlin.includes("LIVE_URLS")) errors.push("Kotlin PagesLegalLive missing LIVE_URLS");
  if (!ci.includes("pages:live")) errors.push("ci.yml missing pages:live");

  const expect = catalog.liveCheck?.expectStatus ?? 200;
  for (const url of pagesLegalLiveUrls()) {
    try {
      const status = await statusOf(url);
      if (status !== expect) errors.push(`${url} → HTTP ${status}, expected ${expect}`);
    } catch (e) {
      errors.push(`${url} fetch failed: ${(e as Error).message}`);
    }
  }

  // Spot-check body contains expected page markers
  try {
    const privacy = await (await fetch(catalog.urls.privacy)).text();
    if (!privacy.toLowerCase().includes("privacy")) {
      errors.push("privacy.html body missing privacy marker");
    }
    const support = await (await fetch(catalog.urls.support)).text();
    if (!support.toLowerCase().includes("support")) {
      errors.push("support.html body missing support marker");
    }
  } catch (e) {
    errors.push(`body check failed: ${(e as Error).message}`);
  }

  return errors;
}

const errors = await validate();
if (errors.length) {
  console.error("pages:live FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK pages:live — legal/landing HTTP 200 on canonicalHost");
