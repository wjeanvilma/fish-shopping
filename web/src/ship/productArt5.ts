/**
 * Finish 5.0 Phase 10 — product/cosmetic art presentation 5
 * mirrors shared/ship/product-art-5.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/product-art-5.json";

export interface ProductArt5Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  productArt5Marker: string;
  productFinish5Marker: string;
  cosmeticFinish5Marker: string;
  productArtCatalog: string;
  productArtMarker: string;
  cosmeticBannerMarker: string;
  authoredProductTarget: number;
  cosmeticBannerTarget: number;
  minProductArtNodes: number;
  minCosmeticArtNodes: number;
  kickoffCatalog: string;
  gapClosed: string;
  gapClosedValue: boolean;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const PRODUCT_ART_5 = catalogJson as unknown as ProductArt5Catalog;
export const PRODUCT_ART_5_PHASE = PRODUCT_ART_5.phase;
export const PRODUCT_ART_5_SCHEMA = PRODUCT_ART_5.schema;
export const PRODUCT_ART_5_MARKER = PRODUCT_ART_5.productArt5Marker;

export interface ProductArt5Measure {
  productCount: number;
  bannerCount: number;
  productsStamped: number;
  bannersStamped: number;
  minNodesMet: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
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

export function measureProductArt5(repoRoot: string): ProductArt5Measure {
  const passPath = resolve(repoRoot, PRODUCT_ART_5.productArtCatalog);
  const pass = existsSync(passPath)
    ? readJson(passPath)
    : { authoredProducts: [], cosmeticBanners: [] };
  const products = (pass.authoredProducts ?? []) as { productId: string; asset: string }[];
  const banners = (pass.cosmeticBanners ?? []) as { cosmeticId: string; asset: string }[];

  let productsStamped = 0;
  let bannersStamped = 0;
  let minNodesMet = true;
  const missingAssets: string[] = [];

  for (const entry of products) {
    const assetPath = resolve(repoRoot, entry.asset);
    if (!existsSync(assetPath)) {
      missingAssets.push(entry.asset);
      minNodesMet = false;
      continue;
    }
    const buf = readFileSync(assetPath);
    let gltf: Record<string, unknown>;
    try {
      gltf = parseGlbJson(buf);
    } catch {
      missingAssets.push(entry.asset);
      minNodesMet = false;
      continue;
    }
    const extras = (gltf.extras ?? {}) as Record<string, string>;
    const nodes = ((gltf.nodes ?? []) as { name: string }[]).map((n) => n.name);
    const artNodes = nodes.filter((n) => n.startsWith("ProductArt_"));
    if (
      extras.productFinish5 === PRODUCT_ART_5.productFinish5Marker &&
      extras.productArt === PRODUCT_ART_5.productArtMarker
    ) {
      productsStamped += 1;
    }
    if (artNodes.length < PRODUCT_ART_5.minProductArtNodes) minNodesMet = false;
  }

  for (const entry of banners) {
    const assetPath = resolve(repoRoot, entry.asset);
    if (!existsSync(assetPath)) {
      missingAssets.push(entry.asset);
      minNodesMet = false;
      continue;
    }
    const buf = readFileSync(assetPath);
    let gltf: Record<string, unknown>;
    try {
      gltf = parseGlbJson(buf);
    } catch {
      missingAssets.push(entry.asset);
      minNodesMet = false;
      continue;
    }
    const extras = (gltf.extras ?? {}) as Record<string, string>;
    const nodes = ((gltf.nodes ?? []) as { name: string }[]).map((n) => n.name);
    const artNodes = nodes.filter((n) => n.startsWith("CosmeticArt_"));
    if (
      extras.cosmeticFinish5 === PRODUCT_ART_5.cosmeticFinish5Marker &&
      extras.cosmeticArt === PRODUCT_ART_5.cosmeticBannerMarker
    ) {
      bannersStamped += 1;
    }
    if (artNodes.length < PRODUCT_ART_5.minCosmeticArtNodes) minNodesMet = false;
  }

  const kickoffPath = resolve(repoRoot, PRODUCT_ART_5.kickoffCatalog);
  const kickoff = existsSync(kickoffPath) ? readJson(kickoffPath) : {};
  const phase10 = (kickoff.phases as any[])?.find((p) => p.phase === 10);

  const missingGates: string[] = [];
  for (const gate of PRODUCT_ART_5.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    productCount: products.length,
    bannerCount: banners.length,
    productsStamped,
    bannersStamped,
    minNodesMet,
    gapClosed: kickoff?.gaps?.[PRODUCT_ART_5.gapClosed] === PRODUCT_ART_5.gapClosedValue,
    kickoffWired:
      phase10?.id === "product-art-5" && phase10?.validate === "productart5:validate",
    missingGates,
    missingAssets,
  };
}
