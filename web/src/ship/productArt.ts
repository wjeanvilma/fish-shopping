/**
 * Finish 4.0 Phase 10 — product/cosmetic art presentation pass
 * (mirrors shared/ship/product-art.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/product-art.json";

export interface ProductArtEntry {
  productId: string;
  kind: string;
  asset: string;
}

export interface CosmeticBannerEntry {
  cosmeticId: string;
  asset: string;
}

export interface ProductArtCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  productArtMarker: string;
  cosmeticBannerMarker: string;
  authoredProductTarget: number;
  cosmeticBannerTarget: number;
  minProductArtNodes: number;
  minCosmeticArtNodes: number;
  themesModule: string;
  generator: string;
  cosmeticPresentationCatalog: string;
  kickoffCatalog: string;
  gapClosed: string;
  gapClosedValue: boolean;
  parityFixture: string;
  validateScript: string;
  maxBytesPerProduct: number;
  maxTotalProductBytes: number;
  maxBytesPerBanner: number;
  authoredProducts: ProductArtEntry[];
  cosmeticBanners: CosmeticBannerEntry[];
  checklist: string[];
  preflightGates: string[];
}

export const PRODUCT_ART = catalogJson as unknown as ProductArtCatalog;
export const PRODUCT_ART_PHASE = PRODUCT_ART.phase;
export const PRODUCT_ART_SCHEMA = PRODUCT_ART.schema;
export const PRODUCT_ART_MARKER = PRODUCT_ART.productArtMarker;

export interface ProductArtMeasure {
  productCount: number;
  bannerCount: number;
  productsPresent: boolean;
  bannersPresent: boolean;
  minProductNodesMet: boolean;
  minBannerNodesMet: boolean;
  gapClosed: boolean;
  licensesOk: boolean;
  presentationOk: boolean;
  missingGates: string[];
  missingAssets: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseGlbJson(buf: Buffer): Record<string, unknown> {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB");
  const chunkLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error("missing JSON chunk");
  return JSON.parse(buf.subarray(20, 20 + chunkLen).toString("utf8").replace(/\0+$/, ""));
}

export function measureProductArt(repoRoot: string): ProductArtMeasure {
  const missingAssets: string[] = [];
  let productOk = 0;
  let bannerOk = 0;
  let minProductNodesMet = true;
  let minBannerNodesMet = true;

  for (const entry of PRODUCT_ART.authoredProducts) {
    const assetPath = resolve(repoRoot, entry.asset);
    if (!existsSync(assetPath)) {
      missingAssets.push(entry.asset);
      minProductNodesMet = false;
      continue;
    }
    try {
      const gltf = parseGlbJson(readFileSync(assetPath));
      const extras = (gltf.extras ?? {}) as Record<string, string>;
      const nodes = ((gltf.nodes ?? []) as { name: string }[]).map((n) => n.name);
      const art = nodes.filter((n) => n.startsWith("ProductArt_"));
      if (
        extras.productArt === PRODUCT_ART.productArtMarker &&
        art.length >= PRODUCT_ART.minProductArtNodes
      ) {
        productOk += 1;
      } else {
        minProductNodesMet = false;
      }
      if (art.length < PRODUCT_ART.minProductArtNodes) minProductNodesMet = false;
    } catch {
      missingAssets.push(entry.asset);
      minProductNodesMet = false;
    }
  }

  for (const entry of PRODUCT_ART.cosmeticBanners) {
    const assetPath = resolve(repoRoot, entry.asset);
    if (!existsSync(assetPath)) {
      missingAssets.push(entry.asset);
      minBannerNodesMet = false;
      continue;
    }
    try {
      const gltf = parseGlbJson(readFileSync(assetPath));
      const extras = (gltf.extras ?? {}) as Record<string, string>;
      const nodes = ((gltf.nodes ?? []) as { name: string }[]).map((n) => n.name);
      const art = nodes.filter((n) => n.startsWith("CosmeticArt_"));
      if (
        extras.cosmeticArt === PRODUCT_ART.cosmeticBannerMarker &&
        art.length >= PRODUCT_ART.minCosmeticArtNodes
      ) {
        bannerOk += 1;
      } else {
        minBannerNodesMet = false;
      }
      if (art.length < PRODUCT_ART.minCosmeticArtNodes) minBannerNodesMet = false;
    } catch {
      missingAssets.push(entry.asset);
      minBannerNodesMet = false;
    }
  }

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, PRODUCT_ART.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.[PRODUCT_ART.gapClosed] === PRODUCT_ART.gapClosedValue;
  }

  const licensesPath = resolve(repoRoot, "shared/store/licenses.json");
  let licensesOk = false;
  if (existsSync(licensesPath)) {
    const licenses = readJson(licensesPath);
    const productRec = (licenses.records ?? []).find((r: { id: string }) => r.id === "product-authored-art");
    const bannerRec = (licenses.records ?? []).find((r: { id: string }) => r.id === "cosmetic-banner-art");
    const productPaths = new Set((productRec?.paths ?? []) as string[]);
    const bannerPaths = new Set((bannerRec?.paths ?? []) as string[]);
    licensesOk =
      PRODUCT_ART.authoredProducts.every((p) => productPaths.has(p.asset)) &&
      PRODUCT_ART.cosmeticBanners.every((b) => bannerPaths.has(b.asset));
  }

  let presentationOk = false;
  const presentationPath = resolve(repoRoot, PRODUCT_ART.cosmeticPresentationCatalog);
  if (existsSync(presentationPath)) {
    const presentation = readJson(presentationPath);
    const items = (presentation.items ?? []) as { cosmeticId: string; meshAsset?: string }[];
    presentationOk =
      presentation.productArtMarker === PRODUCT_ART.productArtMarker &&
      presentation.cosmeticBannerMarker === PRODUCT_ART.cosmeticBannerMarker &&
      !!presentation.counterPresentation &&
      items.length >= PRODUCT_ART.cosmeticBannerTarget &&
      items.every((i) => typeof i.meshAsset === "string" && i.meshAsset.length > 0);
  }

  const missingGates: string[] = [];
  for (const gate of PRODUCT_ART.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    productCount: productOk,
    bannerCount: bannerOk,
    productsPresent: productOk === PRODUCT_ART.authoredProductTarget,
    bannersPresent: bannerOk === PRODUCT_ART.cosmeticBannerTarget,
    minProductNodesMet,
    minBannerNodesMet,
    gapClosed,
    licensesOk,
    presentationOk,
    missingGates,
    missingAssets,
  };
}
