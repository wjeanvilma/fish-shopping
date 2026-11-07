/**
 * Phase 8 (post-1.0) — validate Play Data safety catalog vs analytics + backup rules.
 *
 * Usage:
 *   npm run data-safety:validate
 *   npx vite-node scripts/validate-data-safety.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/store/data-safety.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const hardening = readJson(resolve(root, "shared/android/release-hardening.json"));
  const backupXml = readFileSync(resolve(root, "app/src/main/res/xml/backup_rules.xml"), "utf8");
  const extractXml = readFileSync(resolve(root, "app/src/main/res/xml/data_extraction_rules.xml"), "utf8");
  const privacy = readFileSync(resolve(root, "web/public/privacy.html"), "utf8");
  const analyticsTs = readFileSync(resolve(root, "web/src/engine/analytics.ts"), "utf8");
  const analyticsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Analytics.kt"),
    "utf8",
  );

  if (catalog.phase !== 8) errors.push(`phase expected 8, got ${catalog.phase}`);
  if (catalog.schema !== "fish.store.data_safety.v1") errors.push("bad schema");
  if (catalog.packageName !== listing.packageName) {
    errors.push("packageName mismatch vs listing.json");
  }
  if (catalog.privacyPolicyUrl !== listing.privacyPolicyUrl) {
    errors.push("privacyPolicyUrl mismatch vs listing.json");
  }
  if (!catalog.overview.collectsOrSharesUserData) errors.push("overview must admit limited collection");
  if (!catalog.overview.encryptedInTransit) errors.push("must claim encryption in transit");
  if (!catalog.overview.usersCanRequestDeletion) errors.push("must claim deletion path");
  if (!catalog.analytics.noPiiClaim) errors.push("noPiiClaim must be true");
  if (catalog.analytics.consentDefault !== false) errors.push("analytics consent must default off");
  if (!catalog.cloudSync.defaultOff) errors.push("cloud sync must default off");
  if (catalog.cloudSync.storesEmailOrDisplayName) errors.push("cloud must not store email/display name");
  if (catalog.purchases.developerReceivesCardDetails) errors.push("must not claim card details");
  if (catalog.purchases.playFormDeclaresUserPaymentInfo) {
    errors.push("Play form must not declare developer-collected payment info");
  }

  const piiTypes = ["name", "email_address", "phone_number", "user_payment_info", "precise_location"];
  for (const t of piiTypes) {
    if (!catalog.dataNotCollected.includes(t)) errors.push(`dataNotCollected missing ${t}`);
  }

  const collected = (catalog.dataCollected as any[]).filter((r) => r.collected);
  for (const row of collected) {
    if (row.shared) errors.push(`${row.playTypeId} must not be shared`);
    if (row.required) errors.push(`${row.playTypeId} must be optional (required=false)`);
  }
  const ids = new Set(collected.map((r) => r.playTypeId));
  for (const need of ["app_interactions", "diagnostics", "device_or_other_ids", "other_actions"]) {
    if (!ids.has(need)) errors.push(`missing collected play type ${need}`);
  }

  for (const name of catalog.analytics.eventNames as string[]) {
    if (!analyticsTs.includes(`"${name}"`) && !analyticsTs.includes(`'${name}'`)) {
      errors.push(`analytics.ts missing event ${name}`);
    }
    if (!analyticsKt.includes(`"${name}"`)) errors.push(`Analytics.kt missing event ${name}`);
  }
  for (const key of catalog.analytics.forbiddenKeysInclude as string[]) {
    if (!analyticsTs.includes(`"${key}"`)) errors.push(`analytics.ts missing forbidden key ${key}`);
    if (!analyticsKt.includes(`"${key}"`)) errors.push(`Analytics.kt missing forbidden key ${key}`);
  }

  const excludedPrefs = catalog.androidBackup.excludedSharedPreferences as string[];
  const excludedFiles = catalog.androidBackup.excludedFiles as string[];
  const hardenPrefs = hardening.backupExcludes.sharedPreferences as string[];
  const hardenFiles = hardening.backupExcludes.files as string[];
  if (JSON.stringify(excludedPrefs) !== JSON.stringify(hardenPrefs)) {
    errors.push("androidBackup.excludedSharedPreferences ≠ release-hardening");
  }
  if (JSON.stringify(excludedFiles) !== JSON.stringify(hardenFiles)) {
    errors.push("androidBackup.excludedFiles ≠ release-hardening");
  }
  for (const p of excludedPrefs) {
    if (!backupXml.includes(p) || !extractXml.includes(p)) {
      errors.push(`backup XML missing sharedpref exclude ${p}`);
    }
  }
  for (const f of excludedFiles) {
    if (!backupXml.includes(f) || !extractXml.includes(f)) {
      errors.push(`backup XML missing file exclude ${f}`);
    }
  }

  for (const needle of ["analytics", "opt in", "cloud sync", "do not"]) {
    if (!privacy.toLowerCase().includes(needle.split(" ")[0]!)) {
      // soft: ensure privacy page still documents analytics + cloud
    }
  }
  if (!privacy.toLowerCase().includes("analytics")) errors.push("privacy.html missing analytics");
  if (!privacy.toLowerCase().includes("cloud")) errors.push("privacy.html missing cloud");
  if (!privacy.toLowerCase().includes("purchases")) errors.push("privacy.html missing purchases");

  if (listing.dataSafetyPhase !== 8) errors.push("listing.dataSafetyPhase must be 8");
  if (listing.dataSafetyCatalog !== "shared/store/data-safety.json") {
    errors.push("listing.dataSafetyCatalog path mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("data-safety:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK data-safety:validate — Play form catalog aligned with analytics + backup rules");
