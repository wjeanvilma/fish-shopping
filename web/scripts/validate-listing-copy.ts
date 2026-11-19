/**
 * Phase 11 (post-1.0) — validate frozen listing copy vs listing + en locale + Play limits.
 *
 * Usage:
 *   npm run listing-copy:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/store/listing-copy.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const en = readJson(resolve(root, "shared/store/locales/en.json"));
  const strings = readFileSync(resolve(root, "app/src/main/res/values/strings.xml"), "utf8");

  if (catalog.phase !== 11) errors.push(`phase expected 11, got ${catalog.phase}`);
  if (catalog.schema !== "fish.store.listing_copy.v1") errors.push("bad schema");
  if (!catalog.frozen) errors.push("catalog must be frozen");
  if (listing.listingCopyPhase !== 11) errors.push("listing.listingCopyPhase must be 11");
  if (listing.listingCopyCatalog !== "shared/store/listing-copy.json") {
    errors.push("listing.listingCopyCatalog mismatch");
  }
  if (listing.listingCopyFrozen !== true) errors.push("listing.listingCopyFrozen must be true");

  const lim = catalog.playLimits;
  const copy = catalog.copy;
  const checks: [string, string, number][] = [
    ["title", copy.title, lim.titleMax],
    ["shortDescription", copy.shortDescription, lim.shortDescriptionMax],
    ["fullDescription", copy.fullDescription, lim.fullDescriptionMax],
    ["whatsNew", copy.whatsNew, lim.whatsNewMax],
  ];
  for (const [name, value, max] of checks) {
    if (!value || typeof value !== "string") errors.push(`${name} empty`);
    else if (value.length > max) errors.push(`${name} length ${value.length} > ${max}`);
  }

  if (copy.title !== listing.appName) errors.push("title ≠ listing.appName");
  if (copy.shortDescription !== listing.shortDescription) {
    errors.push("shortDescription ≠ listing.shortDescription");
  }
  if (copy.fullDescription !== listing.fullDescription) {
    errors.push("fullDescription ≠ listing.fullDescription");
  }
  if (copy.shortDescription !== listing.playListing.shortDescription) {
    errors.push("shortDescription ≠ playListing.shortDescription");
  }
  if (copy.fullDescription !== listing.playListing.fullDescription) {
    errors.push("fullDescription ≠ playListing.fullDescription");
  }
  if (listing.whatsNew !== copy.whatsNew) errors.push("listing.whatsNew ≠ copy.whatsNew");
  if (listing.whatsNewVersion !== copy.whatsNewVersion) {
    errors.push("listing.whatsNewVersion ≠ copy.whatsNewVersion");
  }
  if (copy.whatsNewVersion !== pin.versionName) {
    errors.push(`whatsNewVersion ${copy.whatsNewVersion} ≠ RELEASE_PIN.versionName ${pin.versionName}`);
  }

  const landing = catalog.webLanding;
  for (const key of Object.keys(landing)) {
    if (landing[key] !== listing.webLanding[key]) {
      errors.push(`webLanding.${key} mismatch vs listing`);
    }
  }

  if (JSON.stringify(catalog.keywords) !== JSON.stringify(listing.keywords)) {
    errors.push("keywords mismatch vs listing");
  }
  if (catalog.category !== listing.category) errors.push("category mismatch");
  if (catalog.contentRating !== listing.contentRating) errors.push("contentRating mismatch");

  const expectedLocales = ["en", "es", "pt", "fr", "ht", "it", "ca", "ru"];
  if (JSON.stringify(catalog.locales) !== JSON.stringify(expectedLocales)) {
    errors.push("locales must be [en, es, pt, fr, ht, it, ca, ru]");
  }
  if (en.locale !== "en" || !en.frozen) errors.push("en locale must be frozen");
  if (en.title !== copy.title) errors.push("en.title mismatch");
  if (en.shortDescription !== copy.shortDescription) errors.push("en.shortDescription mismatch");
  if (en.fullDescription !== copy.fullDescription) errors.push("en.fullDescription mismatch");
  if (en.whatsNew !== copy.whatsNew) errors.push("en.whatsNew mismatch");
  if (en.webLanding.tagline !== landing.tagline) errors.push("en.webLanding.tagline mismatch");

  const esPath = resolve(root, "shared/store/locales/es.json");
  if (!existsSync(esPath)) {
    errors.push("missing shared/store/locales/es.json");
  } else {
    const es = readJson(esPath);
    if (es.locale !== "es" || !es.frozen) errors.push("es locale must be frozen");
    for (const key of ["title", "shortDescription", "fullDescription", "whatsNew", "webLanding"]) {
      if (es[key] == null) errors.push(`es missing listing key ${key}`);
    }
    if (!es.webLanding?.ctaPlay) errors.push("es.webLanding.ctaPlay missing");
    if (es.shortDescription.length > lim.shortDescriptionMax) {
      errors.push(`es.shortDescription length ${es.shortDescription.length} > ${lim.shortDescriptionMax}`);
    }
    if (es.fullDescription.length > lim.fullDescriptionMax) {
      errors.push(`es.fullDescription length ${es.fullDescription.length} > ${lim.fullDescriptionMax}`);
    }
    if (es.whatsNew.length > lim.whatsNewMax) {
      errors.push(`es.whatsNew length ${es.whatsNew.length} > ${lim.whatsNewMax}`);
    }
  }

  if (!strings.includes(`>${copy.title}<`) && !strings.includes(`>${copy.title}</string>`)) {
    // app_name
    if (!strings.includes(copy.title)) errors.push("strings.xml missing app title");
  }
  if (!strings.includes("store_short_description")) {
    errors.push("strings.xml missing store_short_description");
  }
  if (!strings.includes(copy.shortDescription)) {
    errors.push("strings.xml short description text mismatch");
  }
  if (!strings.includes("store_whats_new")) errors.push("strings.xml missing store_whats_new");
  if (!existsSync(resolve(root, catalog.androidStrings))) {
    errors.push(`missing ${catalog.androidStrings}`);
  }
  const esStringsPath = catalog.androidStringsEs ?? "app/src/main/res/values-es/strings.xml";
  if (!existsSync(resolve(root, esStringsPath))) {
    errors.push(`missing ${esStringsPath}`);
  }

  const ptPath = resolve(root, "shared/store/locales/pt.json");
  if (!existsSync(ptPath)) {
    errors.push("missing shared/store/locales/pt.json");
  } else {
    const pt = readJson(ptPath);
    if (pt.locale !== "pt" || !pt.frozen) errors.push("pt locale must be frozen");
    for (const key of ["title", "shortDescription", "fullDescription", "whatsNew", "webLanding"]) {
      if (pt[key] == null) errors.push(`pt missing listing key ${key}`);
    }
    if (!pt.webLanding?.ctaPlay) errors.push("pt.webLanding.ctaPlay missing");
    if (pt.shortDescription.length > lim.shortDescriptionMax) {
      errors.push(`pt.shortDescription length ${pt.shortDescription.length} > ${lim.shortDescriptionMax}`);
    }
    if (pt.fullDescription.length > lim.fullDescriptionMax) {
      errors.push(`pt.fullDescription length ${pt.fullDescription.length} > ${lim.fullDescriptionMax}`);
    }
    if (pt.whatsNew.length > lim.whatsNewMax) {
      errors.push(`pt.whatsNew length ${pt.whatsNew.length} > ${lim.whatsNewMax}`);
    }
  }
  const ptStringsPath = catalog.androidStringsPt ?? "app/src/main/res/values-pt/strings.xml";
  if (!existsSync(resolve(root, ptStringsPath))) {
    errors.push(`missing ${ptStringsPath}`);
  }

  for (const loc of ["fr", "ht", "it", "ca", "ru"] as const) {
    const locPath = resolve(root, `shared/store/locales/${loc}.json`);
    if (!existsSync(locPath)) {
      errors.push(`missing shared/store/locales/${loc}.json`);
      continue;
    }
    const localeJson = readJson(locPath);
    if (localeJson.locale !== loc || !localeJson.frozen) {
      errors.push(`${loc} locale must be frozen`);
    }
    for (const key of ["title", "shortDescription", "fullDescription", "whatsNew", "webLanding"]) {
      if (localeJson[key] == null) errors.push(`${loc} missing listing key ${key}`);
    }
    if (!localeJson.webLanding?.ctaPlay) errors.push(`${loc}.webLanding.ctaPlay missing`);
    if (localeJson.shortDescription.length > lim.shortDescriptionMax) {
      errors.push(
        `${loc}.shortDescription length ${localeJson.shortDescription.length} > ${lim.shortDescriptionMax}`,
      );
    }
    if (localeJson.fullDescription.length > lim.fullDescriptionMax) {
      errors.push(
        `${loc}.fullDescription length ${localeJson.fullDescription.length} > ${lim.fullDescriptionMax}`,
      );
    }
    if (localeJson.whatsNew.length > lim.whatsNewMax) {
      errors.push(`${loc}.whatsNew length ${localeJson.whatsNew.length} > ${lim.whatsNewMax}`);
    }
    const androidKey =
      loc === "fr"
        ? "androidStringsFr"
        : loc === "ht"
          ? "androidStringsHt"
          : loc === "it"
            ? "androidStringsIt"
            : loc === "ca"
              ? "androidStringsCa"
              : "androidStringsRu";
    const androidPath =
      catalog[androidKey] ?? `app/src/main/res/values-${loc}/strings.xml`;
    if (!existsSync(resolve(root, androidPath))) {
      errors.push(`missing ${androidPath}`);
    }
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("listing-copy:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK listing-copy:validate — frozen 8-locale copy within Play limits");
