/** Immutable presentation snapshot for the HUD and renderer. Mirrors game-core sim/SimView.kt. */
import { queueSlot } from "./content";
import type { MachineStatus } from "./state";
import type { Simulation } from "./simulation";
import { FishingSystem, ProductionSystem, UpgradeSystem } from "./systems";

export interface ItemCount { itemId: string; name: string; count: number }
export interface ContextCard { title: string; lines: string[]; progress: number | null }
export interface StationView { stationId: string; status: MachineStatus; inputCount: number; outputCount: number; progress: number | null }
export interface CounterView { counterId: string; stock: number; capacityUnits: number; queue: number }
/** Presentation-only position: interpolated along the canonical walk, then the current queue slot. */
export interface CustomerView {
  id: string; counterId: string; queueIndex: number; xMm: number; zMm: number; arrived: boolean; wants: number; reserved: number;
}
export interface UpgradeView { id: string; name: string; description: string; cost: number; owned: boolean; purchasable: boolean; reason: string | null }

export interface SimView {
  tick: number;
  coins: number;
  harborName: string;
  player: { xMm: number; zMm: number; facingX: number; facingZ: number; zoneId: string | null };
  bag: ItemCount[];
  bagUsedUnits: number;
  bagCapacityUnits: number;
  fishingProgress: number | null;
  fishingTimingWindow: boolean;
  fishingCanReel: boolean;
  context: ContextCard | null;
  stations: StationView[];
  counters: CounterView[];
  customersWaiting: number;
  customers: CustomerView[];
  customerEntryXMm: number;
  customerEntryZMm: number;
  tutorialText: string | null;
  upgrades: UpgradeView[];
}

export function buildView(sim: Simulation): SimView {
  const s = sim.state;
  const c = sim.content;
  const h = sim.harbor;
  const p = s.player;
  const zone = p.zoneId ? h.zones.find((z) => z.id === p.zoneId) : undefined;

  const stations: StationView[] = s.machines.map((m) => ({
    stationId: m.stationId,
    status: m.status,
    inputCount: m.input.usedUnits(),
    outputCount: m.output.usedUnits(),
    progress: m.activeBatch ? 1 - m.activeBatch.remainingTicks / m.activeBatch.durationTicks : null,
  }));

  let context: ContextCard | null = null;
  if (zone?.kind === "fishing") {
    const spot = s.fishingSpots.find((f) => f.zoneId === zone.id)!;
    const full = p.bag.freeUnits() === 0;
    const casting = p.fishingSpecies !== null && p.fishingCatchTicks > 0;
    const inWindow = casting && FishingSystem.inTimingWindow(
      p.fishingProgress, p.fishingCatchTicks,
      c.player.timingWindowStartPermille, c.player.timingWindowEndPermille,
    );
    const lines = [
      full ? "Bag full - deliver your catch"
        : casting && inWindow && !p.reelAttemptedThisCast ? "Reel now for a bonus!"
          : "Fishing...",
      `Fish here: ${spot.stock}`,
    ];
    if (casting) lines.push(`Hooked: ${c.speciesById.get(p.fishingSpecies!)!.name}`);
    context = {
      title: "Fishing spot",
      lines,
      progress: casting ? p.fishingProgress / p.fishingCatchTicks : null,
    };
  } else if (zone?.kind === "machine_input" || zone?.kind === "machine_output") {
    const station = h.stations.find((st) => st.inputZone === zone.id || st.outputZone === zone.id)!;
    const m = s.machines.find((mm) => mm.stationId === station.id)!;
    context = {
      title: c.machinesById.get(m.machineId)!.name,
      lines: [
        ProductionSystem.statusText(m),
        `In: ${m.input.usedUnits()}/${m.input.capacityUnits}   Out: ${m.output.usedUnits()}/${m.output.capacityUnits}`,
      ],
      progress: stations.find((v) => v.stationId === station.id)!.progress,
    };
  } else if (zone?.kind === "counter") {
    const def = h.counters.find((d) => d.zone === zone.id)!;
    const counter = s.counters.find((ct) => ct.counterId === def.id)!;
    const queue = s.customers.filter((x) => x.counterId === def.id).length;
    const label = def.products.map((pid) => c.productsById.get(pid)!.name).join(" / ");
    context = {
      title: `${label} counter`,
      lines: [`Stock: ${counter.stock.usedUnits()}/${def.capacityUnits}`, `Queue: ${queue}`],
      progress: counter.checkoutProgress > 0 ? counter.checkoutProgress / def.checkoutTicks : null,
    };
  }

  return {
    tick: s.tick,
    coins: s.coins,
    harborName: h.name,
    player: { xMm: p.x, zMm: p.z, facingX: p.facingX, facingZ: p.facingZ, zoneId: p.zoneId },
    bag: p.bag.contents().map(([id, n]) => ({ itemId: id, name: c.itemName(id), count: n })),
    bagUsedUnits: p.bag.usedUnits(),
    bagCapacityUnits: p.bag.capacityUnits,
    fishingProgress: p.fishingSpecies
      ? p.fishingProgress / Math.max(1, p.fishingCatchTicks)
      : null,
    fishingTimingWindow: p.fishingSpecies !== null && p.fishingCatchTicks > 0 &&
      FishingSystem.inTimingWindow(
        p.fishingProgress, p.fishingCatchTicks,
        c.player.timingWindowStartPermille, c.player.timingWindowEndPermille,
      ),
    fishingCanReel: p.fishingSpecies !== null && !p.reelAttemptedThisCast,
    context,
    stations,
    counters: s.counters.map((ct) => ({
      counterId: ct.counterId,
      stock: ct.stock.usedUnits(),
      capacityUnits: ct.stock.capacityUnits,
      queue: s.customers.filter((x) => x.counterId === ct.counterId).length,
    })),
    customersWaiting: s.customers.length,
    customers: h.counters.flatMap((def) =>
      s.customers.filter((x) => x.counterId === def.id).map((x, index) => {
        const slot = queueSlot(def, index);
        const t = x.walkTicksTotal === 0 ? 1 : 1 - x.walkTicksLeft / x.walkTicksTotal;
        return {
          id: x.id, counterId: def.id, queueIndex: index,
          xMm: h.customerEntry.x + (slot.x - h.customerEntry.x) * t,
          zMm: h.customerEntry.z + (slot.z - h.customerEntry.z) * t,
          arrived: x.arrived, wants: x.wants, reserved: x.reserved,
        };
      })),
    customerEntryXMm: h.customerEntry.x,
    customerEntryZMm: h.customerEntry.z,
    tutorialText: c.tutorial[s.tutorialIndex]?.text ?? null,
    upgrades: c.upgrades.map((u) => {
      const a = UpgradeSystem.availability(c, s, u);
      return {
        id: u.id, name: u.name, description: u.description, cost: u.cost,
        owned: a.kind === "owned",
        purchasable: a.kind === "purchasable",
        reason: a.kind === "locked" ? a.reason : a.kind === "too_expensive" ? `Need ${a.missing} more coins` : null,
      };
    }),
  };
}
