/**
 * Finish 2.0 Phase 15 — staff specialization trees readiness.
 *
 * Usage:
 *   npm run stafftrees:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, SCHEMA_VERSION, StaffTreesSystem } from "../src/engine";
import {
  STAFF_BRANCH_FLOOR,
  STAFF_SCHEDULE_FLOOR,
  STAFF_TREES,
  STAFF_TREES_PHASE,
  STAFF_TREES_SCHEMA,
} from "../src/ship/staffTrees";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/staff-trees.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-staff-trees.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 15) errors.push(`phase expected 15, got ${catalog.phase}`);
  if (catalog.schema !== STAFF_TREES_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (STAFF_TREES_PHASE !== 15) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION < 23) errors.push("engine SCHEMA_VERSION must be >= 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  // Finish 5.0 Phase 20 soft-floor: wave-3 grew trees beyond historical 10/2.
  if (catalog.branchCount < 10 || STAFF_BRANCH_FLOOR < 10) {
    errors.push("branchCount floor must be ≥ 10");
  }
  if (catalog.scheduleCount < 2 || STAFF_SCHEDULE_FLOOR < 2) {
    errors.push("scheduleCount floor must be ≥ 2");
  }
  if ((dod.quotas?.staffBranches ?? 0) < 10) errors.push("DoD quotas.staffBranches must be ≥ 10");
  if ((dod.quotas?.staffSchedules ?? 0) < 2) errors.push("DoD quotas.staffSchedules must be ≥ 2");
  if (content.staffTrees.branches.length < 10) {
    errors.push(`branches ${content.staffTrees.branches.length} < 10`);
  }
  if (content.staffTrees.schedules.length < 2) {
    errors.push(`schedules ${content.staffTrees.schedules.length} < 2`);
  }

  if (listing.staffTreesPhase !== 15) errors.push("listing.staffTreesPhase must be 15");
  if (listing.staffTreesCatalog !== "shared/ship/staff-trees.json") {
    errors.push("listing.staffTreesCatalog mismatch");
  }
  if (!ci.includes("stafftrees:validate")) errors.push("ci.yml missing stafftrees:validate");
  if (!ci.includes("schema23:validate")) errors.push("ci.yml missing schema23:validate");
  if (!pin.fixtures?.includes("parity-staff-trees.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-staff-trees.json");
  }
  if (pin.staffTrees !== "shared/ship/staff-trees.json") {
    errors.push("RELEASE_PIN.staffTrees path mismatch");
  }
  if (pin.schemaVersion < 23) errors.push("RELEASE_PIN.schemaVersion must be >= 23");

  for (const id of STAFF_TREES.branches) {
    if (!content.staffBranchesById.has(id)) errors.push(`missing branch ${id}`);
  }
  for (const id of STAFF_TREES.schedules) {
    if (!content.staffSchedulesById.has(id)) errors.push(`missing schedule ${id}`);
  }

  const branch = content.staffBranchesById.get(fixture.branchId);
  if (!branch) errors.push(`fixture branch ${fixture.branchId} missing`);
  else if (branch.catchSpeedMultPermille !== fixture.expectAfterTrain.catchSpeedMultPermille) {
    errors.push("fixture catchSpeedMultPermille mismatch vs content");
  }
  if (typeof StaffTreesSystem.train !== "function") errors.push("StaffTreesSystem.train missing");

  const treesKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/StaffTreesSystem.kt"),
    "utf8",
  );
  const systemsTs = [
    "web/src/engine/systems.ts",
    "web/src/engine/systems/staffTrees.ts",
  ]
    .map((p) => {
      try {
        return readFileSync(resolve(root, p), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n");
  // Finish 4/5 soft-floor: GameHost split moved toast/intents under web/src/game/host/.
  const hostBundle = [
    "web/src/game/GameHost.ts",
    "web/src/game/host/hostStepBus.ts",
    "web/src/game/host/hostStaffIntents.ts",
  ].map((p) => {
    try {
      return readFileSync(resolve(root, p), "utf8");
    } catch {
      return "";
    }
  }).join("\n");
  const vmKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );
  // Soft-floor: Finish 6.0 Phase 5 host-vm split moved step toasts into VmStepBus.
  let vmStepBus = "";
  try {
    vmStepBus = readFileSync(
      resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/vm/VmStepBus.kt"),
      "utf8",
    );
  } catch {
    vmStepBus = "";
  }
  const appTsx = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const screenKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  if (!treesKt.includes("object StaffTreesSystem")) errors.push("Kotlin StaffTreesSystem missing");
  if (!systemsTs.includes("export const StaffTreesSystem")) errors.push("web StaffTreesSystem missing");
  if (!hostBundle.includes("worker_branch_unlocked")) errors.push("host missing branch unlock toast");
  if (!vmKt.includes("WorkerBranchUnlocked") && !vmStepBus.includes("WorkerBranchUnlocked")) {
    errors.push("GameViewModel/VmStepBus missing WorkerBranchUnlocked toast");
  }
  if (!appTsx.includes("onTrainBranch")) errors.push("web Staff panel missing branch train UI");
  if (!screenKt.includes("onTrainBranch")) errors.push("Android Staff panel missing branch train UI");
  if (!vmKt.includes("fun trainWorkerBranch")) errors.push("Android missing trainWorkerBranch");
  if (!hostBundle.includes("trainWorkerBranch")) errors.push("web missing trainWorkerBranch");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("stafftrees:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK stafftrees:validate — staff trees ready");
