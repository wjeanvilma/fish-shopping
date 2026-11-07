/**
 * Phase 2 (post-1.0) — injectable web store surface (checkout API / Stripe-backed).
 */
import { WebBillingCatalog } from "./webBillingCatalog";
import { WebBillingPath } from "./webBillingPath";

export interface WebOwnedPurchase {
  webProductId: string;
  purchaseToken: string;
}

export interface WebStoreBridge {
  ensureReady(): Promise<void>;
  purchase(webProductId: string, cloudAccountId: string | null): Promise<WebOwnedPurchase>;
  queryOwned(cloudAccountId: string | null): Promise<WebOwnedPurchase[]>;
  /** Complete a return from hosted checkout (`?billing=success&session_id=`). */
  fulfillReturn(sessionId: string, cloudAccountId: string | null): Promise<WebOwnedPurchase[]>;
}

type CheckoutResponse =
  | { status: "completed"; webProductId: string; purchaseToken: string }
  | { status: "owned"; webProductId: string; purchaseToken: string }
  | { status: "checkout"; url: string };

/**
 * HTTPS checkout API bridge. Redirects when the API returns a hosted Checkout URL.
 */
export class HttpWebStoreBridge implements WebStoreBridge {
  constructor(
    private readonly apiBase: string,
    private readonly redirect: (url: string) => void = (url) => {
      if (typeof window !== "undefined") {
        window.location.assign(url);
      }
    },
    private readonly locationHref: () => string = () =>
      (typeof window !== "undefined" ? window.location.href : "https://localhost/"),
  ) {}

  async ensureReady(): Promise<void> {
    if (!this.apiBase.startsWith("https://") && !this.apiBase.startsWith("http://localhost")) {
      throw new Error("Billing API base must be HTTPS (or localhost for sandbox)");
    }
  }

  async purchase(webProductId: string, cloudAccountId: string | null): Promise<WebOwnedPurchase> {
    await this.ensureReady();
    if (!WebBillingCatalog.BY_WEB_PRODUCT_ID.has(webProductId)) {
      throw new Error(`Unknown web product: ${webProductId}`);
    }
    const href = this.locationHref();
    const successUrl = appendQuery(href, { billing: "success" });
    const cancelUrl = appendQuery(href, { billing: "cancel" });
    const res = await fetch(`${this.apiBase}${WebBillingPath.CHECKOUT_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        webProductId,
        cloudAccountId,
        successUrl,
        cancelUrl,
      }),
    });
    if (!res.ok) {
      throw new Error(`Checkout failed (${res.status})`);
    }
    const body = (await res.json()) as CheckoutResponse;
    if (body.status === "checkout") {
      this.redirect(body.url);
      throw new Error("Redirecting to checkout…");
    }
    if (body.status === "completed" || body.status === "owned") {
      return { webProductId: body.webProductId, purchaseToken: body.purchaseToken };
    }
    throw new Error("Unexpected checkout response");
  }

  async queryOwned(cloudAccountId: string | null): Promise<WebOwnedPurchase[]> {
    await this.ensureReady();
    const url = new URL(`${this.apiBase}${WebBillingPath.ENTITLEMENTS_PATH}`);
    if (cloudAccountId) url.searchParams.set("cloudAccountId", cloudAccountId);
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Restore failed (${res.status})`);
    }
    const body = (await res.json()) as { entitlements?: WebOwnedPurchase[] };
    return (body.entitlements ?? []).filter((row) =>
      WebBillingCatalog.BY_WEB_PRODUCT_ID.has(row.webProductId),
    );
  }

  async fulfillReturn(sessionId: string, cloudAccountId: string | null): Promise<WebOwnedPurchase[]> {
    await this.ensureReady();
    const res = await fetch(`${this.apiBase}${WebBillingPath.FULFILL_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ sessionId, cloudAccountId }),
    });
    if (!res.ok) {
      throw new Error(`Fulfill failed (${res.status})`);
    }
    const body = (await res.json()) as { entitlements?: WebOwnedPurchase[] };
    return (body.entitlements ?? []).filter((row) =>
      WebBillingCatalog.BY_WEB_PRODUCT_ID.has(row.webProductId),
    );
  }
}

/** In-memory fake for vitest (sandbox without a checkout API). */
export class FakeWebStoreBridge implements WebStoreBridge {
  private readonly owned = new Map<string, WebOwnedPurchase>();
  failNextPurchase: string | null = null;
  ready = true;
  lastRedirectUrl: string | null = null;

  seed(webProductId: string, purchaseToken = `fake-${webProductId}`): void {
    this.owned.set(webProductId, { webProductId, purchaseToken });
  }

  async ensureReady(): Promise<void> {
    if (!this.ready) throw new Error("Billing unavailable");
  }

  async purchase(webProductId: string, _cloudAccountId: string | null): Promise<WebOwnedPurchase> {
    await this.ensureReady();
    if (this.failNextPurchase) {
      const reason = this.failNextPurchase;
      this.failNextPurchase = null;
      throw new Error(reason);
    }
    const existing = this.owned.get(webProductId);
    if (existing) return existing;
    if (!WebBillingCatalog.BY_WEB_PRODUCT_ID.has(webProductId)) {
      throw new Error(`Unknown web product: ${webProductId}`);
    }
    const row = { webProductId, purchaseToken: `web-${webProductId}-${this.owned.size}` };
    this.owned.set(webProductId, row);
    return row;
  }

  async queryOwned(_cloudAccountId: string | null): Promise<WebOwnedPurchase[]> {
    await this.ensureReady();
    return [...this.owned.values()];
  }

  async fulfillReturn(sessionId: string, _cloudAccountId: string | null): Promise<WebOwnedPurchase[]> {
    await this.ensureReady();
    // Sandbox: sessionId encodes product after "sess:"
    const productId = sessionId.startsWith("sess:") ? sessionId.slice(5) : null;
    if (!productId || !WebBillingCatalog.BY_WEB_PRODUCT_ID.has(productId)) {
      return [...this.owned.values()];
    }
    if (!this.owned.has(productId)) {
      this.seed(productId, `fulfilled-${productId}`);
    }
    return [...this.owned.values()];
  }
}

function appendQuery(href: string, params: Record<string, string>): string {
  try {
    const url = new URL(href);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    return url.toString();
  } catch {
    const q = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
    return href.includes("?") ? `${href}&${q}` : `${href}?${q}`;
  }
}
