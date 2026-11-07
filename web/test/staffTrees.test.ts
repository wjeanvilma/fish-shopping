import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GameState,
  Simulation,
  StaffTreesSystem,
  buildView,
  loadContent,
} from "../src/engine";
import {
  STAFF_BRANCH_FLOOR,
  STAFF_SCHEDULE_FLOOR,
  STAFF_TREES,
  STAFF_TREES_PHASE,
} from "../src/ship/staffTrees";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Staff trees (Finish 2.0 Phase 15)", () => {
  it("locks catalog floors", () => {
    expect(STAFF_TREES_PHASE).toBe(15);
    expect(STAFF_BRANCH_FLOOR).toBe(5);
    expect(STAFF_SCHEDULE_FLOOR).toBe(2);
    expect(content.staffTrees.branches.length).toBeGreaterThanOrEqual(5);
    expect(content.staffTrees.schedules.length).toBeGreaterThanOrEqual(2);
    expect((storeListing as { staffTreesPhase?: number }).staffTreesPhase).toBe(15);
    for (const id of STAFF_TREES.branches) {
      expect(content.staffBranchesById.has(id)).toBe(true);
    }
    for (const id of STAFF_TREES.schedules) {
      expect(content.staffSchedulesById.has(id)).toBe(true);
    }
  });

  it("trains branch, assigns schedule, exposes SimView", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-staff-trees.json"), "utf8"),
    );
    const sim = new Simulation(content, GameState.newGame(content, fx.harborId, fx.seed));
    sim.state.coins = 10_000;
    sim.state.completedQuests.add("quest.first_ten_sales");
    sim.step([{ type: "hire_worker", roleId: fx.roleId, requestId: "hire-staff-trees" }]);
    const worker = sim.state.workers.find((w) => w.roleId === fx.roleId)!;
    worker.level = fx.forceWorkerLevel;
    worker.xp = content.staffProgression.xpThresholds[worker.level - 1] ?? worker.xp;

    sim.step([{
      type: "train_worker_branch",
      workerId: worker.id,
      branchId: fx.branchId,
      requestId: "train-line-pro",
    }]);
    expect(worker.unlockedBranchIds).toContain(fx.branchId);
    expect(worker.activeBranchId).toBe(fx.branchId);
    expect(StaffTreesSystem.catchSpeedMultPermille(content, worker)).toBe(
      fx.expectAfterTrain.catchSpeedMultPermille,
    );

    sim.step([{ type: "select_worker_branch", workerId: worker.id, branchId: fx.branchId }]);
    sim.step([{ type: "set_worker_schedule", workerId: worker.id, scheduleId: fx.scheduleId }]);
    expect(worker.scheduleId).toBe(fx.scheduleId);

    const view = buildView(sim);
    const wv = view.workers.find((w) => w.id === worker.id)!;
    expect(wv.activeBranchId).toBe(fx.branchId);
    expect(wv.scheduleId).toBe(fx.scheduleId);
    expect(wv.branches.some((b) => b.id === fx.branchId && b.unlocked && b.active)).toBe(true);
    expect(wv.schedules.some((s) => s.id === fx.scheduleId && s.active)).toBe(true);
  });

  it("stafftrees:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-staff-trees.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK stafftrees:validate");
  }, 60_000);
});
