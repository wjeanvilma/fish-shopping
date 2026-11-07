/**
 * Phase 30 — Definition of Done closeout (post-1.0 archived + Finish 2.0 freeze).
 *
 * Usage:
 *   npm run dod:validate
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFINITION_OF_DONE,
  DOD_COMPLETE_TAG,
  DOD_PHASE,
  DOD_SCHEMA,
  dodPhaseGateCatalogs,
  dodRequiredChecks,
  isCloseoutReady,
  isFinish2FreezeReady,
} from "../src/engine/definitionOfDone";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const legal = readJson(resolve(root, "shared/store/legal-pages.json"));
  const playBilling = readJson(resolve(root, "shared/billing/play-billing.json"));
  const webBilling = readJson(resolve(root, "shared/billing/web-billing.json"));
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));
  const closed = readJson(resolve(root, "shared/android/closed-testing.json"));
  const sfx = readJson(resolve(root, "shared/audio/sfx-pack.json"));
  const music = readJson(resolve(root, "shared/audio/music-pack.json"));
  const shots = readJson(resolve(root, "shared/store/screenshots/captures/manifest.json"));
  const hotfix = readJson(resolve(root, "shared/ship/hotfix-lane.json"));
  const publicShip = readJson(resolve(root, "shared/ship/public-ship.json"));
  const web = readFileSync(resolve(root, "web/src/engine/definitionOfDone.ts"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/DefinitionOfDone.kt",
    ),
    "utf8",
  );
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (dod.phase !== 30) errors.push(`phase expected 30, got ${dod.phase}`);
  if (dod.schema !== DOD_SCHEMA) errors.push("bad schema");
  if (dod.completeTag !== "v1.0-complete") errors.push("completeTag must stay v1.0-complete");
  if (dod.releaseTag !== pin.releaseTag) errors.push("releaseTag ≠ RELEASE_PIN");
  if (dod.contentVersion !== pin.contentVersion) errors.push("contentVersion ≠ RELEASE_PIN");
  if (dod.schemaVersion !== 23) errors.push("schemaVersion must be 23");
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN schemaVersion must be 23");
  if (pin.contentVersion !== "2.0.0") errors.push("RELEASE_PIN contentVersion must be 2.0.0");
  if (pin.releaseTag !== "v2.0.0") errors.push("RELEASE_PIN releaseTag must be v2.0.0");
  if (pin.definitionOfDone !== "shared/ship/definition-of-done.json") {
    errors.push("RELEASE_PIN.definitionOfDone path");
  }
  if (pin.completeTag !== "v1.0-complete") errors.push("RELEASE_PIN.completeTag must stay v1.0-complete");

  if (listing.dodCloseoutPhase !== 30) errors.push("listing.dodCloseoutPhase must be 30");
  if (listing.dodCloseoutCatalog !== "shared/ship/definition-of-done.json") {
    errors.push("listing.dodCloseoutCatalog mismatch");
  }
  if (listing.completeTag !== "v1.0-complete") errors.push("listing.completeTag must stay v1.0-complete");

  const closeout = dod.closeout;
  if (!closeout) {
    errors.push("missing closeout block");
    return errors;
  }
  if (!isCloseoutReady(closeout.status)) errors.push(`closeout.status not ready: ${closeout.status}`);
  if (closeout.completeTag !== DOD_COMPLETE_TAG) errors.push("closeout.completeTag mismatch");
  if (closeout.planPhases !== 30) errors.push("closeout.planPhases must be 30");
  if ((closeout.checklist as string[]).length < 8) errors.push("closeout.checklist too short");
  if ((closeout.phaseGates as any[]).length !== 29) {
    errors.push(`phaseGates expected 29, got ${(closeout.phaseGates as any[]).length}`);
  }

  const freeze = dod.finish2Freeze;
  if (!freeze) errors.push("missing finish2Freeze block");
  else {
    if (!isFinish2FreezeReady(freeze.status)) {
      errors.push(`finish2Freeze.status not ready: ${freeze.status}`);
    }
    if (freeze.releaseTag !== "v2.0.0") errors.push("finish2Freeze.releaseTag must be v2.0.0");
    if (freeze.contentVersion !== "2.0.0") errors.push("finish2Freeze.contentVersion must be 2.0.0");
    if (freeze.schemaVersion !== 23) errors.push("finish2Freeze.schemaVersion must be 23");
    if (freeze.catalog !== "shared/ship/freeze-2.0.0.json") errors.push("finish2Freeze.catalog mismatch");
    if (freeze.versionCode !== 3) errors.push("finish2Freeze.versionCode must be 3");
    if (!existsSync(resolve(root, freeze.catalog))) errors.push("missing freeze-2.0.0 catalog");
  }

  for (const check of dodRequiredChecks()) {
    if (!(dod.checks as string[]).includes(check)) errors.push(`checks missing ${check}`);
  }

  for (const gate of closeout.phaseGates as { phase: number; catalog: string }[]) {
    if (!existsSync(resolve(root, gate.catalog))) {
      errors.push(`missing phase ${gate.phase} catalog ${gate.catalog}`);
    }
  }
  for (const catalog of dodPhaseGateCatalogs()) {
    if (!DEFINITION_OF_DONE.closeout.phaseGates.some((g) => g.catalog === catalog)) {
      errors.push(`web mirror missing gate ${catalog}`);
    }
  }

  if (playBilling.releaseBackend !== "play") errors.push("play-billing releaseBackend must be play");
  if (webBilling.productionBackend !== "web") errors.push("web-billing productionBackend must be web");
  if (!entitlements.fullUnlock?.sku) errors.push("entitlements.fullUnlock.sku required");
  if (!Array.isArray(entitlements.cosmetics) || entitlements.cosmetics.length < 12) {
    errors.push("entitlements.cosmetics need ≥12 for Finish 2.0 freeze");
  }

  if ((shots.files as string[]).length < 14) errors.push("screenshot captures need ≥14 PNGs");
  for (const rel of shots.files as string[]) {
    if (!existsSync(resolve(root, rel))) errors.push(`missing screenshot ${rel}`);
  }

  const sfxDir = resolve(root, sfx.sourceDir ?? "shared/audio/sfx");
  if (!existsSync(sfxDir)) errors.push("sfx sourceDir missing");
  else {
    const wavs = readdirSync(sfxDir).filter((f) => f.endsWith(".wav"));
    if (wavs.length < 6) errors.push(`authored SFX wavs expected ≥6, got ${wavs.length}`);
  }
  const musicSource = music.sourceDir ?? music.bedsDir ?? "shared/audio/music";
  const musicDir = resolve(root, musicSource);
  if (!existsSync(musicDir)) {
    const bedFiles = (music.beds as any[] | undefined)?.map((b) => b.file || b.path).filter(Boolean) ?? [];
    if (bedFiles.length === 0) {
      const clips = (music.clips as any[] | undefined) ?? [];
      if (clips.length === 0 && !existsSync(resolve(root, "shared/audio/music"))) {
        errors.push("authored music beds missing");
      }
    } else {
      for (const rel of bedFiles) {
        if (!existsSync(resolve(root, rel))) errors.push(`missing music bed ${rel}`);
      }
    }
  } else {
    const beds = readdirSync(musicDir).filter((f) => f.endsWith(".wav") || f.endsWith(".ogg") || f.endsWith(".mp3"));
    if (beds.length < 1) errors.push("authored music beds directory empty");
  }

  if (closed.signoff?.productionPromotion !== "Phase 18") {
    errors.push("closed-testing must promote to Phase 18");
  }
  if (!closed.signoff?.statusValues?.includes("signed_off")) {
    errors.push("closed-testing missing signed_off status");
  }
  if (publicShip.prerequisite?.closedTestingPhase !== 17) {
    errors.push("public-ship must require closed testing phase 17");
  }

  if (hotfix.phase !== 29) errors.push("hotfix-lane phase must be 29");
  if (hotfix.schemaVersion !== 20) errors.push("hotfix-lane schemaVersion must stay 20");

  const urls = [
    listing.privacyPolicyUrl,
    listing.supportUrl,
    listing.landingUrl ?? legal.urls?.landing,
  ].filter(Boolean) as string[];
  for (const u of urls) {
    if (!u.startsWith("https://")) errors.push(`legal URL must be https: ${u}`);
  }
  if (listing.privacyPolicyUrl !== legal.urls?.privacy) {
    errors.push("listing.privacyPolicyUrl ≠ legal-pages.urls.privacy");
  }
  if (listing.supportUrl !== legal.urls?.support) {
    errors.push("listing.supportUrl ≠ legal-pages.urls.support");
  }
  for (const rel of [
    legal.sources?.privacy ?? "web/public/privacy.html",
    legal.sources?.support ?? "web/public/support.html",
    legal.sources?.landing ?? "web/public/landing.html",
    legal.github?.workflow ?? ".github/workflows/pages.yml",
    "shared/ship/pages-legal-live.json",
  ]) {
    if (!existsSync(resolve(root, rel))) errors.push(`missing legal page/pipeline ${rel}`);
  }
  if (legal.github?.npmScript !== "pages:legal") {
    errors.push("legal-pages npmScript must be pages:legal");
  }
  if (!existsSync(resolve(root, "web/scripts/build-legal-pages.ts"))) {
    errors.push("missing web/scripts/build-legal-pages.ts");
  }
  const operatorGates = closeout.operatorGates as { id: string; status?: string }[] | undefined;
  const legalGate = operatorGates?.find((g) => g.id === "legal_urls_http_200");
  if (!legalGate) {
    errors.push("closeout.operatorGates missing legal_urls_http_200");
  } else if (legalGate.status !== "verified") {
    errors.push("legal_urls_http_200 must be verified (Finish 2.0 Phase 1)");
  }
  if (legal.liveVerified?.status !== "verified") {
    errors.push("legal-pages.liveVerified.status must be verified");
  }

  if (DOD_PHASE !== 30) errors.push("DOD_PHASE mirror mismatch");
  if (!web.includes("DOD_COMPLETE_TAG")) errors.push("web definitionOfDone missing DOD_COMPLETE_TAG");
  if (!web.includes("isFinish2FreezeReady")) errors.push("web definitionOfDone missing isFinish2FreezeReady");
  if (!kotlin.includes("COMPLETE_TAG")) errors.push("Kotlin DefinitionOfDone missing COMPLETE_TAG");
  if (!kotlin.includes("PHASE_GATE_CATALOGS")) errors.push("Kotlin missing PHASE_GATE_CATALOGS");
  if (!kotlin.includes("isFinish2FreezeReady")) errors.push("Kotlin missing isFinish2FreezeReady");

  if (!ci.includes("dod:validate")) errors.push("ci.yml missing dod:validate");
  if (!ci.includes("Definition of Done 100%")) {
    errors.push("ci.yml missing Definition of Done 100% closeout step");
  }
  if (!ci.includes("freeze2:validate")) errors.push("ci.yml missing freeze2:validate");

  for (const rel of Object.values(closeout.evidence as Record<string, string>)) {
    if (!existsSync(resolve(root, rel))) errors.push(`missing evidence ${rel}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("dod:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK dod:validate — post-1.0 closeout archived + Finish 2.0 freeze ready (tag v2.0.0 manual)");
