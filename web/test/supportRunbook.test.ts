import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  SUPPORT_EMAIL,
  SUPPORT_ISSUES_URL,
  SUPPORT_MAILTO,
  SUPPORT_RESTORE_HELP,
  SUPPORT_RUNBOOK,
  SUPPORT_RUNBOOK_PHASE,
  SUPPORT_RUNBOOK_SCHEMA,
  knownIssueById,
  restoreSkuList,
  supportFaqById,
} from "../src/engine/supportRunbook";

const root = resolve(__dirname, "../..");

describe("Support runbook (post-1.0 Phase 28)", () => {
  it("locks triage, restore, refund, and known-issue contracts", () => {
    expect(SUPPORT_RUNBOOK_PHASE).toBe(28);
    expect(SUPPORT_RUNBOOK_SCHEMA).toBe("fish.ops.support_runbook.v1");
    expect(SUPPORT_RUNBOOK.schemaVersion).toBe(21);
    expect(SUPPORT_EMAIL).toContain("@");
    expect(SUPPORT_MAILTO.startsWith("mailto:")).toBe(true);
    expect(SUPPORT_ISSUES_URL).toContain("github.com");
    expect(SUPPORT_RESTORE_HELP.toLowerCase()).toContain("restore");
    expect(SUPPORT_RUNBOOK.restore.steps.length).toBeGreaterThanOrEqual(4);
    expect(SUPPORT_RUNBOOK.restore.idempotent).toBe(true);
    expect(restoreSkuList()).toContain("fish.full_harbor_unlock");
    expect(supportFaqById("refunds")?.title).toBe("Refunds");
    expect(knownIssueById("corrupt_latest_slot")?.severity).toBe("warn");
  });

  it("support.html mirrors runbook restore/refund/contact sections", () => {
    const html = readFileSync(resolve(root, "web/public/support.html"), "utf8");
    expect(html).toContain('id="restore"');
    expect(html).toContain('id="refunds"');
    expect(html).toContain('id="known-issues"');
    expect(html).toContain(SUPPORT_EMAIL);
    expect(html).toContain("Restore purchases");
    expect(html).toContain("Payments &amp; subscriptions");
  });

  it("support:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-support-runbook.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK support:validate");
  });
});
