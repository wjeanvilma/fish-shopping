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
  isOcclusionFadeName,
  machineOperatePulses,
  occlusionOpacity,
  OCCLUSION_FAR_M,
  OCCLUSION_NEAR_M,
  pickLocomotionClip,
  PlayerSmoother,
  resolveCelebrateBurst,
  resolveMachineDoneBurst,
  resolvePayBurst,
  VFX_BURST_POOL,
  WALK_SPEED_REF_M_PER_S,
  WorkerCrowd,
  WorldBursts,
  worldBurstPoolForQuality,
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
    expect(walk.pose.clip).toBe("walk");
    expect(walk.pose.speed01).toBeGreaterThan(0.5);
    expect(walk.walkPhase).toBeGreaterThan(0);
    expect(walk.pose.bobY).toBeGreaterThanOrEqual(0);

    const idle = locomoteFromMotion(0, 0, 0, 0, 0, walk.walkPhase, 0, 0.1, true);
    expect(idle.pose.idle).toBe(true);
    expect(idle.pose.clip).toBe("idle");
    expect(idle.pose.speed01).toBe(0);
    expect(idle.idlePhase).toBeGreaterThan(0);
  });

  it("picks carry and cast clips from bag and fishing", () => {
    expect(pickLocomotionClip({ moving: true, carrying: true, casting: false })).toBe("carry");
    expect(pickLocomotionClip({ moving: false, carrying: false, casting: true })).toBe("cast");
    const carry = locomoteFromMotion(0, 0, 0.2, 0, 0, 0, 0, 0.1, false, { carrying: true });
    expect(carry.pose.clip).toBe("carry");
    expect(carry.pose.leanRad).toBeGreaterThan(0);
    const cast = locomoteFromMotion(0, 0, 0, 0, 0, 0, 0, 0.1, false, { casting: true, cast01: 0.6 });
    expect(cast.pose.clip).toBe("cast");
    expect(cast.pose.cast01).toBeCloseTo(0.6);
    expect(cast.pose.leanRad).toBeLessThan(0);
  });

  it("PlayerSmoother snaps without bob when reduced motion is on", () => {
    const smooth = new PlayerSmoother();
    const pose = smooth.update({ xMm: 2000, zMm: -1500, facingX: 0, facingZ: 1000, zoneId: null }, 0.05, true);
    expect(pose.x).toBe(2);
    expect(pose.z).toBe(-1.5);
    expect(pose.bobY).toBe(0);
    expect(pose.swayRad).toBe(0);
    expect(pose.leanRad).toBe(0);
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

  it("PlayerSmoother casts while fishingProgress is set", () => {
    const smooth = new PlayerSmoother();
    const pose = smooth.update(
      { xMm: 0, zMm: 0, facingX: 0, facingZ: 1000, zoneId: null },
      0.05,
      false,
      { bagUsedUnits: 0, fishingProgress: 0.4 },
    );
    expect(pose.clip).toBe("cast");
    expect(pose.cast01).toBeCloseTo(0.4);
  });
});

describe("WorkerCrowd", () => {
  it("draws on-shift workers and frees them when they leave the shift", () => {
    const sim = newSim();
    sim.state.completedQuests.add("quest.first_ten_sales");
    sim.state.coins = 500;
    const events = sim.step([{ type: "hire_worker", roleId: "worker.porter", requestId: "wc-hire" }]);
    expect(events.some((e) => e.type === "worker_hired")).toBe(true);
    expect(sim.state.workers.length).toBeGreaterThan(0);
    const crowd = new WorkerCrowd(4);
    let frame = crowd.update(buildView(sim), 0.016);
    expect(frame.filter(Boolean).length).toBeGreaterThan(0);
    for (const w of sim.state.workers) w.onShift = false;
    frame = crowd.update(buildView(sim), 0.016);
    expect(frame.every((m) => m === null)).toBe(true);
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
    expect(mid[0]!.yaw).toBeGreaterThan(0);
    expect(mid[0]!.scale).toBeGreaterThan(1);
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

describe("Phase 16 world VFX", () => {
  it("pulses Footprint sockets while a station is PROCESSING", () => {
    const sim = newSim();
    const v = buildView(sim);
    const pulses = machineOperatePulses({
      ...v,
      stations: v.stations.map((s, i) =>
        i === 0 ? { ...s, status: "PROCESSING", progress: 0.4 } : s,
      ),
    }, 0.2);
    expect(pulses).toHaveLength(1);
    expect(pulses[0]!.footprintName).toMatch(/^Footprint_/);
    expect(pulses[0]!.pulse01).toBeGreaterThan(0);
    expect(pulses[0]!.pulse01).toBeLessThanOrEqual(1);
  });

  it("resolves pay / machine_done / celebrate burst anchors", () => {
    const sim = newSim();
    const v = buildView(sim);
    const pay = resolvePayBurst(v, "missing");
    expect(pay.kind).toBe("pay");
    expect(pay.xMm).toBeDefined();
    const done = resolveMachineDoneBurst(v, "station.cutter_1");
    expect(done).not.toBeNull();
    expect(done!.kind).toBe("machine_done");
    const celeb = resolveCelebrateBurst(v);
    expect(celeb.kind).toBe("celebrate");
    expect(celeb.xMm).toBe(v.player.xMm);
  });

  it("honors world-burst quality budgets", () => {
    expect(worldBurstPoolForQuality("low")).toBe(2);
    expect(worldBurstPoolForQuality("high")).toBe(VFX_BURST_POOL);
    const bursts = new WorldBursts(8);
    bursts.setBudget(worldBurstPoolForQuality("low"));
    const cue = { xMm: 0, zMm: 0, kind: "pay" as const };
    expect(bursts.spawn(cue)).toBe(true);
    expect(bursts.spawn(cue)).toBe(true);
    expect(bursts.spawn(cue)).toBe(false);
    const mid = bursts.update(0.2);
    expect(mid.filter(Boolean).length).toBeGreaterThan(0);
  });
});

describe("occlusion fade (Phase 31)", () => {
  it("fades Zone pads between near and far distances", () => {
    expect(isOcclusionFadeName("Zone_pier_end")).toBe(true);
    expect(isOcclusionFadeName("Player")).toBe(false);
    expect(occlusionOpacity(0)).toBe(1);
    expect(occlusionOpacity(OCCLUSION_NEAR_M)).toBe(1);
    expect(occlusionOpacity(OCCLUSION_FAR_M)).toBe(0);
    expect(occlusionOpacity((OCCLUSION_NEAR_M + OCCLUSION_FAR_M) / 2)).toBeCloseTo(0.5, 5);
  });
});
