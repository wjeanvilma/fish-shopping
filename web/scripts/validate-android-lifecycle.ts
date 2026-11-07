/**
 * Phase 13 (post-1.0) — validate Android device lifecycle matrix vs Phase 28 + host hooks.
 *
 * Usage:
 *   npm run lifecycle:android:validate
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
  const matrix = readJson(resolve(root, "shared/lifecycle/android-device-matrix.json"));
  const phase28 = readJson(resolve(root, "shared/lifecycle/browser-lifecycle.json"));
  const manifest = readFileSync(resolve(root, "app/src/main/AndroidManifest.xml"), "utf8");
  const main = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/MainActivity.kt"),
    "utf8",
  );
  const vm = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );

  if (matrix.phase !== 13) errors.push(`phase expected 13, got ${matrix.phase}`);
  if (matrix.schema !== "fish.lifecycle.android_device_matrix.v1") errors.push("bad schema");
  if (matrix.phase28Catalog !== "shared/lifecycle/browser-lifecycle.json") {
    errors.push("phase28Catalog path mismatch");
  }
  if (phase28.phase !== 28) errors.push("Phase 28 catalog phase drift");

  const scenarioIds = (matrix.scenarios as any[]).map((s) => s.id);
  for (const need of ["background", "resume", "rotate", "process_death", "low_memory"]) {
    if (!scenarioIds.includes(need)) errors.push(`missing scenario ${need}`);
  }

  const classIds = (matrix.deviceClasses as any[]).map((c) => c.id);
  for (const need of ["phone", "tablet7", "tablet10"]) {
    if (!classIds.includes(need)) errors.push(`missing device class ${need}`);
  }

  for (const change of phase28.android.configChangesHandled as string[]) {
    if (!manifest.includes(change)) errors.push(`manifest missing configChange ${change}`);
  }
  if (!manifest.includes('android:screenOrientation="fullSensor"')) {
    errors.push("manifest missing fullSensor");
  }

  if (!main.includes("onTrimMemory")) errors.push("MainActivity missing onTrimMemory");
  if (!main.includes("onConfigurationChanged")) errors.push("MainActivity missing onConfigurationChanged");
  if (!main.includes("game.pause()")) errors.push("MainActivity.onStop must call game.pause()");
  if (!main.includes("game.resume()")) errors.push("MainActivity.onStart must call game.resume()");
  if (!vm.includes("fun onTrimMemory")) errors.push("GameViewModel missing onTrimMemory");
  if (!vm.includes("fun pause()")) errors.push("GameViewModel missing pause");
  if (!vm.includes("fun resume()")) errors.push("GameViewModel missing resume");

  const slots = phase28.android.processDeath.restoreFrom as string[];
  if (JSON.stringify(slots) !== JSON.stringify(matrix.restoreSlots)) {
    errors.push("restoreSlots must match Phase 28 processDeath.restoreFrom");
  }

  if (matrix.trimMemoryCheckpointFrom !== "TRIM_MEMORY_RUNNING_LOW") {
    errors.push("trimMemoryCheckpointFrom must be TRIM_MEMORY_RUNNING_LOW");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("lifecycle:android:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK lifecycle:android:validate — device matrix wired to Phase 28 + MainActivity hooks");
