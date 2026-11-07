/**
 * Phase 10 (post-1.0) — validate icon pack + feature graphic sizes.
 *
 * Usage:
 *   npm run icons:validate
 *   npx vite-node scripts/validate-icon-pack.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "../src/store/pngSize";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/store/icon-pack.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));

  if (catalog.phase !== 10) errors.push(`phase expected 10, got ${catalog.phase}`);
  if (catalog.schema !== "fish.store.icon_pack.v1") errors.push("bad schema");
  if (listing.iconPackPhase !== 10) errors.push("listing.iconPackPhase must be 10");
  if (listing.iconPackCatalog !== "shared/store/icon-pack.json") {
    errors.push("listing.iconPackCatalog mismatch");
  }

  const required = [
    catalog.sourceMark,
    catalog.tool,
    catalog.featureGraphic.svg,
    catalog.featureGraphic.png,
    catalog.playHiResIcon.path,
    catalog.android.adaptiveIcon,
    catalog.android.foreground,
    catalog.android.background,
    catalog.web.faviconSvg,
    catalog.web.appleTouchIcon.path,
    catalog.web.icon192.path,
    catalog.web.icon512.path,
    catalog.web.icon512Maskable.path,
    catalog.web.manifest,
  ];
  for (const rel of required) {
    if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
  }

  for (const [folder, size] of Object.entries(catalog.android.legacyMipmaps as Record<string, number>)) {
    const rel = `app/src/main/res/${folder}/ic_launcher.png`;
    const round = `app/src/main/res/${folder}/ic_launcher_round.png`;
    if (!existsSync(resolve(root, rel))) errors.push(`missing ${rel}`);
    else {
      const dim = PNG.size(resolve(root, rel));
      if (dim.width !== size || dim.height !== size) {
        errors.push(`${rel} size ${dim.width}x${dim.height} ≠ ${size}`);
      }
    }
    if (!existsSync(resolve(root, round))) errors.push(`missing ${round}`);
  }

  const sized: { path: string; width: number; height: number }[] = [
    catalog.featureGraphic,
    catalog.playHiResIcon,
    catalog.web.appleTouchIcon,
    catalog.web.icon192,
    catalog.web.icon512,
    catalog.web.icon512Maskable,
  ];
  for (const asset of sized) {
    const path = "path" in asset && asset.path ? asset.path : (asset as any).png;
    if (!path || !existsSync(resolve(root, path))) continue;
    const dim = PNG.size(resolve(root, path));
    if (dim.width !== asset.width || dim.height !== asset.height) {
      errors.push(`${path} size ${dim.width}x${dim.height} ≠ ${asset.width}x${asset.height}`);
    }
  }

  const brand = readFileSync(resolve(root, catalog.sourceMark), "utf8");
  const favicon = readFileSync(resolve(root, catalog.web.faviconSvg), "utf8");
  if (brand !== favicon) errors.push("favicon.svg must match brand-mark.svg");
  for (const color of Object.values(catalog.brandColors as Record<string, string>)) {
    if (!brand.toLowerCase().includes(color.toLowerCase())) {
      errors.push(`brand-mark missing color ${color}`);
    }
  }

  const fgXml = readFileSync(resolve(root, catalog.android.foreground), "utf8");
  const bgXml = readFileSync(resolve(root, catalog.android.background), "utf8");
  if (!fgXml.includes("#9FD3EA") && !fgXml.toLowerCase().includes("#9fd3ea")) {
    errors.push("adaptive foreground missing sky fish fill");
  }
  if (!bgXml.includes("#153449")) errors.push("adaptive background missing ink fill");

  const manifest = readJson(resolve(root, catalog.web.manifest));
  const srcs = (manifest.icons as any[]).map((i) => String(i.src));
  const normalized = new Set(srcs.map((s) => (s.startsWith("/") ? s : `/${s}`)));
  for (const need of ["/favicon.svg", "/icon-192.png", "/icon-512.png", "/icon-512-maskable.png"]) {
    if (!normalized.has(need)) errors.push(`manifest missing icon ${need}`);
  }

  const assets = listing.assets ?? {};
  if (assets.playHiResIcon !== catalog.playHiResIcon.path) {
    errors.push("listing.assets.playHiResIcon mismatch");
  }
  if (assets.webIcon192 !== catalog.web.icon192.path) {
    errors.push("listing.assets.webIcon192 mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("icons:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK icons:validate — icon pack + feature graphic sizes locked");
