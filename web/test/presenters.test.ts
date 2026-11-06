import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GameState, Simulation, buildView, loadContent } from "../src/engine";
import { CameraRig } from "../src/game/cameraRig";
import { stickFromTapTarget } from "../src/presenters/tapToMove";
import {
  CustomerCrowd,
  crowdDrawCapForQuality,
  FLYING_TRANSFER_DURATION_S,
  FLYING_TRANSFER_POOL,
  flyingTransferPoolForQuality,
  FlyingTransfers,
  IDLE_SPEED_M_PER_S,
  PlayerSmoother,
  WALK_SPEED_REF_M_PER_S,
  locomoteFromMotion,
  resolveFlyingTransfer,
  stackVisibility,
} from "../src/render/presenters";

const content = loadContent(JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")));
const newSim = () => new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 7));

describe("stackVisibility", () => {
  it("shows one slot per unit, with the right kind, in bag order", () => {
    const sim = newSim();
    sim.state.player.bag.add("product.basic_portion", 2);
    sim.state.player.bag.add("species.silver_sprat", 1);
    sim.state.machines[0]!.input.add("species.silver_sprat", 3);
    sim.state.counters[0]!.stock.add("product.basic_portion", 1);
    const names = ["Bag_0_portion", "Bag_1_portion", "Bag_2_fish", "Bag_2_portion", "Bag_3_fish",
      "In_cutter_1_2", "In_cutter_1_3", "Out_cutter_1_0", "Stock_portions_1_0", "Stock_portions_1_1"];
    const shown = Object.fromEntries(stackVisibility(buildView(sim), names));
    expect(shown).toEqual({
      Bag_0_portion: true, Bag_1_portion: true, Bag_2_fish: true, Bag_2_portion: false, Bag_3_fish: false,
      In_cutter_1_2: true, In_cutter_1_3: false, Out_cutter_1_0: false,
      Stock_portions_1_0: true, Stock_portions_1_1: false,
    });
  });
});

describe("CustomerCrowd", () => {
  it("walks departing customers back to the entry, then frees the model", () => {
    const sim = newSim();
    sim.run(160 + 120); // one customer spawned and arrived
    const crowd = new CustomerCrowd(3);
    let frame = crowd.update(buildView(sim), 0.016);
    expect(frame.filter(Boolean)).toHaveLength(1);
    sim.state.customers.splice(0); // customer leaves the simulation
    const v = buildView(sim);
    frame = crowd.update(v, 0.016);
    expect(frame.filter(Boolean)).toHaveLength(1); // still visible, walking out
    for (let i = 0; i < 800 && frame.some(Boolean); i++) frame = crowd.update(v, 0.05);
    expect(frame.every((m) => m === null)).toBe(true);
  });

  it("gives queued customers idle breath body language", () => {
    const sim = newSim();
    sim.run(160 + 120);
    const crowd = new CustomerCrowd(3);
    let pose = crowd.update(buildView(sim), 0.05)[0]!;
    for (let i = 0; i < 40; i++) pose = crowd.update(buildView(sim), 0.05)[0]!;
    expect(pose.idle).toBe(true);
    expect(Math.abs(pose.bobY)).toBeGreaterThan(0);
  });
});

describe("locomotion", () => {
  it("advances walk phase while moving and breathes while idle", () => {
    const walk = locomoteFromMotion(0, 0, WALK_SPEED_REF_M_PER_S * 0.1, 0, 0, 0, 0, 0.1);
    expect(walk.pose.idle).toBe(false);
    expect(walk.pose.speed01).toBeGreaterThan(0.5);
    expect(walk.walkPhase).toBeGreaterThan(0);
    expect(walk.pose.bobY).toBeGreaterThanOrEqual(0);

    const idle = locomoteFromMotion(0, 0, 0, 0, 0, walk.walkPhase, 0, 0.1, true);
    expect(idle.pose.idle).toBe(true);
    expect(idle.pose.speed01).toBe(0);
    expect(idle.idlePhase).toBeGreaterThan(0);
  });

  it("PlayerSmoother eases toward the sim and settles idle", () => {
    const smooth = new PlayerSmoother();
    const first = smooth.update({ xMm: 0, zMm: 0, facingX: 0, facingZ: 1000, zoneId: null }, 0);
    expect(first.x).toBe(0);
    expect(first.idle).toBe(true);
    // Chase a moving target so walk language stays active mid-pursuit.
    let pose = first;
    let sawWalk = false;
    for (let i = 1; i <= 20; i++) {
      pose = smooth.update({ xMm: i * 400, zMm: 0, facingX: 1000, facingZ: 0, zoneId: null }, 0.05);
      if (!pose.idle && pose.speed01 > IDLE_SPEED_M_PER_S / WALK_SPEED_REF_M_PER_S) sawWalk = true;
    }
    expect(pose.x).toBeGreaterThan(1);
    expect(sawWalk).toBe(true);
    const settledAt = pose.x * 1000;
    for (let i = 0; i < 60; i++) {
      pose = smooth.update({ xMm: settledAt, zMm: 0, facingX: 1000, facingZ: 0, zoneId: null }, 0.05);
    }
    expect(pose.idle).toBe(true);
  });
});

