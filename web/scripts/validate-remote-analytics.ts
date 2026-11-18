/**
 * Finish 3.0 Phase 26 — remote analytics sink readiness.
 *
 * Usage:
 *   npm run remoteanalytics:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { ANALYTICS_EVENT_NAMES } from "../src/engine/analytics";
import {
  REMOTE_BATCH_SCHEMA,
  REMOTE_ENDPOINT_PATH,
  REMOTE_FLUSH_INTERVAL_MS,
  REMOTE_MAX_EVENTS,
  REMOTE_MAX_QUEUE,
  REMOTE_ANALYTICS_POLICY,
  enqueueRemoteEvent,
  takeRemoteFlushSlice,
} from "../src/engine/remoteAnalytics";
import {
  REMOTE_ANALYTICS,
  REMOTE_ANALYTICS_MARKER,
  REMOTE_ANALYTICS_PHASE,
  REMOTE_ANALYTICS_SCHEMA,
  REMOTE_BATCH_MAX_EVENTS_FLOOR,
  REMOTE_EVENT_NAME_FLOOR,
} from "../src/ship/remoteAnalytics";
import { Analytics } from "../src/engine/analytics";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/remote-analytics.json"));
  const policy = readJson(resolve(root, "shared/ops/remote-analytics-sink.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-remote-analytics.json"));
  const dash = readJson(resolve(root, "shared/ops/analytics-dashboard.json"));
  const dataSafety = readJson(resolve(root, "shared/store/data-safety.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const apiPkg = readJson(resolve(root, "analytics-api/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const webEnv = readFileSync(resolve(root, "web/.env.example"), "utf8");
  const privacy = readFileSync(resolve(root, "web/public/privacy.html"), "utf8");
  const busTs = readFileSync(resolve(root, "web/src/analytics/analyticsBus.ts"), "utf8");
  const remoteTs = readFileSync(resolve(root, "web/src/analytics/remoteAnalyticsSink.ts"), "utf8");
  const busKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/analytics/AnalyticsBus.kt"),
    "utf8",
  );
  const remoteKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/analytics/RemoteAnalyticsSink.kt"),
    "utf8",
  );
  const manifest = readFileSync(resolve(root, "app/src/main/AndroidManifest.xml"), "utf8");
  const finish3Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish3Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/RemoteAnalytics.kt"),
    "utf8",
  );
  const policyKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/RemoteAnalyticsPolicy.kt"),
    "utf8",
  );
  const apiServer = readFileSync(resolve(root, "analytics-api/src/server.ts"), "utf8");
  const apiHandlers = readFileSync(resolve(root, "analytics-api/src/handlers.ts"), "utf8");

  if (catalog.phase !== 26) errors.push(`phase expected 26, got ${catalog.phase}`);
  if (catalog.schema !== REMOTE_ANALYTICS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (REMOTE_ANALYTICS_PHASE !== 26) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must be 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.remoteAnalyticsMarker !== REMOTE_ANALYTICS_MARKER) errors.push("marker mismatch");
  if (catalog.simHzInvariant !== 20) errors.push("simHzInvariant must be 20");
  if (catalog.policyCatalog !== "shared/ops/remote-analytics-sink.json") {
    errors.push("policyCatalog path mismatch");
  }
  if (policy.phase !== 26 || policy.schema !== "fish.ops.remote_analytics_sink.v1") {
    errors.push("policy catalog phase/schema mismatch");
  }
  if (policy.consentRequired !== true) errors.push("consentRequired must be true");
  if (policy.constraints?.noPii !== true) errors.push("noPii required");
  if (policy.batchSchema !== REMOTE_BATCH_SCHEMA) errors.push("batchSchema mismatch");
  if (policy.endpoint?.path !== REMOTE_ENDPOINT_PATH) errors.push("endpoint path mismatch");
  if (policy.endpoint?.path !== fixture.expect.endpointPath) errors.push("fixture endpoint mismatch");
  if (policy.batch?.maxEvents !== REMOTE_MAX_EVENTS) errors.push("maxEvents mirror mismatch");
  if (policy.batch?.maxQueue !== REMOTE_MAX_QUEUE) errors.push("maxQueue mirror mismatch");
  if (policy.batch?.flushIntervalMs !== REMOTE_FLUSH_INTERVAL_MS) {
    errors.push("flushIntervalMs mirror mismatch");
  }
  if ((policy.batch?.maxEvents ?? 0) < REMOTE_BATCH_MAX_EVENTS_FLOOR) {
    errors.push("batch maxEvents below floor");
  }
  if (ANALYTICS_EVENT_NAMES.length < REMOTE_EVENT_NAME_FLOOR) {
    errors.push("event names below floor");
  }
  for (const name of fixture.expect.eventNames as string[]) {
    if (!(ANALYTICS_EVENT_NAMES as readonly string[]).includes(name as any)) {
      errors.push(`missing analytics event ${name}`);
    }
  }
  if (dash.phase !== 26) errors.push("analytics-dashboard phase must stay 26 (post-1.0)");
  if (dataSafety.analytics?.remoteSinkCatalog !== "shared/ops/remote-analytics-sink.json") {
    errors.push("data-safety remoteSinkCatalog mismatch");
  }
  if (dataSafety.analytics?.remoteSinkOptIn !== true) {
    errors.push("data-safety remoteSinkOptIn must be true");
  }

  const queue: any[] = [];
  enqueueRemoteEvent(queue, Analytics.sessionStart("web"), 1);
  enqueueRemoteEvent(queue, Analytics.firstSale(10), 2);
  const slice = takeRemoteFlushSlice(queue, 3, "web");
  if (!slice || slice.events.length !== 2) errors.push("flush slice must emit queued events");
  if (slice?.schema !== REMOTE_BATCH_SCHEMA) errors.push("flush envelope schema mismatch");

  if (!busTs.includes("RemoteAnalyticsSink") || !busTs.includes("resolveAnalyticsApiBase")) {
    errors.push("analyticsBus.ts missing remote sink wiring");
  }
  if (!remoteTs.includes("FanoutAnalyticsSink") || !remoteTs.includes("flush")) {
    errors.push("remoteAnalyticsSink.ts missing fanout/flush");
  }
  if (!busKt.includes("attachRemote") || !busKt.includes("RemoteAnalyticsSink")) {
    errors.push("AnalyticsBus.kt missing remote attach");
  }
  if (!remoteKt.includes("FanoutAnalyticsSink") || !remoteKt.includes("flushBlocking")) {
    errors.push("RemoteAnalyticsSink.kt missing fanout/flush");
  }
  if (!manifest.includes("fish.analytics.apiBase")) {
    errors.push("AndroidManifest missing fish.analytics.apiBase meta-data");
  }
  if (!webEnv.includes("VITE_ANALYTICS_API_BASE=")) {
    errors.push("web/.env.example missing VITE_ANALYTICS_API_BASE");
  }
  if (!privacy.toLowerCase().includes("batched") && !privacy.toLowerCase().includes("batch")) {
    errors.push("privacy.html must mention optional remote batch sink");
  }
  if (!apiServer.includes(REMOTE_ENDPOINT_PATH) || !apiHandlers.includes("handleBatch")) {
    errors.push("analytics-api missing batch route/handler");
  }
  if (!apiPkg.scripts?.dev) errors.push("analytics-api package.json missing dev script");

  if ((dod.quotas?.remoteAnalyticsBatchMax ?? 0) < 10) {
    errors.push("DoD quotas.remoteAnalyticsBatchMax must be ≥ 10");
  }
  if (listing.remoteAnalyticsPhase !== 26) errors.push("listing.remoteAnalyticsPhase must be 26");
  if (listing.remoteAnalyticsCatalog !== "shared/ship/remote-analytics.json") {
    errors.push("listing.remoteAnalyticsCatalog mismatch");
  }
  if (!pkg.scripts?.["remoteanalytics:validate"]) {
    errors.push("package.json missing remoteanalytics:validate");
  }
  if (!pkg.scripts?.["analytics-api:dev"]) {
    errors.push("package.json missing analytics-api:dev");
  }
  if (!ci.includes("remoteanalytics:validate")) errors.push("ci.yml missing remoteanalytics:validate");
  if (!ci.includes("analytics:validate")) errors.push("ci.yml missing baseline analytics:validate");
  if (!pin.fixtures?.includes("parity-remote-analytics.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-remote-analytics.json");
  }
  if (pin.remoteAnalytics !== "shared/ship/remote-analytics.json") {
    errors.push("RELEASE_PIN.remoteAnalytics path mismatch");
  }
  if (pin.schemaVersion < 24) errors.push("RELEASE_PIN.schemaVersion must be >= 24");

  const phase26 = (kickoff.phases as any[])?.find((p: any) => p.phase === 26);
  if (!phase26 || phase26.validate !== "remoteanalytics:validate") {
    errors.push("kickoff phase 26 validate must be remoteanalytics:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 26) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 26");
  }
  if (!finish3Kt.includes("remoteanalytics:validate")) {
    errors.push("Finish3Kickoff.kt phase 26 missing remoteanalytics:validate");
  }
  if (!kotlin.includes("REMOTE_ANALYTICS_MARKER") || !policyKt.includes("BATCH_SCHEMA")) {
    errors.push("Kotlin RemoteAnalytics / policy missing constants");
  }
  if (REMOTE_ANALYTICS.policyCatalog !== "shared/ops/remote-analytics-sink.json") {
    errors.push("ship policyCatalog mismatch");
  }
  if (REMOTE_ANALYTICS_POLICY.client.webEnvKey !== "VITE_ANALYTICS_API_BASE") {
    errors.push("policy webEnvKey mismatch");
  }

  const block = dod.remoteAnalytics;
  if (!block) errors.push("DoD missing remoteAnalytics block");
  else {
    if (block.phase !== 26) errors.push("DoD remoteAnalytics.phase must be 26");
    if (block.plan !== "30_finish_3.0") errors.push("DoD remoteAnalytics.plan mismatch");
    if (block.status !== "complete") errors.push("DoD remoteAnalytics.status must be complete");
    if (block.remoteAnalyticsMarker !== REMOTE_ANALYTICS_MARKER) {
      errors.push("DoD remoteAnalytics marker mismatch");
    }
  }

  for (const gatePath of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gatePath))) errors.push(`missing preflight ${gatePath}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("remoteanalytics:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK remoteanalytics:validate — Finish 3.0 remote analytics sink ready");
