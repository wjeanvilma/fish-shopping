/**
 * Finish 2.0 Phase 23 — i18n scaffold readiness (en + es).
 *
 * Usage:
 *   npm run i18n:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  DEFAULT_LOCALE,
  I18N_SCAFFOLD,
  I18N_SCAFFOLD_MARKER,
  I18N_SCAFFOLD_PHASE,
  I18N_SCAFFOLD_SCHEMA,
  LOCALE_FILE_FLOOR,
  SECOND_LOCALE,
  SUPPORTED_LOCALES,
  UI_STRING_KEY_FLOOR,
} from "../src/ship/i18nScaffold";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";
import { t, uiStringKeyCount, UI_STRING_KEYS, setLocale } from "../src/i18n/strings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/i18n-scaffold.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-i18n-scaffold.json"));
  const index = readJson(resolve(root, "shared/i18n/ui-strings.json"));
  const enUi = readJson(resolve(root, "shared/i18n/ui-strings.en.json"));
  const esUi = readJson(resolve(root, "shared/i18n/ui-strings.es.json"));
  const listingCopy = readJson(resolve(root, "shared/store/listing-copy.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const settingsTs = readFileSync(resolve(root, "web/src/game/settingsStore.ts"), "utf8");
  const settingsKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/persistence/SettingsStore.kt"),
    "utf8",
  );
  const appTsx = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const gameScreen = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );

  if (catalog.phase !== 23) errors.push(`phase expected 23, got ${catalog.phase}`);
  if (catalog.schema !== I18N_SCAFFOLD_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (I18N_SCAFFOLD_PHASE !== 23) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.i18nMarker !== I18N_SCAFFOLD_MARKER) errors.push("marker mismatch");
  if (catalog.defaultLocale !== "en" || DEFAULT_LOCALE !== "en") errors.push("defaultLocale must be en");
  if (catalog.secondLocale !== "es" || SECOND_LOCALE !== "es") errors.push("secondLocale must be es");
  if (JSON.stringify(catalog.supportedLocales) !== JSON.stringify(["en", "es"])) {
    errors.push("supportedLocales must be [en, es]");
  }
  if (catalog.uiStringKeyMin !== 48 || UI_STRING_KEY_FLOOR !== 48) {
    errors.push("uiStringKeyMin must be 48");
  }
  if (catalog.localeFileMin !== 2 || LOCALE_FILE_FLOOR !== 2) {
    errors.push("localeFileMin must be 2");
  }

  const enKeys = Object.keys(enUi.strings ?? {});
  const esKeys = Object.keys(esUi.strings ?? {});
  if (enKeys.length < 48) errors.push(`en ui strings ${enKeys.length} < 48`);
  if (esKeys.length < 48) errors.push(`es ui strings ${esKeys.length} < 48`);
  if (enKeys.length !== esKeys.length) errors.push("en/es ui key count mismatch");
  for (const k of enKeys) {
    if (!esKeys.includes(k)) errors.push(`es missing ui key ${k}`);
  }
  for (const k of fixture.expect.requiredUiKeys as string[]) {
    if (!enKeys.includes(k)) errors.push(`en missing required key ${k}`);
  }
  if (UI_STRING_KEYS.length !== enKeys.length) {
    errors.push("runtime UI_STRING_KEYS drift vs en bundle");
  }
  if (uiStringKeyCount("en") < UI_STRING_KEY_FLOOR) errors.push("runtime en key count below floor");
  if (uiStringKeyCount("es") < UI_STRING_KEY_FLOOR) errors.push("runtime es key count below floor");

  setLocale("es");
  if (t("nav.pause") === "Pause") errors.push("es nav.pause should not be English Pause");
  setLocale("en");
  if (t("nav.pause") !== "Pause") errors.push("en nav.pause mismatch");

  for (const path of fixture.expect.listingLocaleFiles as string[]) {
    if (!existsSync(resolve(root, path))) errors.push(`missing listing locale ${path}`);
  }
  const enListing = readJson(resolve(root, "shared/store/locales/en.json"));
  const esListing = readJson(resolve(root, "shared/store/locales/es.json"));
  for (const key of fixture.expect.listingKeys as string[]) {
    if (enListing[key] == null) errors.push(`en listing missing ${key}`);
    if (esListing[key] == null) errors.push(`es listing missing ${key}`);
  }

  if (JSON.stringify(listingCopy.locales) !== JSON.stringify(["en", "es"])) {
    errors.push("listing-copy.locales must be [en, es]");
  }
  if (JSON.stringify(listing.locales) !== JSON.stringify(["en", "es"])) {
    errors.push("listing.locales must be [en, es]");
  }
  if (listing.i18nScaffoldPhase !== 23) errors.push("listing.i18nScaffoldPhase must be 23");
  if (listing.i18nScaffoldCatalog !== "shared/ship/i18n-scaffold.json") {
    errors.push("listing.i18nScaffoldCatalog mismatch");
  }
  if ((dod.quotas?.i18nLocales ?? 0) < 2) errors.push("DoD quotas.i18nLocales must be ≥ 2");
  if ((dod.quotas?.uiStringKeys ?? 0) < 48) errors.push("DoD quotas.uiStringKeys must be ≥ 48");
  if (!ci.includes("i18n:validate")) errors.push("ci.yml missing i18n:validate");
  if (!pin.fixtures?.includes("parity-i18n-scaffold.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-i18n-scaffold.json");
  }
  if (pin.i18nScaffold !== "shared/ship/i18n-scaffold.json") {
    errors.push("RELEASE_PIN.i18nScaffold path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");

  if (!settingsTs.includes("locale")) errors.push("web settingsStore missing locale");
  if (!settingsKt.includes("locale") || !settingsKt.includes("KEY_LOCALE")) {
    errors.push("Android SettingsStore missing locale");
  }
  if (!appTsx.includes('t("nav.pause")') || !appTsx.includes('t("settings.language")')) {
    errors.push("App.tsx must use t() for nav/settings language chrome");
  }
  if (!gameScreen.includes('UiStrings.t("nav.pause")') || !gameScreen.includes("onLocale")) {
    errors.push("GameScreen must use UiStrings for nav + language picker");
  }
  if (!existsSync(resolve(root, "app/src/main/res/values-es/strings.xml"))) {
    errors.push("missing values-es/strings.xml");
  }
  if (index.supportedLocales?.length !== 2) errors.push("ui-strings index must list 2 locales");
  if (SUPPORTED_LOCALES.length !== 2) errors.push("SUPPORTED_LOCALES floor");
  if (I18N_SCAFFOLD.listingKeyParity !== true) errors.push("listingKeyParity must be true");

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("i18n:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK i18n:validate — en + es UI + listing locale scaffold");
