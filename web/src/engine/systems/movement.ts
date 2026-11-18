/**
 * Extracted Finish 4.0 Phase 2 — movement + inventory transfers.
 */
import { rectContains } from "../content";
import { INPUT_SCALE, SafeMath, idiv } from "../foundations";
import { Inventory, Transfers } from "../inventory";
import { Stats } from "../state";
import { StepContext, isOpen } from "./context";
import { systemsBridge } from "./bridge";

export const MovementSystem = {
  step(ctx: StepContext): void {
    const p = ctx.state.player;
    let ix = p.inputX;
    let iz = p.inputZ;
    const len = SafeMath.isqrt(ix * ix + iz * iz);
    if (len === 0) return;
    if (len > INPUT_SCALE) {
      ix = idiv(ix * INPUT_SCALE, len);
      iz = idiv(iz * INPUT_SCALE, len);
    }
    const speed = ctx.content.player.moveSpeedMmPerTick;
    const dx = idiv(ix * speed, INPUT_SCALE);
    const dz = idiv(iz * speed, INPUT_SCALE);
    p.facingX = ix;
    p.facingZ = iz;
    const h = ctx.harbor;
    if (isOpen(h, p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; }
    else if (isOpen(h, p.x + dx, p.z)) p.x += dx;
    else if (isOpen(h, p.x, p.z + dz)) p.z += dz;
  },

  updateZone(ctx: StepContext): void {
    const p = ctx.state.player;
    const zone = ctx.harbor.zones.find((z) => rectContains(z, p.x, p.z))?.id ?? null;
    if (zone !== p.zoneId) {
      p.zoneId = zone;
      p.transferCooldown = 0;
      ctx.emit({ type: "zone_entered", tick: ctx.state.tick, zoneId: zone });
    }
  },
};

export const TransferSystem = {
  step(ctx: StepContext): void {
    const s = ctx.state;
    const p = s.player;
    if (p.transferCooldown > 0) {
      p.transferCooldown--;
      return;
    }
    const zone = p.zoneId ? ctx.harbor.zones.find((z) => z.id === p.zoneId) : undefined;
    if (!zone) return;
    let moved = false;
    const transferred = (from: Inventory, to: Inventory, item: string | null, stat: string) => {
      if (item === null) return;
      s.bumpStat(stat);
      ctx.emit({ type: "items_transferred", tick: s.tick, from: from.id, to: to.id, itemId: item, count: 1 });
      moved = true;
    };
    switch (zone.kind) {
      case "machine_input": {
        const station = ctx.harbor.stations.find((st) => st.inputZone === zone.id)!;
        if (!systemsBridge.productionIsUnlocked(station, s)) break;
        const m = s.machines.find((mm) => mm.stationId === station.id)!;
        const accepted = new Set(ctx.content.machinesById.get(m.machineId)!.recipes
          .flatMap((rid) => ctx.content.recipesById.get(rid)!.inputs.map((iq) => iq.item)));
        transferred(p.bag, m.input, Transfers.moveFirstAccepted(p.bag, m.input, (it) => accepted.has(it)), Stats.MACHINE_INPUTS);
        break;
      }
      case "machine_output": {
        const station = ctx.harbor.stations.find((st) => st.outputZone === zone.id)!;
        if (!systemsBridge.productionIsUnlocked(station, s)) break;
        const m = s.machines.find((mm) => mm.stationId === station.id)!;
        transferred(m.output, p.bag, Transfers.moveFirstAccepted(m.output, p.bag, () => true), Stats.OUTPUTS_COLLECTED);
        break;
      }
      case "counter": {
        const counter = s.counters.find((c) => ctx.harbor.counters.find((d) => d.id === c.counterId)!.zone === zone.id)!;
        const def = ctx.harbor.counters.find((d) => d.id === counter.counterId)!;
        if (!systemsBridge.customerIsUnlocked(def, s)) break;
        transferred(p.bag, counter.stock, Transfers.moveFirstAccepted(p.bag, counter.stock, (it) => def.products.includes(it)), Stats.COUNTER_STOCKED);
        break;
      }
      case "fishing":
      case "kiosk":
      case "plot":
        break;
    }
    if (moved) p.transferCooldown = ctx.content.player.transferIntervalTicks - 1;
  },
};

