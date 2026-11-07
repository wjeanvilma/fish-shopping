/**
 * Phase 26 (post-1.0) — analytics dashboard + crash-free alert readiness.
 *
 * Usage:
 *   npm run analytics:validate
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
  const catalog = readJson(resolve(root, "shared/ops/analytics-dashboard.json"));
  const dataSafety = readJson(resolve(root, "shared/store/data-safety.json"));
  const analyticsTs = readFileSync(resolve(root, "web/src/engine/analytics.ts"), "utf8");
  const analyticsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Analytics.kt"),
    "utf8",
  );
  const dashTs = readFileSync(resolve(root, "web/src/engine/analyticsDashboard.ts"), "utf8");
  const dashKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/AnalyticsDashboard.kt"),
    "utf8",
  );
  const busTs = readFileSync(resolve(root, "web/src/analytics/analyticsBus.ts"), "utf8");
  const busKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/analytics/AnalyticsBus.kt"),
    "utf8",
  );
  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const hud = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 26) errors.push(`phase expected 26, got ${catalog.phase}`);
  if (catalog.schema !== "fish.ops.analytics_dashboard.v1") errors.push("bad schema");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must stay 21");
  if (catalog.analyticsSchema !== "fish.analytics.v1") errors.push("analyticsSchema mismatch");
  if (catalog.consentRequired !== true) errors.push("consentRequired must be true");
  if (catalog.constraints?.noPii !== true) errors.push("noPii required");
  if (catalog.session?.startEvent !== "session_start") errors.push("session.startEvent");
  if (catalog.session?.crashFreeEvent !== "crash_free_session") errors.push("session.crashFreeEvent");
  if (!Array.isArray(catalog.panels) || catalog.panels.length < 4) errors.push("need ≥4 panels");
  if (!Array.isArray(catalog.alerts) || catalog.alerts.length < 1) errors.push("need ≥1 alert");
  const crashAlert = catalog.alerts.find((a: any) => a.id === "crash_free_session_rate");
  if (!crashAlert) errors.push("missing crash_free_session_rate alert");
  else {
    if (crashAlert.thresholdPermille !== 990) errors.push("crash-free threshold must be 990");
    if (crashAlert.minSamples < 5) errors.push("crash-free minSamples must be ≥5");
  }

  for (const name of ["session_start", "crash_free_session"]) {
    if (!analyticsTs.includes(`"${name}"`)) errors.push(`analytics.ts missing ${name}`);
    if (!analyticsKt.includes(`"${name}"`)) errors.push(`Analytics.kt missing ${name}`);
    if (!(dataSafety.analytics.eventNames as string[]).includes(name)) {
      errors.push(`data-safety eventNames missing ${name}`);
    }
  }
  if (dataSafety.analytics.dashboardCatalog !== "shared/ops/analytics-dashboard.json") {
    errors.push("data-safety dashboardCatalog path mismatch");
  }

  if (!dashTs.includes("buildAnalyticsDashboardSnapshot")) errors.push("web dashboard builder missing");
  if (!dashKt.includes("fun buildSnapshot")) errors.push("Kotlin dashboard builder missing");
  if (!busTs.includes("onSessionStart") || !busTs.includes("onSessionEndClean")) {
    errors.push("web AnalyticsBus missing session lifecycle");
  }
  if (!busKt.includes("onSessionStart") || !busKt.includes("onSessionEndClean")) {
    errors.push("Android AnalyticsBus missing session lifecycle");
  }
  if (!app.includes("onExportAnalyticsDashboard") || !app.includes("analyticsAlertActive")) {
    errors.push("App.tsx missing dashboard export/alert");
  }
  if (!hud.includes("onExportAnalyticsDashboard") || !hud.includes("analyticsAlertActive")) {
    errors.push("GameScreen.kt missing dashboard export/alert");
  }
  if (!ci.includes("analytics:validate")) errors.push("ci.yml missing analytics:validate");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("analytics:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK analytics:validate — dashboard + crash-free alert; consent-gated; schema 20");
