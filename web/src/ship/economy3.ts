/**
 * Finish 5.0 Phase 21 — economy/bank/dashboard depth 3
 * (mirrors shared/ship/economy-bank-3.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/economy-bank-3.json";
import { loadContent } from "../engine";

export interface Economy3Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  economy3Marker: string;
  extendsEconomy2: string;
  loanProductMin: number;
  goalPresetMin: number;
  loanProductIds: string[];
  newLoanProductIds: string[];
  goalPresets: number[];
  dashboardFields: string[];
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  softEconomy2Validate: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const ECONOMY_3 = catalogJson as unknown as Economy3Catalog;
export const ECONOMY_3_PHASE = ECONOMY_3.phase;
export const ECONOMY_3_SCHEMA = ECONOMY_3.schema;
export const ECONOMY_3_MARKER = ECONOMY_3.economy3Marker;

export interface Economy3Measure {
  loanProductCount: number;
  goalPresetCount: number;
  loanProductsPresent: boolean;
  newLoansPresent: boolean;
  goalsPresent: boolean;
  dashboardFieldsPresent: boolean;
  ledgerUxPresent: boolean;
  kickoffClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureEconomy3(repoRoot: string): Economy3Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  loadContent(pack);
  const bank = pack.bank ?? {};
  const products = bank.loanProducts ?? [];
  const goals = bank.goalPresets ?? [];

  const tsDash = existsSync(resolve(repoRoot, "web/src/engine/businessDashboard.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/engine/businessDashboard.ts"), "utf8")
    : "";
  const ktDash = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/BusinessDashboard.kt"),
  )
    ? readFileSync(
      resolve(
        repoRoot,
        "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/BusinessDashboard.kt",
      ),
      "utf8",
    )
    : "";
  const ktView = existsSync(
    resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/SimViewModels.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/SimViewModels.kt"),
      "utf8",
    )
    : "";
  const webPanel = existsSync(resolve(repoRoot, "web/src/ui/BusinessDashboardPanel.tsx"))
    ? readFileSync(resolve(repoRoot, "web/src/ui/BusinessDashboardPanel.tsx"), "utf8")
    : "";
  const androidPanel = existsSync(
    resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt"),
  )
    ? readFileSync(
      resolve(
        repoRoot,
        "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt",
      ),
      "utf8",
    )
    : "";

  const kickoff = readJson(resolve(repoRoot, ECONOMY_3.kickoffCatalog));
  const phase21 = (kickoff.phases as any[])?.find((p) => p.phase === 21);

  const missingGates: string[] = [];
  for (const gate of ECONOMY_3.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const dashboardFieldsPresent = ECONOMY_3.dashboardFields.every(
    (f) => tsDash.includes(f) && (ktDash.includes(f) || ktView.includes(f)),
  );
  const ledgerUxPresent =
    webPanel.includes("ledgerLines") &&
    webPanel.includes("dashboard.pierLedger") &&
    androidPanel.includes("ledgerLines") &&
    androidPanel.includes("dashboard.pierLedger");

  return {
    loanProductCount: products.length,
    goalPresetCount: goals.length,
    loanProductsPresent: ECONOMY_3.loanProductIds.every((id) =>
      products.some((p: any) => p.id === id),
    ),
    newLoansPresent: ECONOMY_3.newLoanProductIds.every((id) =>
      products.some((p: any) => p.id === id),
    ),
    goalsPresent: ECONOMY_3.goalPresets.every((g) => goals.includes(g)),
    dashboardFieldsPresent,
    ledgerUxPresent,
    kickoffClosed: kickoff.gaps?.economy3Incomplete === false,
    kickoffWired:
      phase21?.id === "economy-bank-3" && phase21?.validate === "economy3:validate",
    missingGates,
  };
}
