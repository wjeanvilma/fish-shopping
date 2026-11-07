/**
 * Finish 2.0 Phase 25 — in-memory entitlement + checkout session store (local emulator).
 */
import { randomUUID } from "node:crypto";

export interface OwnedEntitlement {
  webProductId: string;
  purchaseToken: string;
  cloudAccountId: string | null;
}

export interface CheckoutSession {
  sessionId: string;
  webProductId: string;
  cloudAccountId: string | null;
  successUrl: string;
  cancelUrl: string;
  fulfilled: boolean;
}

function accountKey(cloudAccountId: string | null): string {
  return cloudAccountId && cloudAccountId.length > 0 ? cloudAccountId : "__guest__";
}

export class CheckoutStore {
  private readonly byAccount = new Map<string, Map<string, OwnedEntitlement>>();
  private readonly sessions = new Map<string, CheckoutSession>();

  list(cloudAccountId: string | null): OwnedEntitlement[] {
    const bag = this.byAccount.get(accountKey(cloudAccountId));
    return bag ? [...bag.values()] : [];
  }

  getOwned(cloudAccountId: string | null, webProductId: string): OwnedEntitlement | null {
    return this.byAccount.get(accountKey(cloudAccountId))?.get(webProductId) ?? null;
  }

  grant(
    cloudAccountId: string | null,
    webProductId: string,
    purchaseToken?: string,
  ): OwnedEntitlement {
    const key = accountKey(cloudAccountId);
    let bag = this.byAccount.get(key);
    if (!bag) {
      bag = new Map();
      this.byAccount.set(key, bag);
    }
    const existing = bag.get(webProductId);
    if (existing) return existing;
    const row: OwnedEntitlement = {
      webProductId,
      purchaseToken: purchaseToken ?? `stub-${webProductId}-${randomUUID()}`,
      cloudAccountId,
    };
    bag.set(webProductId, row);
    return row;
  }

  createSession(
    webProductId: string,
    cloudAccountId: string | null,
    successUrl: string,
    cancelUrl: string,
  ): CheckoutSession {
    const sessionId = `sess_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const session: CheckoutSession = {
      sessionId,
      webProductId,
      cloudAccountId,
      successUrl,
      cancelUrl,
      fulfilled: false,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): CheckoutSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  fulfillSession(sessionId: string, cloudAccountId: string | null): OwnedEntitlement[] {
    const session = this.sessions.get(sessionId);
    if (!session) return this.list(cloudAccountId);
    const account = cloudAccountId ?? session.cloudAccountId;
    if (!session.fulfilled) {
      this.grant(account, session.webProductId);
      session.fulfilled = true;
      session.cloudAccountId = account;
    }
    return this.list(account);
  }

  /** Test helper — wipe all state. */
  clear(): void {
    this.byAccount.clear();
    this.sessions.clear();
  }
}

export const sharedStore = new CheckoutStore();
