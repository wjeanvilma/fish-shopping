/**
 * Finish 2.0 Phase 25 — web checkout API module readiness.
 *
 * Usage:
 *   npm run checkoutapi:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { WebBillingPath } from "../src/billing/webBillingPath";
import {
  CHECKOUT_API_CLIENT_ENV,
  CHECKOUT_API_LOCAL_BASE,
  CHECKOUT_API_ROUTE_FLOOR,
  CHECKOUT_API_SKU_FLOOR,
  WEB_CHECKOUT_API,
  WEB_CHECKOUT_API_MARKER,
  WEB_CHECKOUT_API_PHASE,
  WEB_CHECKOUT_API_SCHEMA,
} from "../src/ship/webCheckoutApi";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";
import {
  handleCheckout,
  handleEntitlements,
  handleFulfill,
} from "../../checkout-api/src/handlers";
import { CheckoutStore } from "../../checkout-api/src/store";
import { WEB_PRODUCT_IDS } from "../../checkout-api/src/catalog";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/web-checkout-api.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-web-checkout-api.json"));
  const billing = readJson(resolve(root, "shared/billing/web-billing.json"));
  const products = readJson(resolve(root, "shared/billing/web-checkout-products.json"));
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const webEnv = readFileSync(resolve(root, "web/.env.example"), "utf8");
  const apiEnv = readFileSync(resolve(root, "checkout-api/.env.example"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));

  if (catalog.phase !== 25) errors.push(`phase expected 25, got ${catalog.phase}`);
  if (catalog.schema !== WEB_CHECKOUT_API_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (WEB_CHECKOUT_API_PHASE !== 25) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.checkoutApiMarker !== WEB_CHECKOUT_API_MARKER) errors.push("marker mismatch");
  if (fixture.checkoutApiMarker !== WEB_CHECKOUT_API_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contractCatalog !== "shared/billing/web-billing.json") {
    errors.push("contractCatalog mismatch");
  }
  if (catalog.moduleRoot !== "checkout-api/") errors.push("moduleRoot must be checkout-api/");
  if (catalog.localEmulatorDefaultBase !== CHECKOUT_API_LOCAL_BASE) {
    errors.push("localEmulatorDefaultBase mirror mismatch");
  }
  if (catalog.clientEnvKey !== CHECKOUT_API_CLIENT_ENV) errors.push("clientEnvKey mismatch");
  if (catalog.routeCount !== 3 || CHECKOUT_API_ROUTE_FLOOR !== 3) {
    errors.push("routeCount must be 3");
  }
  if (catalog.skuFloor !== 4 || CHECKOUT_API_SKU_FLOOR !== 4) {
    errors.push("skuFloor must be 4");
  }

  // Contract routes vs web-billing.json + fixture
  const routes = fixture.expect.routes as Array<{
    id: string;
    method: string;
    path: string;
    responseStatuses?: string[];
    responseRoot?: string;
  }>;
  if (routes.length !== 3) errors.push(`fixture routes ${routes.length} !== 3`);
  const byId = Object.fromEntries(routes.map((r) => [r.id, r]));
  if (byId.checkout?.method !== billing.api.checkout.method || byId.checkout?.path !== billing.api.checkout.path) {
    errors.push("checkout route drift vs web-billing.json");
  }
  if (
    byId.entitlements?.method !== billing.api.entitlements.method ||
    byId.entitlements?.path !== billing.api.entitlements.path
  ) {
    errors.push("entitlements route drift vs web-billing.json");
  }
  if (byId.fulfill?.method !== billing.api.fulfill.method || byId.fulfill?.path !== billing.api.fulfill.path) {
    errors.push("fulfill route drift vs web-billing.json");
  }
  if (WebBillingPath.CHECKOUT_PATH !== "/v1/checkout") errors.push("WebBillingPath.CHECKOUT_PATH");
  if (WebBillingPath.ENTITLEMENTS_PATH !== "/v1/entitlements") errors.push("WebBillingPath.ENTITLEMENTS_PATH");
  if (WebBillingPath.FULFILL_PATH !== "/v1/fulfill") errors.push("WebBillingPath.FULFILL_PATH");

  const active = (products.products as Array<{ webProductId: string; status: string }>).filter(
    (p) => p.status === "active",
  );
  if (active.length < 4) errors.push(`active products ${active.length} < 4`);
  if (WEB_PRODUCT_IDS.size < 4) errors.push("catalog WEB_PRODUCT_IDS < 4");
  for (const id of fixture.expect.webProductIds as string[]) {
    if (!active.some((p) => p.webProductId === id)) errors.push(`products missing ${id}`);
    if (!WEB_PRODUCT_IDS.has(id)) errors.push(`runtime missing product ${id}`);
  }

  if (entitlements.webCheckoutApiModulePhase !== 25) {
    errors.push("entitlements.webCheckoutApiModulePhase must be 25");
  }
  if (entitlements.webBillingPhase !== 2) {
    errors.push("entitlements.webBillingPhase must stay 2 (post-1.0 client)");
  }

  // Handler contract smoke (in-memory)
  const store = new CheckoutStore();
  const instant = handleCheckout(
    { webProductId: "fish.full_harbor_unlock", cloudAccountId: null },
    { store, instant: true },
  );
  if ("error" in instant) {
    errors.push(`instant checkout error: ${instant.error}`);
  } else if (instant.status !== "completed") {
    errors.push(`instant expected completed, got ${instant.status}`);
  } else if (!instant.purchaseToken.startsWith("stub-")) {
    errors.push("purchaseToken must start with stub-");
  }

  const owned = handleCheckout(
    { webProductId: "fish.full_harbor_unlock", cloudAccountId: null },
    { store, instant: true },
  );
  if ("error" in owned || owned.status !== "owned") {
    errors.push("repeat checkout must return owned");
  }

  const listed = handleEntitlements(null, store);
  if (!listed.entitlements.some((e) => e.webProductId === "fish.full_harbor_unlock")) {
    errors.push("entitlements missing granted product");
  }

  const sessionStore = new CheckoutStore();
  const sess = handleCheckout(
    {
      webProductId: "fish.cosmetic.sunset_bunting",
      cloudAccountId: "acct_test",
      successUrl: "http://localhost:5173/?billing=success",
      cancelUrl: "http://localhost:5173/?billing=cancel",
    },
    { store: sessionStore, instant: false, publicBase: "http://localhost:8787" },
  );
  if ("error" in sess || sess.status !== "checkout" || !("url" in sess) || !sess.url.includes("session_id=")) {
    errors.push("non-instant checkout must return url with session_id");
  } else {
    const sessionId = new URL(sess.url).searchParams.get("session_id") ?? "";
    const fulfilled = handleFulfill({ sessionId, cloudAccountId: "acct_test" }, sessionStore);
    if ("error" in fulfilled) {
      errors.push(`fulfill error: ${fulfilled.error}`);
    } else if (!fulfilled.entitlements.some((e) => e.webProductId === "fish.cosmetic.sunset_bunting")) {
      errors.push("fulfill must grant session product");
    }
  }

  const bad = handleCheckout({ webProductId: "fish.nope" }, { store: new CheckoutStore(), instant: true });
  if (!("error" in bad) || bad.status !== 400) errors.push("unknown product must 400");

  if (!webEnv.includes("VITE_BILLING_API_BASE=")) {
    errors.push("web/.env.example missing VITE_BILLING_API_BASE");
  }
  if (!webEnv.includes("localhost:8787") && !webEnv.includes("checkout-api")) {
    errors.push("web/.env.example must document local checkout-api emulator");
  }
  if (!apiEnv.includes("PORT=") || !apiEnv.includes("CHECKOUT_API_MODE=")) {
    errors.push("checkout-api/.env.example missing PORT/MODE");
  }
  if (/sk_live_|sk_test_|whsec_/.test(apiEnv)) {
    errors.push("checkout-api/.env.example must not contain secret values");
  }

  if ((dod.quotas?.checkoutApiRoutes ?? 0) < 3) {
    errors.push("DoD quotas.checkoutApiRoutes must be ≥ 3");
  }
  if (listing.webCheckoutApiPhase !== 25) errors.push("listing.webCheckoutApiPhase must be 25");
  if (listing.webCheckoutApiCatalog !== "shared/ship/web-checkout-api.json") {
    errors.push("listing.webCheckoutApiCatalog mismatch");
  }
  if (!ci.includes("checkoutapi:validate")) errors.push("ci.yml missing checkoutapi:validate");
  if (!pin.fixtures?.includes("parity-web-checkout-api.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-web-checkout-api.json");
  }
  if (pin.webCheckoutApi !== "shared/ship/web-checkout-api.json") {
    errors.push("RELEASE_PIN.webCheckoutApi path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");
  if (!pkg.scripts?.["checkoutapi:validate"]) {
    errors.push("web/package.json missing checkoutapi:validate");
  }
  if (!pkg.scripts?.["checkout-api:dev"]) {
    errors.push("web/package.json missing checkout-api:dev");
  }
  if (WEB_CHECKOUT_API.parityFixture !== "shared/fixtures/parity-web-checkout-api.json") {
    errors.push("parityFixture path mismatch");
  }
  if (billing.finish2CheckoutApiPhase != null && billing.finish2CheckoutApiPhase !== 25) {
    errors.push("web-billing finish2CheckoutApiPhase must be 25 when set");
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }
  for (const mod of fixture.expect.moduleFiles as string[]) {
    if (!existsSync(resolve(root, mod))) errors.push(`missing module file ${mod}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("checkoutapi:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK checkoutapi:validate — web checkout API stub/emulator + contract");