describe("tap-to-move", () => {
  it("stickPointsTowardTarget_andClearsOnArrival", () => {
    const far = stickFromTapTarget(0, 0, { xMm: 5000, zMm: 0 });
    expect(far).not.toBeNull();
    expect(far!.sx).toBeCloseTo(-1, 2);
    expect(far!.sy).toBeCloseTo(0, 2);
    expect(stickFromTapTarget(0, 0, { xMm: 100, zMm: 0 })).toBeNull();
    expect(stickFromTapTarget(0, 0, null)).toBeNull();
  });

  it("groundFromNdc_rightMapsTowardNegativeX", () => {
    const center = CameraRig.groundFromNdc(0, 0, 16 / 9, 0, 0)!;
    const right = CameraRig.groundFromNdc(0.4, 0, 16 / 9, 0, 0)!;
    expect(right.xMm).toBeLessThan(center.xMm);
  });

  it("screenToWorld_inverseMatchesStickMapping", () => {
    const stick = stickFromTapTarget(0, 0, { xMm: 0, zMm: 8000 })!;
    const [wx, wz] = CameraRig.screenToWorld(stick.sx, stick.sy);
    expect(wx).toBeCloseTo(0, 2);
    expect(wz).toBeGreaterThan(0.9);
    expect(Math.hypot(wx, wz)).toBeCloseTo(1, 2);
  });
});

describe("FlyingTransfers", () => {
  it("resolves bag ↔ pad anchors from the view and arcs until expiry", () => {
    const sim = newSim();
    const v = buildView(sim);
    expect(v.transferAnchors.some((a) => a.inventoryId === "inv.player_bag")).toBe(true);
    expect(v.transferAnchors.some((a) => a.inventoryId === "inv.station.cutter_1.input")).toBe(true);
    expect(v.transferAnchors.some((a) => a.inventoryId === "inv.counter.portions_1")).toBe(true);

    const cue = resolveFlyingTransfer(
      v,
      "inv.player_bag",
      "inv.station.cutter_1.input",
      "species.silver_sprat",
    );
    expect(cue).not.toBeNull();
    expect(cue!.itemId).toBe("species.silver_sprat");

    const flies = new FlyingTransfers(4);
    expect(flies.spawn(cue!)).toBe(true);
    const mid = flies.update(FLYING_TRANSFER_DURATION_S / 2);
    expect(mid.filter(Boolean)).toHaveLength(1);
    expect(mid[0]!.kind).toBe("fish");
    expect(mid[0]!.y).toBeGreaterThan(0.25);
    const done = flies.update(FLYING_TRANSFER_DURATION_S);
    expect(done.every((p) => p === null)).toBe(true);
  });

  it("drops cues when the pool is full", () => {
    const flies = new FlyingTransfers(1);
    const cue = {
      fromXMm: 0, fromZMm: 0, toXMm: 1000, toZMm: 0, itemId: "product.basic_portion",
    };
    expect(flies.spawn(cue)).toBe(true);
    expect(flies.spawn(cue)).toBe(false);
    const frame = flies.update(0.01);
    expect(frame[0]!.kind).toBe("portion");
  });

  it("honors quality VFX budgets (Phase 29)", () => {
    expect(flyingTransferPoolForQuality("low")).toBe(4);
    expect(flyingTransferPoolForQuality("medium")).toBe(8);
    expect(flyingTransferPoolForQuality("high")).toBe(FLYING_TRANSFER_POOL);
    const flies = new FlyingTransfers(12);
    flies.setBudget(flyingTransferPoolForQuality("low"));
    const cue = {
      fromXMm: 0, fromZMm: 0, toXMm: 1000, toZMm: 0, itemId: "species.silver_sprat",
    };
    for (let i = 0; i < 4; i++) expect(flies.spawn(cue)).toBe(true);
    expect(flies.spawn(cue)).toBe(false);
  });
});

describe("CustomerCrowd quality draw cap", () => {
  it("clamps draw slots by quality without growing the GLB pool", () => {
    expect(crowdDrawCapForQuality("low", 6)).toBe(3);
    expect(crowdDrawCapForQuality("high", 6)).toBe(6);
    const crowd = new CustomerCrowd(6);
    crowd.setDrawCap(crowdDrawCapForQuality("low", 6));
    expect(crowd.poolSize).toBe(6);
  });
});
