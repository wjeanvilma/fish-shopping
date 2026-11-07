/**
 * Finish 2.0 Phase 5 — configuration-cache-safe release signing gate readiness.
 *
 * Usage:
 *   npm run signing:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHECK_RELEASE_UPLOAD_SIGNING,
  RELEASE_SIGNING_CC,
  RELEASE_SIGNING_CC_PHASE,
  RELEASE_SIGNING_CC_SCHEMA,
} from "../src/ship/releaseSigningCc";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/release-signing-cc.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const gradle = readFileSync(resolve(root, "app/build.gradle.kts"), "utf8");
  const props = readFileSync(resolve(root, "gradle.properties"), "utf8");
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ReleaseSigningCc.kt",
    ),
    "utf8",
  );
  const appTest = readFileSync(
    resolve(root, "app/src/test/java/com/willio/jeanvilma/fishshopping/ReleaseSigningTest.kt"),
    "utf8",
  );

  if (catalog.phase !== 5) errors.push(`phase expected 5, got ${catalog.phase}`);
  if (catalog.schema !== RELEASE_SIGNING_CC_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (RELEASE_SIGNING_CC_PHASE !== 5) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must stay 21");
  if (CHECK_RELEASE_UPLOAD_SIGNING !== "checkReleaseUploadSigning") {
    errors.push("fail task name mismatch");
  }

  if (listing.releaseSigningCcPhase !== 5) errors.push("listing.releaseSigningCcPhase must be 5");
  if (listing.releaseSigningCcCatalog !== "shared/ship/release-signing-cc.json") {
    errors.push("listing.releaseSigningCcCatalog mismatch");
  }

  if (!props.includes("org.gradle.configuration-cache=true")) {
    errors.push("gradle.properties must enable configuration-cache");
  }

  for (const needle of RELEASE_SIGNING_CC.configurationCache.requiredPatterns) {
    if (!gradle.includes(needle)) errors.push(`build.gradle.kts missing ${needle}`);
  }
  // Forbid legacy doFirst attach pattern on release packaging tasks.
  if (gradle.includes('tasks.findByName(taskName)?.doFirst')) {
    errors.push("build.gradle.kts still uses findByName?.doFirst release guard");
  }
  if (gradle.includes('findByName("packageRelease")?.doFirst')) {
    errors.push("build.gradle.kts has packageRelease doFirst");
  }
  // ensure dependsOn wiring mentions packageRelease + bundleRelease
  for (const task of RELEASE_SIGNING_CC.configurationCache.guardTasks) {
    if (!gradle.includes(`"${task}"`)) errors.push(`build.gradle.kts missing guard task ${task}`);
  }
  if (!gradle.includes(RELEASE_SIGNING_CC.configurationCache.failMessageNeedle)) {
    errors.push("build.gradle.kts missing fail message needle");
  }

  if (!ci.includes("signing:validate")) errors.push("ci.yml missing signing:validate");
  if (!kotlin.includes("FAIL_TASK")) errors.push("Kotlin ReleaseSigningCc missing FAIL_TASK");
  if (!appTest.includes("checkReleaseUploadSigning")) {
    errors.push("ReleaseSigningTest must assert checkReleaseUploadSigning");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("signing:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK signing:validate — checkReleaseUploadSigning is configuration-cache safe");
