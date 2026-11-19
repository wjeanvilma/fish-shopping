import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  measureStaffUnlock,
  STAFF_UNLOCK,
  STAFF_UNLOCK_MARKER,
  STAFF_UNLOCK_PHASE,
} from "../src/ship/staffUnlock";
import { STAFF_BRANCH_FLOOR } from "../src/ship/staffTrees";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Staff unlock (Finish 3.0 Phase 10)", () => {
  it("locks phase 10 catalog floors", () => {
    expect(STAFF_UNLOCK_PHASE).toBe(10);
    expect(STAFF_UNLOCK.hireableRoleCount).toBe(8);
    expect(STAFF_UNLOCK.staffBranchTarget).toBe(10);
    expect(STAFF_UNLOCK.newBranchIds).toHaveLength(5);
    expect(STAFF_UNLOCK_MARKER).toBe("authored-finish-3.0-phase-10");
    expect(STAFF_BRANCH_FLOOR).toBeGreaterThanOrEqual(10);
  });

  it("measures zero Coming soon and branches for all roles", () => {
    const m = measureStaffUnlock(root);
    expect(m.hireableRoleCount).toBe(8);
    expect(m.branchCount).toBeGreaterThanOrEqual(10);
    expect(m.newBranchesPresent).toBe(true);
    expect(m.rolesWithBranches).toBe(8);
    expect(m.comingSoonReasons).toBe(0);
    expect(m.gapClosed).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("staffunlock:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-staff-unlock.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK staffunlock:validate");
  }, 60_000);
});
