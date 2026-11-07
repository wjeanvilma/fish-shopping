/**
 * Phase 10 (post-1.0) — icon pack + feature graphic catalog.
 */
import iconPackJson from "../../../shared/store/icon-pack.json";

export interface SizedAsset {
  path: string;
  width: number;
  height: number;
}

export interface IconPackCatalog {
  phase: number;
  schema: string;
  sourceMark: string;
  tool: string;
  brandColors: Record<string, string>;
  featureGraphic: { svg: string; png: string; width: number; height: number };
  playHiResIcon: { path: string; width: number; height: number };
  android: {
    adaptiveIcon: string;
    foreground: string;
    background: string;
    legacyMipmaps: Record<string, number>;
  };
  web: {
    faviconSvg: string;
    appleTouchIcon: SizedAsset;
    icon192: SizedAsset;
    icon512: SizedAsset;
    icon512Maskable: SizedAsset;
    manifest: string;
  };
}

export const iconPack = iconPackJson as unknown as IconPackCatalog;
export const ICON_PACK_PHASE = iconPack.phase;
export const ICON_PACK_SCHEMA = iconPack.schema;
