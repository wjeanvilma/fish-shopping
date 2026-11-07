/**
 * Finish 2.0 Phase 28 — Support/ops 2.0 readiness.
 *
 * Usage:
 *   npm run support2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  FEATURE_FAQ_IDS,
  KNOWN_ISSUE_2_IDS,
  REFUND_MATRIX_IDS,
  SUPPORT_HTML_SECTIONS_2,
  SUPPORT_OPS_2,
  SUPPORT_OPS_2_MARKER,
} from "../src/ops/supportOps2";
import {
  FEATURE_FAQ_FLOOR,
  KNOWN_ISSUE_2_FLOOR,
  REFUND_MATRIX_FLOOR,
  SUPPORT_HTML_SECTION_FLOOR,
  SUPPORT_OPS_2_SHIP,
  SUPPORT_OPS_2_SHIP_MARKER,
  SUPPORT_OPS_2_SHIP_PHASE,
  SUPPORT_OPS_2_SHIP_SCHEMA,
} from "../src/ship/supportOps2";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";
import { SUPPORT_RUNBOOK } from "../src/engine/supportRunbook";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const ship = readJson(resolve(root, "shared/ship/support-ops-2.0.json"));
  const ops2 = readJson(resolve(root, "shared/ops/support-ops-2.0.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-support-ops-2.0.json"));
  const runbook = readJson(resolve(root, "shared/ops/support-runbook.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const supportHtml = readFileSync(resolve(root, "web/public/support.html"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));

  if (ship.phase !== 28) errors.push(`ship phase expected 28, got ${ship.phase}`);
  if (ship.schema !== SUPPORT_OPS_2_SHIP_SCHEMA) errors.push("bad ship schema");
  if (ship.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (SUPPORT_OPS_2_SHIP_PHASE !== 28) errors.push("phase mirror mismatch");
  if (ship.schemaVersion !== 23) errors.push("ship schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (ship.supportOps2Marker !== SUPPORT_OPS_2_SHIP_MARKER) errors.push("ship marker mismatch");
  if (ops2.supportOps2Marker !== SUPPORT_OPS_2_MARKER) errors.push("ops2 marker mismatch");
  if (fixture.supportOps2Marker !== SUPPORT_OPS_2_MARKER) errors.push("fixture marker mismatch");

  if (ship.featureFaqMin !== 6 || FEATURE_FAQ_FLOOR !== 6) errors.push("featureFaqMin must be 6");
  if (ship.refundMatrixRowMin !== 4 || REFUND_MATRIX_FLOOR !== 4) {
    errors.push("refundMatrixRowMin must be 4");
  }
  if (ship.knownIssue2Min !== 4 || KNOWN_ISSUE_2_FLOOR !== 4) {
    errors.push("knownIssue2Min must be 4");
  }
  if (ship.supportHtmlSectionMin !== 3 || SUPPORT_HTML_SECTION_FLOOR !== 3) {
    errors.push("supportHtmlSectionMin must be 3");
  }

  if ((ops2.featureFaq as any[]).length < 6) errors.push("ops2 featureFaq < 6");
  if ((ops2.refundMatrix as any[]).length < 4) errors.push("ops2 refundMatrix < 4");
  if ((ops2.knownIssues2 as any[]).length < 4) errors.push("ops2 knownIssues2 < 4");
  if (FEATURE_FAQ_IDS.length < 6) errors.push("runtime FEATURE_FAQ_IDS < 6");
  if (REFUND_MATRIX_IDS.length < 4) errors.push("runtime REFUND_MATRIX_IDS < 4");
  if (KNOWN_ISSUE_2_IDS.length < 4) errors.push("runtime KNOWN_ISSUE_2_IDS < 4");

  for (const id of fixture.expect.featureFaqIds as string[]) {
    if (!FEATURE_FAQ_IDS.includes(id)) errors.push(`missing feature FAQ ${id}`);
  }
  for (const id of fixture.expect.refundMatrixIds as string[]) {
    if (!REFUND_MATRIX_IDS.includes(id)) errors.push(`missing refund matrix ${id}`);
  }
  for (const id of fixture.expect.knownIssue2Ids as string[]) {
    if (!KNOWN_ISSUE_2_IDS.includes(id)) errors.push(`missing knownIssue2 ${id}`);
    if (!runbook.knownIssues.some((k: any) => k.id === id)) {
      errors.push(`runbook missing merged known issue ${id}`);
    }
  }
  for (const id of fixture.expect.supportHtmlSections as string[]) {
    if (!SUPPORT_HTML_SECTIONS_2.includes(id)) errors.push(`missing html section id ${id}`);
    if (!supportHtml.includes(`id="${id}"`)) errors.push(`support.html missing id=${id}`);
  }
  for (const needle of fixture.expect.supportHtmlNeedles as string[]) {
    if (!supportHtml.includes(needle)) errors.push(`support.html missing ${needle}`);
  }

  if (runbook.finish2OpsPhase !== 28) errors.push("runbook.finish2OpsPhase must be 28");
  if (runbook.ops2Catalog !== "shared/ops/support-ops-2.0.json") {
    errors.push("runbook.ops2Catalog mismatch");
  }
  if (SUPPORT_RUNBOOK.finish2OpsPhase !== 28) errors.push("runtime finish2OpsPhase mismatch");
  if (!SUPPORT_RUNBOOK.faq.some((f) => f.id === "features_2")) {
    errors.push("runbook faq missing features_2");
  }
  if (!supportHtml.includes("Refund matrix") || !supportHtml.includes("<table>")) {
    errors.push("support.html refund matrix table required");
  }

  // post-1.0 baseline still coherent
  if (runbook.phase !== 28) errors.push("baseline runbook phase must stay 28");
  if (listing.supportRunbookPhase !== 28) errors.push("listing.supportRunbookPhase must stay 28");

  if ((dod.quotas?.supportOps2FeatureFaq ?? 0) < 6) {
    errors.push("DoD quotas.supportOps2FeatureFaq must be ≥ 6");
  }
  if ((dod.quotas?.supportOps2RefundRows ?? 0) < 4) {
    errors.push("DoD quotas.supportOps2RefundRows must be ≥ 4");
  }
  if (listing.supportOps2Phase !== 28) errors.push("listing.supportOps2Phase must be 28");
  if (listing.supportOps2Catalog !== "shared/ship/support-ops-2.0.json") {
    errors.push("listing.supportOps2Catalog mismatch");
  }
  if (!ci.includes("support2:validate")) errors.push("ci.yml missing support2:validate");
  if (!ci.includes("support:validate")) errors.push("ci.yml missing baseline support:validate");
  if (!pin.fixtures?.includes("parity-support-ops-2.0.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-support-ops-2.0.json");
  }
  if (pin.supportOps2 !== "shared/ship/support-ops-2.0.json") {
    errors.push("RELEASE_PIN.supportOps2 path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");
  if (!pkg.scripts?.["support2:validate"]) errors.push("web/package.json missing support2:validate");
  if (SUPPORT_OPS_2_SHIP.opsCatalog !== "shared/ops/support-ops-2.0.json") {
    errors.push("ship opsCatalog mismatch");
  }
  if (SUPPORT_OPS_2.plan !== "30_finish_2.0") errors.push("ops2 plan mismatch");

  for (const gatePath of ship.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("support2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK support2:validate — Support/ops 2.0 FAQ + refund matrix + support.html");
