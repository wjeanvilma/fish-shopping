/**
 * Finish 2.0 Phase 25 — web checkout API ship catalog
 * (mirrors shared/ship/web-checkout-api.json).
 */
import catalogJson from "../../../shared/ship/web-checkout-api.json";

export interface WebCheckoutApiShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  checkoutApiMarker: string;
  contractCatalog: string;
  productsCatalog: string;
  entitlementsCatalog: string;
  moduleRoot: string;
  localEmulatorDefaultBase: string;
  clientEnvKey: string;
  forceStubEnvKey: string;
  routeCount: number;
  skuFloor: number;
  parityFixture: string;
  validateScript: string;
}

export const WEB_CHECKOUT_API = catalogJson as unknown as WebCheckoutApiShipCatalog;
export const WEB_CHECKOUT_API_PHASE = WEB_CHECKOUT_API.phase;
export const WEB_CHECKOUT_API_SCHEMA = WEB_CHECKOUT_API.schema;
export const WEB_CHECKOUT_API_MARKER = WEB_CHECKOUT_API.checkoutApiMarker;
export const CHECKOUT_API_ROUTE_FLOOR = WEB_CHECKOUT_API.routeCount;
export const CHECKOUT_API_SKU_FLOOR = WEB_CHECKOUT_API.skuFloor;
export const CHECKOUT_API_LOCAL_BASE = WEB_CHECKOUT_API.localEmulatorDefaultBase;
export const CHECKOUT_API_CLIENT_ENV = WEB_CHECKOUT_API.clientEnvKey;
