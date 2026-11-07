/**
 * Phase 3 (post-1.0) — crash-safe pending entitlement grants (localStorage).
 */
import { EntitlementReconcilePath, requestIdFor, type StoreOwned } from "./entitlementReconcile";

interface PendingRow {
  sku: string;
  purchaseToken: string;
  grantsCosmetic: string | null;
  enqueuedAtEpochMs: number;
}

function load(): PendingRow[] {
  try {
    const raw = localStorage.getItem(EntitlementReconcilePath.WEB_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(rows: PendingRow[]): void {
  try {
    localStorage.setItem(EntitlementReconcilePath.WEB_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // private mode / quota
  }
}

export class PendingEntitlementLedger {
  all(): StoreOwned[] {
    return load().map((r) => ({
      sku: r.sku,
      purchaseToken: r.purchaseToken,
      grantsCosmetic: r.grantsCosmetic,
    }));
  }

  enqueue(sku: string, purchaseToken: string, grantsCosmetic: string | null): void {
    const rows = load();
    const idx = rows.findIndex((r) => r.sku === sku);
    const row: PendingRow = {
      sku,
      purchaseToken,
      grantsCosmetic,
      enqueuedAtEpochMs: Date.now(),
    };
    if (idx >= 0) rows[idx] = row;
    else rows.push(row);
    save(rows);
  }

  ackRequestIds(satisfied: Set<string>): void {
    if (satisfied.size === 0) return;
    const kept = load().filter((row) => {
      const id = requestIdFor({
        sku: row.sku,
        purchaseToken: row.purchaseToken,
        grantsCosmetic: row.grantsCosmetic,
      });
      return !satisfied.has(id);
    });
    save(kept);
  }

  clear(): void {
    try {
      localStorage.removeItem(EntitlementReconcilePath.WEB_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
