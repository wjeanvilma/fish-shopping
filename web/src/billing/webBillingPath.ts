/**
 * Phase 2 (post-1.0) — web billing production path catalog.
 * Mirrors shared/billing/web-billing.json.
 */
import webBilling from "../../../shared/billing/web-billing.json";

export const WebBillingPath = {
  PHASE: webBilling.phase as number,
  SCHEMA: webBilling.schema as string,
  PROVIDER: webBilling.provider as string,
  LOCAL_BACKEND: webBilling.localBackend as string,
  PRODUCTION_BACKEND: webBilling.productionBackend as string,
  FORCE_STUB_ENV: webBilling.forceStubEnv as string,
  ENV_KEYS: (webBilling.envKeys as Array<{ name: string; required: boolean }>).map((k) => k.name),
  REQUIRED_ENV_KEYS: (webBilling.envKeys as Array<{ name: string; required: boolean }>)
    .filter((k) => k.required)
    .map((k) => k.name),
  CHECKOUT_PATH: webBilling.api.checkout.path as string,
  ENTITLEMENTS_PATH: webBilling.api.entitlements.path as string,
  FULFILL_PATH: webBilling.api.fulfill.path as string,
};

export interface WebBillingEnv {
  apiBase: string | null;
  stripePublishableKey: string | null;
  forceStub: boolean;
  missing: string[];
}

export function readWebBillingEnv(env: Record<string, string | undefined> = {}): WebBillingEnv {
  const apiBase = env.VITE_BILLING_API_BASE?.trim().replace(/\/$/, "") || null;
  const stripePublishableKey = env.VITE_STRIPE_PUBLISHABLE_KEY?.trim() || null;
  const forceStub = (env.VITE_BILLING_FORCE_STUB ?? "").trim().toLowerCase() === "true";
  const missing: string[] = [];
  if (!apiBase) missing.push("VITE_BILLING_API_BASE");
  return { apiBase, stripePublishableKey, forceStub, missing };
}

export interface WebBillingReadiness {
  productionReady: boolean;
  missingKeys: string[];
  provider: string;
  localBackend: string;
  productionBackend: string;
}

export function webBillingReadiness(env: WebBillingEnv): WebBillingReadiness {
  const productionReady = !env.forceStub && !!env.apiBase;
  return {
    productionReady,
    missingKeys: productionReady ? [] : env.missing,
    provider: WebBillingPath.PROVIDER,
    localBackend: WebBillingPath.LOCAL_BACKEND,
    productionBackend: WebBillingPath.PRODUCTION_BACKEND,
  };
}
