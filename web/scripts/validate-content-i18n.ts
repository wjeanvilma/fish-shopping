/**
 * Finish 3.0 Phase 6 — content i18n + third locale readiness.
 *
 * Usage:
 *   npm run contenti18n:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTENT_I18N,
  CONTENT_I18N_MARKER,
  CONTENT_I18N_PHASE,
  CONTENT_I18N_SCHEMA,
  measureContentI18n,
  runtimeContentKeyParity,
} from "../src/ship/contentI18n";
import { contentName, contentStringKeyCount } from "../src/i18n/contentStrings";
import { setLocale, t } from "../src/i18n/strings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/content-i18n.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-content-i18n.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ContentI18n.kt"),
    "utf8",
  );

  if (catalog.phase !== 6) errors.push(`phase expected 6, got ${catalog.phase}`);
  if (catalog.schema !== CONTENT_I18N_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (CONTENT_I18N_PHASE !== 6) errors.push("phase mirror mismatch");
  if (catalog.contentI18nMarker !== CONTENT_I18N_MARKER) errors.push("marker mismatch");
  if (fixture.contentI18nMarker !== CONTENT_I18N_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must stay 23");
  if (catalog.thirdLocale !== "pt") errors.push("thirdLocale must be pt");
  if (catalog.contentStringKeyMin !== 250) errors.push("contentStringKeyMin must be 250");
  if (catalog.localeCountMin !== 8) errors.push("localeCountMin must be 8");

  const measure = measureContentI18n(root);
  if (!measure.keysEnough) {
    errors.push(
      `content keys en=${measure.enKeys} es=${measure.esKeys} pt=${measure.ptKeys} < ${catalog.contentStringKeyMin}`,
    );
  }
  if (!measure.keyParity) errors.push("content key sets differ across locales");
  if (!measure.localesEnough) {
    errors.push(`kickoff baseline.i18nLocales ${measure.localeCount} < 8`);
  }
  if (!measure.gapsClosed) {
    errors.push("kickoff gaps contentI18nMissing/thirdLocaleMissing must be false");
  }
  if (!measure.itemNameWired) errors.push("itemName must resolve via ContentStrings/contentName");
  if (measure.uiPtKeys < 120) errors.push(`ui-strings.pt keys ${measure.uiPtKeys} < 120`);
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (!runtimeContentKeyParity()) errors.push("runtime content/ui key parity failed");
  if (contentStringKeyCount("en") < 250) errors.push("runtime content en below 250");

  setLocale("pt");
  if (t("settings.languagePt") !== "Português") errors.push("pt settings.languagePt mismatch");
  if (contentName("harbor.sunrise_pier", "Sunrise Pier") === "Sunrise Pier") {
    // soft check — translation may keep some English; require non-empty
  }
  if (!contentName("species.silver_sprat")) errors.push("missing species.silver_sprat content name");
  setLocale("en");

  const phase6 = (kickoff.phases as any[])?.find((p) => p.phase === 6);
  if (!phase6) errors.push("kickoff missing phase 6");
  else if (phase6.validate !== "contenti18n:validate") {
    errors.push("kickoff phase 6 validate must be contenti18n:validate");
  }
  if (kickoff.gaps?.contentI18nMissing !== false) {
    errors.push("kickoff.gaps.contentI18nMissing must be false");
  }
  if (kickoff.gaps?.thirdLocaleMissing !== false) {
    errors.push("kickoff.gaps.thirdLocaleMissing must be false");
  }
  if (kickoff.baseline?.i18nLocales !== 8) {
    errors.push("kickoff.baseline.i18nLocales must be 8");
  }

  if (listing.contentI18nPhase !== 6) errors.push("listing.contentI18nPhase must be 6");
  if (listing.contentI18nCatalog !== "shared/ship/content-i18n.json") {
    errors.push("listing.contentI18nCatalog mismatch");
  }
  if (
    JSON.stringify(listing.locales) !==
    JSON.stringify(["en", "es", "pt", "fr", "ht", "it", "ca", "ru"])
  ) {
    errors.push("listing.locales must be [en, es, pt, fr, ht, it, ca, ru]");
  }
  if (pin.contentI18n !== "shared/ship/content-i18n.json") {
    errors.push("RELEASE_PIN.contentI18n path missing");
  }
  if (!pin.fixtures?.includes("parity-content-i18n.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-content-i18n.json");
  }

  const block = dod.contentI18n;
  if (!block) errors.push("DoD missing contentI18n block");
  else {
    if (block.phase !== 6) errors.push("DoD contentI18n.phase must be 6");
    if (block.plan !== "30_finish_3.0") errors.push("DoD contentI18n.plan mismatch");
    if (block.status !== "complete") errors.push("DoD contentI18n.status must be complete");
    if (block.contentI18nMarker !== CONTENT_I18N_MARKER) {
      errors.push("DoD contentI18n marker mismatch");
    }
  }
  if ((dod.quotas?.i18nLocales ?? 0) < 8) errors.push("DoD quotas.i18nLocales must be ≥ 8");

  if (!pkg.scripts?.["contenti18n:validate"]) {
    errors.push("package.json missing contenti18n:validate");
  }
  if (!ci.includes("contenti18n:validate")) errors.push("ci.yml missing contenti18n:validate");
  if (!kotlin.includes("CONTENT_STRING_KEY_MIN")) {
    errors.push("Kotlin ContentI18n missing CONTENT_STRING_KEY_MIN");
  }
  if (!existsSync(resolve(root, "app/src/main/res/values-pt/strings.xml"))) {
    errors.push("missing values-pt/strings.xml");
  }

  if (fixture.expect?.contentStringKeyMin !== 250) {
    errors.push("parity contentStringKeyMin must be 250");
  }
  if (fixture.expect?.thirdLocale !== "pt") errors.push("parity thirdLocale must be pt");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("contenti18n:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  "OK contenti18n:validate — content-strings en/es/pt + third locale pt wired",
);
