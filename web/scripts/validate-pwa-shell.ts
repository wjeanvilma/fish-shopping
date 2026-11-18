/**
 * Finish 3.0 Phase 19 — web PWA / service worker shell readiness.
 *
 * Usage:
 *   npm run pwa:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH3_OPEN_GAP_FLAGS } from "../src/ship/finish3Kickoff";
import {
  PWA_CLOSES_GAP,
  PWA_SHELL,
  PWA_SHELL_MARKER,
  PWA_SHELL_PHASE,
  PWA_SHELL_SCHEMA,
  measurePwaShell,
} from "../src/ship/pwaShell";
import {
  canRegisterServiceWorker,
  PWA_SW_SCRIPT,
  registerServiceWorker,
} from "../src/pwa/registerServiceWorker";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function validate(): Promise<string[]> {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/pwa-shell.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-pwa-shell.json"));
  const policy = readJson(resolve(root, "shared/pwa/pwa-shell.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const spa = readJson(resolve(root, "shared/ship/spa-host.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/PwaShell.kt"),
    "utf8",
  );
  const sw = readFileSync(resolve(root, "web/public/sw.js"), "utf8");
  const offline = readFileSync(resolve(root, "web/public/offline.html"), "utf8");
  const registerSrc = readFileSync(resolve(root, "web/src/pwa/registerServiceWorker.ts"), "utf8");
  const pushSrc = readFileSync(resolve(root, "web/src/push/localPushReminders.ts"), "utf8");
  const manifest = readJson(resolve(root, "web/public/manifest.webmanifest"));

  if (catalog.phase !== 19) errors.push(`phase expected 19, got ${catalog.phase}`);
  if (catalog.schema !== PWA_SHELL_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (PWA_SHELL_PHASE !== 19) errors.push("phase mirror mismatch");
  if (catalog.pwaShellMarker !== PWA_SHELL_MARKER) errors.push("marker mismatch");
  if (fixture.pwaShellMarker !== PWA_SHELL_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must stay 24");
  if (SCHEMA_VERSION !== 24) errors.push("engine SCHEMA_VERSION must stay 24");
  if (catalog.closesGap !== "pwaMissing") errors.push("closesGap mismatch");
  if (PWA_CLOSES_GAP !== "pwaMissing") errors.push("closesGap mirror mismatch");
  if (PWA_SW_SCRIPT !== "./sw.js") errors.push("PWA_SW_SCRIPT must be ./sw.js");

  if (policy.cacheName !== "fish-shopping-pwa-v1") errors.push("policy cacheName mismatch");
  if (policy.swScript !== "sw.js") errors.push("policy swScript mismatch");
  if (policy.offlineFallback !== "offline.html") errors.push("policy offlineFallback mismatch");

  const measure = measurePwaShell(root);
  if (measure.schemaVersion !== 24) errors.push("measure schemaVersion must be 24");
  if (!measure.swPresent) errors.push("sw.js missing required shell symbols");
  if (!measure.offlinePresent) errors.push("offline.html incomplete");
  if (!measure.manifestStandalone) errors.push("manifest must be standalone with icons");
  if (!measure.registerWired) errors.push("registerServiceWorker module incomplete");
  if (!measure.mainRegisters) errors.push("main.tsx/index.html PWA wiring incomplete");
  if (!measure.gapClosed) errors.push("kickoff.gaps.pwaMissing must be false");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 19 must set validate=pwa:validate, gap closed, measuredAtPhase≥19");
  }
  if (!measure.canRegisterLocalhost) errors.push("canRegisterServiceWorker(localhost) must be true");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const needle of fixture.expect.swMustContain as string[]) {
    if (!sw.includes(needle)) errors.push(`sw.js missing "${needle}"`);
  }
  for (const needle of fixture.expect.offlineMustContain as string[]) {
    if (!offline.includes(needle)) errors.push(`offline.html missing "${needle}"`);
  }
  for (const exp of fixture.expect.registerExports as string[]) {
    if (!registerSrc.includes(exp)) errors.push(`registerServiceWorker missing export ${exp}`);
  }
  if (manifest.display !== fixture.expect.manifestDisplay) {
    errors.push("manifest.display must be standalone");
  }
  for (const key of policy.requiredManifestKeys as string[]) {
    if (manifest[key] == null) errors.push(`manifest missing ${key}`);
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length < 2) {
    errors.push("manifest must list ≥2 icons");
  }

  // Unit-level register against a mock container
  const fakeReg = {
    scope: "http://localhost/",
    active: { scriptURL: "http://localhost/sw.js" },
    installing: null,
    waiting: null,
    addEventListener() {},
  };
  const fakeSw = {
    register: async () => fakeReg,
    getRegistration: async () => fakeReg,
  } as unknown as ServiceWorkerContainer;
  if (!canRegisterServiceWorker({ serviceWorker: fakeSw, isSecureContext: true, hostname: "example.com" })) {
    errors.push("secure context must allow SW registration");
  }
  const reg = await registerServiceWorker(fakeSw, "./sw.js");
  if (!reg.registered) errors.push(`mock register failed: ${reg.reason}`);

  if (!pushSrc.includes("showPwaNotification")) {
    errors.push("localPushReminders must prefer SW showPwaNotification");
  }

  const published = spa.spaChecks?.requiredPublishedFiles as string[] | undefined;
  if (!published?.includes("sw.js")) errors.push("spa-host requiredPublishedFiles missing sw.js");
  if (!published?.includes("offline.html")) {
    errors.push("spa-host requiredPublishedFiles missing offline.html");
  }

  if (kickoff.gaps?.pwaMissing !== false) errors.push("kickoff gap pwaMissing must be false");
  if (FINISH3_OPEN_GAP_FLAGS.includes("pwaMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed pwaMissing");
  }
  const phase19 = (kickoff.phases as any[])?.find((p) => p.phase === 19);
  if (!phase19 || phase19.validate !== "pwa:validate") {
    errors.push("kickoff phase 19 validate must be pwa:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 19) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 19");
  }

  if (listing.pwaShellPhase !== 19) errors.push("listing.pwaShellPhase must be 19");
  if (listing.pwaShellCatalog !== "shared/ship/pwa-shell.json") {
    errors.push("listing.pwaShellCatalog mismatch");
  }
  if (pin.pwaShell !== "shared/ship/pwa-shell.json") errors.push("RELEASE_PIN.pwaShell path missing");
  if (!pin.fixtures?.includes("parity-pwa-shell.json")) {
    errors.push("RELEASE_PIN missing parity-pwa-shell.json");
  }

  const block = dod.pwaShell;
  if (!block) errors.push("DoD missing pwaShell block");
  else {
    if (block.phase !== 19) errors.push("DoD pwaShell.phase must be 19");
    if (block.plan !== "30_finish_3.0") errors.push("DoD pwaShell.plan mismatch");
    if (block.status !== "complete") errors.push("DoD pwaShell.status must be complete");
    if (block.pwaShellMarker !== PWA_SHELL_MARKER) errors.push("DoD pwaShell marker mismatch");
  }

  if (!pkg.scripts?.["pwa:validate"]) errors.push("package.json missing pwa:validate");
  if (!ci.includes("pwa:validate")) errors.push("ci.yml missing pwa:validate");
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("CACHE_NAME")) {
    errors.push("Kotlin PwaShell missing constants");
  }

  if (fixture.expect?.closesGap !== "pwaMissing") errors.push("parity expect.closesGap mismatch");

  for (const gate of PWA_SHELL.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  for (const file of policy.requiredShellFiles as string[]) {
    if (!existsSync(resolve(root, file))) errors.push(`missing shell file ${file}`);
  }

  return errors;
}

const errors = await validate();
if (errors.length) {
  console.error("pwa:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK pwa:validate — web PWA / service worker shell locked");
