/**
 * Finish 2.0 Phase 6 → Phase 30 — LOC floors scoreboard readiness.
 *
 * Usage:
 *   npm run loc:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOC_ENFORCE_MODE,
  LOC_FLOORS,
  LOC_FLOORS_PHASE,
  LOC_FLOORS_SCHEMA,
  LOC_PRODUCT_TOTAL_FLOOR,
  LOC_PRODUCT_TOTAL_PLAN_TARGET,
  measureLocScoreboard,
} from "../src/ship/locFloors";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/loc-floors.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/LocFloors.kt",
    ),
    "utf8",
  );
  const propsOk = existsSync(resolve(root, "gradle.properties"));

  if (catalog.phase !== 6) errors.push(`phase expected 6, got ${catalog.phase}`);
  if (catalog.schema !== LOC_FLOORS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (LOC_FLOORS_PHASE !== 6) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("schemaVersion must be 23 at freeze");
  if (catalog.metric?.unit !== "physical_lines") errors.push("metric.unit must be physical_lines");
  if (catalog.enforceFloors !== true) errors.push("enforceFloors must be true at Phase 30");
  if (catalog.enforceAtPhase !== 30) errors.push("enforceAtPhase must be 30");
  if (catalog.enforceMode !== "freeze_anti_regression" || LOC_ENFORCE_MODE !== "freeze_anti_regression") {
    errors.push("enforceMode must be freeze_anti_regression");
  }

  if (catalog.scopes.gameCore.phase30Floor !== 16000) errors.push("gameCore freeze floor must be 16000");
  if (catalog.scopes.app.phase30Floor !== 10000) errors.push("app freeze floor must be 10000");
  if (catalog.scopes.webSrc.phase30Floor !== 24000) errors.push("webSrc freeze floor must be 24000");
  if (catalog.productTotalFloor !== 50000) errors.push("productTotalFloor must be 50000");
  if (LOC_PRODUCT_TOTAL_FLOOR !== 50000) errors.push("TS product total floor mirror mismatch");

  if (catalog.scopes.gameCore.planTarget !== 25000) errors.push("gameCore planTarget must stay 25000");
  if (catalog.scopes.app.planTarget !== 16000) errors.push("app planTarget must stay 16000");
  if (catalog.scopes.webSrc.planTarget !== 38000) errors.push("webSrc planTarget must stay 38000");
  if (catalog.productTotalPlanTarget !== 80000) errors.push("productTotalPlanTarget must stay 80000");
  if (LOC_PRODUCT_TOTAL_PLAN_TARGET !== 80000) errors.push("TS plan target mirror mismatch");

  if (listing.locFloorsPhase !== 6) errors.push("listing.locFloorsPhase must be 6");
  if (listing.locFloorsCatalog !== "shared/ship/loc-floors.json") {
    errors.push("listing.locFloorsCatalog mismatch");
  }

  if (!ci.includes("loc:smoke")) errors.push("ci.yml missing loc:smoke");
  if (!kotlin.includes("PRODUCT_TOTAL_FLOOR")) errors.push("Kotlin LocFloors missing PRODUCT_TOTAL_FLOOR");
  if (!kotlin.includes("16_000") && !kotlin.includes("16000")) {
    errors.push("Kotlin LocFloors missing game-core freeze floor");
  }
  if (!kotlin.includes("PLAN_TARGET")) errors.push("Kotlin LocFloors missing plan targets");
  if (!kotlin.includes("ENFORCE_FLOORS = true")) errors.push("Kotlin ENFORCE_FLOORS must be true");
  if (!propsOk) errors.push("missing gradle.properties");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  const board = measureLocScoreboard(root);
  if (board.gameCore.lines < 1) errors.push("game-core measure returned 0 lines");
  if (board.app.lines < 1) errors.push("app measure returned 0 lines");
  if (board.webSrc.lines < 1) errors.push("web/src measure returned 0 lines");
  if (board.productTotal < catalog.baseline.productTotal * 0.9) {
    errors.push(
      `product LOC collapsed below 90% of Phase 6 baseline (${board.productTotal} < ${Math.floor(catalog.baseline.productTotal * 0.9)})`,
    );
  }
  if (board.gameCore.root.includes("test")) errors.push("game-core root must not be tests");
  if (!board.enforceFloors) errors.push("scoreboard enforceFloors unexpectedly false");
  if (!board.gameCore.met) errors.push(`game-core below freeze floor (${board.gameCore.lines})`);
  if (!board.app.met) errors.push(`app below freeze floor (${board.app.lines})`);
  if (!board.webSrc.met) errors.push(`web/src below freeze floor (${board.webSrc.lines})`);
  if (!board.productMet) errors.push(`product below freeze floor (${board.productTotal})`);

  if (catalog.baseline.gameCore !== 13276) errors.push("baseline.gameCore drift");
  if (catalog.baseline.app !== 9287) errors.push("baseline.app drift");
  if (catalog.baseline.webSrc !== 20114) errors.push("baseline.webSrc drift");
  if (catalog.baseline.productTotal !== 42677) errors.push("baseline.productTotal drift");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("loc:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK loc:validate — LOC freeze anti-regression floors enforced (plan targets retained)");
