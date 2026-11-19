/**
 * Finish 6.0 Phase 17 — economy/bank/dashboard depth 4
 * (mirrors shared/ship/economy-bank-4.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/economy-bank-4.json";
import { loadContent } from "../engine";

export interface Economy4Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  economy4Marker: string;
  extendsEconomy3: string;
  loanProductMin: number;
  goalPresetMin: number;
  loanProductIds: string[];
  newLoanProductIds: string[];
  goalPresets: number[];
  dashboardFields: string[];
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  softEconomy3Validate: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const ECONOMY_4 = catalogJson as unknown as Economy4Catalog;
export const ECONOMY_4_PHASE = ECONOMY_4.phase;
export const ECONOMY_4_SCHEMA = ECONOMY_4.schema;
export const ECONOMY_4_MARKER = ECONOMY_4.economy4Marker;

export interface Economy4Measure {
  loanProductCount: number;
  goalPresetCount: number;
  loanProductsPresent: boolean;
  newLoansPresent: boolean;
  goalsPresent: boolean;
  dashboardFieldsPresent: boolean;
  nestTreasuryUxPresent: boolean;
  kickoffClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureEconomy4(repoRoot: string): Economy4Measure {
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

  const kickoff = readJson(resolve(repoRoot, ECONOMY_4.kickoffCatalog));
  const phase17 = (kickoff.phases as any[])?.find((p) => p.phase === 17);

  const missingGates: string[] = [];
  for (const gate of ECONOMY_4.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const dashboardFieldsPresent = ECONOMY_4.dashboardFields.every(
    (f) => tsDash.includes(f) && (ktDash.includes(f) || ktView.includes(f)),
  );
  const nestTreasuryUxPresent =
    webPanel.includes("nestTreasuryLines") &&
    webPanel.includes("dashboard.nestTreasury") &&
    androidPanel.includes("nestTreasuryLines") &&
    androidPanel.includes("dashboard.nestTreasury");

  return {
    loanProductCount: products.length,
    goalPresetCount: goals.length,
    loanProductsPresent: ECONOMY_4.loanProductIds.every((id) =>
      products.some((p: any) => p.id === id),
    ),
    newLoansPresent: ECONOMY_4.newLoanProductIds.every((id) =>
      products.some((p: any) => p.id === id),
    ),
    goalsPresent: ECONOMY_4.goalPresets.every((g) => goals.includes(g)),
    dashboardFieldsPresent,
    nestTreasuryUxPresent,
    kickoffClosed: kickoff.gaps?.economy4Incomplete === false,
    kickoffWired:
      phase17?.id === "economy-bank-4" && phase17?.validate === "economy4:validate",
    missingGates,
  };
}
