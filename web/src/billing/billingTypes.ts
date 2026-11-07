/** Shared entitlement billing types (Android/web parity). */

export interface EntitlementRecord {
  sku: string;
  purchaseToken: string;
  /** Optional cloud / guest account association for recovery. */
  cloudAccountId: string | null;
  purchasedAtEpochMs: number;
}

export type PurchaseOutcome =
  | { ok: true; purchaseToken: string; alreadyOwned: boolean }
  | { ok: false; reason: string };

export interface RestoredEntitlement {
  sku: string;
  purchaseToken: string;
  grantsCosmetic: string | null;
}

export interface EntitlementBilling {
  readonly kind: "stub" | "memory" | "web";
  purchaseFullUnlock(cloudAccountId: string | null): Promise<PurchaseOutcome>;
  purchaseCosmetic(sku: string, cloudAccountId: string | null): Promise<PurchaseOutcome>;
  restore(cloudAccountId: string | null): Promise<{ owned: boolean; purchaseToken: string | null }>;
  restoreAll(cloudAccountId: string | null): Promise<RestoredEntitlement[]>;
  owned(): boolean;
  ownedCosmetic(sku: string): boolean;
  purchaseToken(): string | null;
  purchaseTokenForSku(sku: string): string | null;
}
