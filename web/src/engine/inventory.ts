/** Authoritative containers and the transfer rule. Mirrors game-core inventory/. */
import { sortedKeys } from "./foundations";

export class Inventory {
  private readonly quantities = new Map<string, number>();
  private readonly reserved = new Map<string, number>();

  constructor(
    readonly id: string,
    public capacityUnits: number,
    private readonly unitsOf: (item: string) => number,
  ) {}

  quantity(item: string): number { return this.quantities.get(item) ?? 0; }
  reservedQuantity(item: string): number { return this.reserved.get(item) ?? 0; }
  available(item: string): number { return this.quantity(item) - this.reservedQuantity(item); }

  usedUnits(): number {
    let u = 0;
    for (const [item, q] of this.quantities) u += this.unitsOf(item) * q;
    return u;
  }
  freeUnits(): number { return Math.max(0, this.capacityUnits - this.usedUnits()); }
  isEmpty(): boolean { return this.quantities.size === 0; }

  /** Non-zero quantities in stable (sorted) order. */
  contents(): [string, number][] { return sortedKeys(this.quantities).map((k) => [k, this.quantities.get(k)!]); }
  reservations(): [string, number][] { return sortedKeys(this.reserved).map((k) => [k, this.reserved.get(k)!]); }

  roomFor(item: string): number { return Math.floor(this.freeUnits() / this.unitsOf(item)); }
  canAdd(item: string, count: number): boolean { return count <= this.roomFor(item); }

  add(item: string, count: number): void {
    if (count < 0) throw new RangeError("negative add");
    if (count === 0) return;
    if (!this.canAdd(item, count)) throw new Error(`${this.id}: no room for ${count} x ${item}`);
    this.quantities.set(item, this.quantity(item) + count);
  }

  remove(item: string, count: number): void {
    if (count < 0) throw new RangeError("negative remove");
    if (count === 0) return;
    if (this.available(item) < count) throw new Error(`${this.id}: only ${this.available(item)} unreserved ${item}, tried to remove ${count}`);
    this.setQuantity(item, this.quantity(item) - count);
  }

  reserve(item: string, count: number): boolean {
    if (count <= 0 || this.available(item) < count) return false;
    this.reserved.set(item, this.reservedQuantity(item) + count);
    return true;
  }

  releaseReservation(item: string, count: number): void {
    const r = this.reservedQuantity(item);
    if (count < 0 || count > r) throw new Error(`${this.id}: releasing ${count} of ${r} reserved ${item}`);
    if (r - count === 0) this.reserved.delete(item);
    else this.reserved.set(item, r - count);
  }

  takeReserved(item: string, count: number): void {
    this.releaseReservation(item, count);
    this.setQuantity(item, this.quantity(item) - count);
  }

  private setQuantity(item: string, q: number): void {
    if (q < 0) throw new Error(`${this.id}: negative quantity for ${item}`);
    if (q === 0) this.quantities.delete(item);
    else this.quantities.set(item, q);
  }

  restore(q: Record<string, number>, r: Record<string, number>): void {
    this.quantities.clear();
    this.reserved.clear();
    for (const [k, v] of Object.entries(q)) if (v > 0) this.quantities.set(k, v);
    for (const [k, v] of Object.entries(r)) if (v > 0) this.reserved.set(k, v);
  }

  invariantProblems(): string[] {
    const p: string[] = [];
    for (const [k, v] of this.quantities) if (v < 0) p.push(`${this.id}: negative ${k}`);
    for (const [k, v] of this.reserved) if (v > this.quantity(k)) p.push(`${this.id}: reserved ${v} of ${this.quantity(k)} ${k}`);
    if (this.usedUnits() > this.capacityUnits) p.push(`${this.id}: ${this.usedUnits()} units over capacity ${this.capacityUnits}`);
    return p;
  }
}

export const Transfers = {
  /** Moves min(source available, destination room, requested) of one item; 0 when rejected. */
  move(source: Inventory, destination: Inventory, item: string, requested: number, accepts: (item: string) => boolean = () => true): number {
    if (requested <= 0 || !accepts(item)) return 0;
    const count = Math.min(source.available(item), destination.roomFor(item), requested);
    if (count <= 0) return 0;
    source.remove(item, count);
    destination.add(item, count);
    return count;
  },

  /** Moves one item of the first acceptable type in [source] (sorted order). */
  moveFirstAccepted(source: Inventory, destination: Inventory, accepts: (item: string) => boolean): string | null {
    for (const [item] of source.contents()) {
      if (Transfers.move(source, destination, item, 1, accepts) === 1) return item;
    }
    return null;
  },
};
