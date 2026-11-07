import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FEATURE_FAQ_IDS,
  KNOWN_ISSUE_2_IDS,
  REFUND_MATRIX_IDS,
  SUPPORT_OPS_2_MARKER,
  SUPPORT_OPS_2_PHASE,
  featureFaq2ById,
  refundMatrixById,
} from "../src/ops/supportOps2";
import { FEATURE_FAQ_FLOOR, SUPPORT_OPS_2_SHIP_PHASE } from "../src/ship/supportOps2";
import { SUPPORT_RUNBOOK } from "../src/engine/supportRunbook";

const root = resolve(__dirname, "../..");

describe("Support/ops 2.0 (Finish 2.0 Phase 28)", () => {
  it("locks floors and listing pointers", () => {
    expect(SUPPORT_OPS_2_PHASE).toBe(28);
    expect(SUPPORT_OPS_2_SHIP_PHASE).toBe(28);
    expect(SUPPORT_OPS_2_MARKER).toBe("authored-finish-2.0-phase-28");
    expect(FEATURE_FAQ_FLOOR).toBe(6);
    expect(FEATURE_FAQ_IDS.length).toBeGreaterThanOrEqual(6);
    expect(REFUND_MATRIX_IDS.length).toBeGreaterThanOrEqual(4);
    expect(KNOWN_ISSUE_2_IDS.length).toBeGreaterThanOrEqual(4);
    expect(featureFaq2ById("weather_tide")?.title).toContain("Weather");
    expect(refundMatrixById("web_full_unlock")?.platform).toBe("web");
    expect(SUPPORT_RUNBOOK.finish2OpsPhase).toBe(28);
    const listing = JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
      supportOps2Phase?: number;
    };
    expect(listing.supportOps2Phase).toBe(28);
  });

  it("support.html has Features 2.0, refund matrix, ops2 known", () => {
    const html = readFileSync(resolve(root, "web/public/support.html"), "utf8");
    expect(html).toContain('id="features-2"');
    expect(html).toContain('id="refund-matrix"');
    expect(html).toContain('id="ops2-known"');
    expect(html).toContain("<table>");
    expect(html).toContain("VITE_BILLING_API_BASE");
  });

  it("support2:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-support-ops-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK support2:validate");
  });

  it("baseline support:validate still green", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-support-runbook.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK support:validate");
  });
});
