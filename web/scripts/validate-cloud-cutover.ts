/**
 * Phase 25 (post-1.0) — cloud save production cutover readiness.
 *
 * Usage:
 *   npm run cloud:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/cloud/production-path.json"));
  const webPath = readFileSync(resolve(root, "web/src/cloud/cloudProductionPath.ts"), "utf8");
  const webQueue = readFileSync(resolve(root, "web/src/cloud/cloudOfflineQueue.ts"), "utf8");
  const webCoord = readFileSync(resolve(root, "web/src/cloud/cloudSyncCoordinator.ts"), "utf8");
  const webHost = readFileSync(resolve(root, "web/src/game/GameHost.ts"), "utf8");
  const webApp = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const webSettings = readFileSync(resolve(root, "web/src/game/settingsStore.ts"), "utf8");
  const androidPath = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/cloud/CloudProductionPath.kt"),
    "utf8",
  );
  const androidQueue = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/cloud/CloudOfflineQueue.kt"),
    "utf8",
  );
  const androidCoord = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/cloud/CloudSyncCoordinator.kt"),
    "utf8",
  );
  const androidVm = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );
  const androidHud = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  const androidSettings = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/persistence/SettingsStore.kt"),
    "utf8",
  );
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const envExample = readFileSync(resolve(root, "web/.env.example"), "utf8");
  const localExample = readFileSync(resolve(root, "local.properties.example"), "utf8");

  if (catalog.phase !== 25) errors.push(`phase expected 25, got ${catalog.phase}`);
  if (catalog.schema !== "fish.cloud.production_path.v1") errors.push("bad schema");
  if (catalog.schemaVersion !== 20) errors.push("schemaVersion must stay 20");
  if (catalog.authMode !== "identity_toolkit_anonymous") errors.push("authMode mismatch");
  if (catalog.documentPath !== "users/{uid}/saves/harbor") errors.push("documentPath mismatch");
  if (catalog.firestoreRules !== "not_shipped_ask_for_snippet") {
    errors.push("firestore rules must stay out of repo");
  }
  if (!catalog.conflictUi?.includes("phase11")) errors.push("conflictUi must reference Phase 11");
  if (catalog.offlineQueue?.enabled !== true) errors.push("offlineQueue.enabled required");
  if (catalog.offlineQueue?.policy !== "latest_snapshot_wins") {
    errors.push("offlineQueue.policy must be latest_snapshot_wins");
  }
  const flushOn = catalog.offlineQueue?.flushOn as string[] | undefined;
  for (const need of ["save_retry", "app_resume", "online_event", "settings_enable"]) {
    if (!flushOn?.includes(need)) errors.push(`offlineQueue.flushOn missing ${need}`);
  }
  if (!Array.isArray(catalog.cutoverChecklist) || catalog.cutoverChecklist.length < 4) {
    errors.push("cutoverChecklist too short");
  }

  if (!webPath.includes("CLOUD_PRODUCTION_PHASE") && !webPath.includes("phase")) {
    errors.push("web cloudProductionPath missing phase export");
  }
  if (!webQueue.includes("enqueueCloudOfflineSnapshot")) errors.push("web offline queue missing enqueue");
  if (!webCoord.includes("flushOfflineQueue")) errors.push("web coordinator missing flushOfflineQueue");
  if (!webCoord.includes("hasPendingOfflinePush")) errors.push("web coordinator missing hasPendingOfflinePush");
  if (!webHost.includes("flushCloudOfflineQueue")) errors.push("GameHost missing flushCloudOfflineQueue");
  if (!webHost.includes("pushed.settings")) errors.push("GameHost save must use CloudPushResult.settings");
  if (!webApp.includes('addEventListener("online"') && !webApp.includes("addEventListener('online'")) {
    errors.push("App.tsx missing online flush listener");
  }
  if (!webApp.includes("cloudPendingUpload") && !webApp.includes("pending upload")) {
    errors.push("App.tsx missing pending upload status");
  }
  if (!webSettings.includes("cloudPendingUpload")) errors.push("SaveStatusView missing cloudPendingUpload");

  if (!androidPath.includes("PHASE = 25")) errors.push("CloudProductionPath.PHASE must be 25");
  if (!androidQueue.includes("latest snapshot wins")) errors.push("Android offline queue missing policy note");
  if (!androidCoord.includes("flushOfflineQueue")) errors.push("Android coordinator missing flushOfflineQueue");
  if (!androidVm.includes("flushCloudOfflineQueue")) errors.push("GameViewModel missing flushCloudOfflineQueue");
  if (!androidHud.includes("pending upload") && !androidHud.includes("cloudPendingUpload")) {
    errors.push("GameScreen missing pending upload status");
  }
  if (!androidSettings.includes("cloudPendingUpload")) {
    errors.push("Android SaveStatusView missing cloudPendingUpload");
  }

  if (!envExample.includes("VITE_FIREBASE_API_KEY=")) errors.push("web/.env.example missing API key");
  if (!envExample.includes("VITE_FIREBASE_PROJECT_ID=")) errors.push("web/.env.example missing project id");
  if (!localExample.includes("fish.firebase.apiKey=")) errors.push("local.properties.example missing apiKey");
  if (!localExample.includes("fish.firebase.projectId=")) {
    errors.push("local.properties.example missing projectId");
  }
  if (!ci.includes("cloud:validate")) errors.push("ci.yml missing cloud:validate");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("cloud:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK cloud:validate — production cutover offline queue; rules not in repo");
