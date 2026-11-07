/**
 * Finish 2.0 Phase 25 — load active web checkout product ids from shared catalogs.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

export interface CheckoutProduct {
  webProductId: string;
  sku: string;
  androidProductId: string;
  status: string;
  type: string;
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

const productsJson = readJson(resolve(root, "shared/billing/web-checkout-products.json"));
const billingJson = readJson(resolve(root, "shared/billing/web-billing.json"));

export const CHECKOUT_PRODUCTS: CheckoutProduct[] = (productsJson.products as CheckoutProduct[]).filter(
  (p) => p.status === "active",
);

export const WEB_PRODUCT_IDS = new Set(CHECKOUT_PRODUCTS.map((p) => p.webProductId));

export const BILLING_API = billingJson.api as {
  checkout: { method: string; path: string };
  entitlements: { method: string; path: string };
  fulfill: { method: string; path: string };
};

export const DEFAULT_PORT = 8787;
export const REPO_ROOT = root;

export function isKnownProduct(webProductId: string): boolean {
  return WEB_PRODUCT_IDS.has(webProductId);
}
