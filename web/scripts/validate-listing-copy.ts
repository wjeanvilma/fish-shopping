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

  if (!catalog.locales.includes("en") || catalog.locales.length !== 1) {
    errors.push("locales must be exactly [en] for this freeze");
  }
  if (en.locale !== "en" || !en.frozen) errors.push("en locale must be frozen");
  if (en.title !== copy.title) errors.push("en.title mismatch");
  if (en.shortDescription !== copy.shortDescription) errors.push("en.shortDescription mismatch");
  if (en.fullDescription !== copy.fullDescription) errors.push("en.fullDescription mismatch");
  if (en.whatsNew !== copy.whatsNew) errors.push("en.whatsNew mismatch");
  if (en.webLanding.tagline !== landing.tagline) errors.push("en.webLanding.tagline mismatch");

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

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("listing-copy:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK listing-copy:validate — frozen en copy within Play limits");
