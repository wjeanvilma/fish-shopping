/**
 * Phase 28 (post-1.0) — support / refund / restore runbook readiness.
 *
 * Usage:
 *   npm run support:validate
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
  const catalog = readJson(resolve(root, "shared/ops/support-runbook.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));
  const supportHtml = readFileSync(resolve(root, "web/public/support.html"), "utf8");
  const web = readFileSync(resolve(root, "web/src/engine/supportRunbook.ts"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/store/SupportRunbook.kt"),
    "utf8",
  );
  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const hud = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 28) errors.push(`phase expected 28, got ${catalog.phase}`);
  if (catalog.schema !== "fish.ops.support_runbook.v1") errors.push("bad schema");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must stay 21");
  if (catalog.packageName !== listing.packageName) errors.push("packageName ≠ listing");
  if (catalog.supportUrl !== listing.supportUrl) errors.push("supportUrl ≠ listing");
  if (listing.supportRunbookPhase !== 28) errors.push("listing.supportRunbookPhase must be 28");
  if (listing.supportRunbookCatalog !== "shared/ops/support-runbook.json") {
    errors.push("listing.supportRunbookCatalog mismatch");
  }

  if (!catalog.triage?.email?.includes("@")) errors.push("triage.email required");
  if (!catalog.triage?.mailto?.startsWith("mailto:")) errors.push("triage.mailto required");
  if (!catalog.triage?.issuesUrl?.includes("github.com")) errors.push("triage.issuesUrl required");
  if ((catalog.triage.requiredFields as string[]).length < 4) {
    errors.push("triage.requiredFields too short");
  }
  if ((catalog.restore?.steps as string[]).length < 4) errors.push("restore.steps too short");
  if (catalog.restore?.idempotent !== true) errors.push("restore must be idempotent");
  if ((catalog.knownIssues as any[]).length < 4) errors.push("need ≥4 known issues");
  if ((catalog.faq as any[]).length < 4) errors.push("need ≥4 faq entries");
  if (!catalog.refund?.play?.playerSelfServe) errors.push("refund.play.playerSelfServe required");
  if (!catalog.refund?.web?.playerPath) errors.push("refund.web.playerPath required");

  const fullSku = entitlements.fullUnlock?.sku;
  if (fullSku && !(catalog.restore.skus as string[]).includes(fullSku)) {
    errors.push(`restore.skus missing full unlock ${fullSku}`);
  }
  for (const cos of entitlements.cosmetics as any[]) {
    if (!(catalog.restore.skus as string[]).includes(cos.sku)) {
      errors.push(`restore.skus missing cosmetic ${cos.sku}`);
    }
  }

  const needles = [
    "Restore purchases",
    "Refunds",
    "Known issues",
    "fish-shopping-support@jeanvilma.com",
    "github.com/wjeanvilma/fish-shopping/issues",
    'id="restore"',
    'id="refunds"',
    'id="known-issues"',
    'id="contact"',
  ];
  for (const n of needles) {
    if (!supportHtml.includes(n)) errors.push(`support.html missing ${n}`);
  }

  if (!web.includes("SUPPORT_RESTORE_HELP")) errors.push("web supportRunbook missing SUPPORT_RESTORE_HELP");
  if (!kotlin.includes("RESTORE_HELP_LINE")) errors.push("Kotlin SupportRunbook missing RESTORE_HELP_LINE");
  if (!app.includes("SUPPORT_RESTORE_HELP") || !app.includes("#restore")) {
    errors.push("App.tsx missing restore help / support anchor");
  }
  if (!hud.includes("RESTORE_HELP_LINE") || !hud.includes("SUPPORT_RESTORE_URL")) {
    errors.push("GameScreen.kt missing restore help / support URL");
  }
  if (!ci.includes("support:validate")) errors.push("ci.yml missing support:validate");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("support:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK support:validate — refund/restore runbook linked from support.html");
