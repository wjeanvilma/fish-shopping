/** Phase 7 warehouse panel — mirrors game-core inventory/Warehouse.kt. */
import type { ContentPack, HarborDef } from "./content";
import { compareStrings } from "./foundations";
import type { Inventory } from "./inventory";
import type { GameState } from "./state";

export interface WarehouseLocationView {
  id: string;
  label: string;
  quantity: number;
  available: number;
  reserved: number;
}

export interface WarehouseLineView {
  itemId: string;
  name: string;
  quantity: number;
  available: number;
  reserved: number;
  locations: WarehouseLocationView[];
  reconcileOk: boolean;
}

export interface WarehouseView {
  lines: WarehouseLineView[];
  quantity: number;
  available: number;
  reserved: number;
  empty: boolean;
  reconcileOk: boolean;
  reconcileError: string | null;
}

type Acc = { quantity: number; reserved: number; locations: WarehouseLocationView[] };

export const Warehouse = {
  build(content: ContentPack, state: GameState, harbor: HarborDef): WarehouseView {
    const byItem = new Map<string, Acc>();

    const add = (inv: Inventory, locationId: string, label: string) => {
      for (const [item, qty] of inv.contents()) {
        const reserved = inv.reservedQuantity(item);
        let acc = byItem.get(item);
        if (!acc) {
          acc = { quantity: 0, reserved: 0, locations: [] };
          byItem.set(item, acc);
        }
        acc.quantity += qty;
        acc.reserved += reserved;
        acc.locations.push({
          id: locationId,
          label,
          quantity: qty,
          available: qty - reserved,
          reserved,
        });
      }
    };

    add(state.player.bag, state.player.bag.id, "Bag");
    for (const m of [...state.machines].sort((a, b) => compareStrings(a.stationId, b.stationId))) {
      const machineName = content.machinesById.get(m.machineId)?.name ?? m.machineId;
      add(m.input, m.input.id, `${machineName} in`);
      add(m.output, m.output.id, `${machineName} out`);
    }
    for (const c of [...state.counters].sort((a, b) => compareStrings(a.counterId, b.counterId))) {
      const def = harbor.counters.find((d) => d.id === c.counterId);
      const label = (def?.kind ?? "retail") === "wholesale" ? "Wholesale" : "Retail counter";
      add(c.stock, c.stock.id, label);
    }
    for (const w of [...state.workers].sort((a, b) => compareStrings(a.id, b.id))) {
      const role = content.workersById.get(w.roleId)?.name ?? w.roleId;
      add(w.bag, w.bag.id, `${role} bag`);
    }

    const itemIds = [...byItem.keys()].sort(compareStrings);
    const lines: WarehouseLineView[] = itemIds.map((itemId) => {
      const acc = byItem.get(itemId)!;
      const locQty = acc.locations.reduce((n, l) => n + l.quantity, 0);
      const locReserved = acc.locations.reduce((n, l) => n + l.reserved, 0);
      return {
        itemId,
        name: content.itemName(itemId),
        quantity: acc.quantity,
        available: acc.quantity - acc.reserved,
        reserved: acc.reserved,
        locations: acc.locations,
        reconcileOk: locQty === acc.quantity && locReserved === acc.reserved,
      };
    });

    const invProblems: string[] = [
      ...state.player.bag.invariantProblems(),
      ...state.machines.flatMap((m) => [...m.input.invariantProblems(), ...m.output.invariantProblems()]),
      ...state.counters.flatMap((c) => c.stock.invariantProblems()),
      ...state.workers.flatMap((w) => w.bag.invariantProblems()),
    ];
    const lineErrors = lines.filter((l) => !l.reconcileOk).map((l) => `${l.itemId}: location totals mismatch`);
    const allErrors = [...invProblems, ...lineErrors];
    const quantity = lines.reduce((n, l) => n + l.quantity, 0);
    const reserved = lines.reduce((n, l) => n + l.reserved, 0);
    return {
      lines,
      quantity,
      available: quantity - reserved,
      reserved,
      empty: lines.length === 0,
      reconcileOk: allErrors.length === 0,
      reconcileError: allErrors[0] ?? null,
    };
  },
};
