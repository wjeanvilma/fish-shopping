/**
 * Phase 24 (post-1.0) — cosmetic equip/preview presentation readiness.
 *
 * Usage:
 *   npm run cosmetics:validate
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
  const catalog = readJson(resolve(root, "shared/content/cosmetic-presentation.json"));
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));
  const web = readFileSync(resolve(root, "web/src/engine/cosmeticPresentation.ts"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/CosmeticPresentation.kt"),
    "utf8",
  );
  const settingsWeb = readFileSync(resolve(root, "web/src/game/settingsStore.ts"), "utf8");
  const settingsAndroid = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/persistence/SettingsStore.kt"),
    "utf8",
  );
  const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const hud = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  const scene = readFileSync(resolve(root, "web/src/render/HarborScene.ts"), "utf8");
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 24) errors.push(`phase expected 24, got ${catalog.phase}`);
  if (catalog.schema !== "fish.content.cosmetic_presentation.v1") errors.push("bad schema");
  if (catalog.schemaVersion !== 21) errors.push("schemaVersion must stay 21");
  if (catalog.constraints?.powerNeutral !== true) errors.push("powerNeutral required");
  if (catalog.constraints?.noSchemaBreak !== true) errors.push("noSchemaBreak required");
  if (catalog.constraints?.equipInSettingsNotSave !== true) {
    errors.push("equip must live in settings, not sim save");
  }
  if (catalog.slot?.maxEquipped !== 1) errors.push("maxEquipped must be 1");
  if (catalog.slot?.previewUnownedAllowed !== true) errors.push("previewUnownedAllowed required");

  const items = catalog.items as Array<{ cosmeticId: string; sku: string; powerNeutral: boolean }>;
  if (!Array.isArray(items) || items.length < 3) errors.push("need ≥3 presentation items");
  for (const item of items) {
    if (item.powerNeutral !== true) errors.push(`${item.cosmeticId} must be powerNeutral`);
    const ent = (entitlements.cosmetics as any[]).find((c) => c.grantsCosmetic === item.cosmeticId);
    if (!ent) errors.push(`entitlements missing ${item.cosmeticId}`);
    else if (ent.powerNeutral !== true) errors.push(`entitlement ${item.cosmeticId} not powerNeutral`);
    else if (ent.sku !== item.sku) errors.push(`sku mismatch for ${item.cosmeticId}`);
  }
  for (const ent of entitlements.cosmetics as any[]) {
    if (!items.some((i) => i.cosmeticId === ent.grantsCosmetic)) {
      errors.push(`presentation missing IAP ${ent.grantsCosmetic}`);
    }
  }

  if (!web.includes("resolveVisibleCosmetic")) errors.push("web helper missing resolveVisibleCosmetic");
  if (!kotlin.includes("fun resolveVisible")) errors.push("Kotlin helper missing resolveVisible");
  if (!settingsWeb.includes("equippedCosmeticId")) errors.push("web settings missing equippedCosmeticId");
  if (!settingsAndroid.includes("equippedCosmeticId")) {
    errors.push("Android settings missing equippedCosmeticId");
  }
  if (!app.includes("onEquipCosmetic") || !app.includes("onPreviewCosmetic")) {
    errors.push("App.tsx missing equip/preview handlers");
  }
  if (!hud.includes("onEquipCosmetic") || !hud.includes("onPreviewCosmetic")) {
    errors.push("GameScreen.kt missing equip/preview handlers");
  }
  if (!scene.includes("syncCosmeticBanner")) errors.push("HarborScene missing banner sync");
  if (!ci.includes("cosmetics:validate")) errors.push("ci.yml missing cosmetics:validate");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("cosmetics:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK cosmetics:validate — equip/preview power-neutral; schema 20 unchanged");
