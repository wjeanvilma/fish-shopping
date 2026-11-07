/**
 * Phase 12 (post-1.0) — licenses catalog + OSS notices for the in-app screen.
 */
import licensesJson from "../../../shared/store/licenses.json";

export interface OssNotice {
  id: string;
  name: string;
  version: string;
  spdx: string;
  url: string;
  platforms: string[];
  notice: string;
}

export interface LicensesCatalog {
  phase: number;
  licensesUiPhase: number;
  schema: string;
  screenTitle: string;
  screenIntro: string;
  catalogPath: string;
  defaultLicense: { holder: string; spdx: string; note: string };
  records: { id: string; rights: string; origin: string }[];
  ossNotices: OssNotice[];
  requiredOssIds: string[];
}

export const licensesCatalog = licensesJson as unknown as LicensesCatalog;
export const LICENSES_UI_PHASE = licensesCatalog.licensesUiPhase;
export const LICENSES_SCREEN_TITLE = licensesCatalog.screenTitle;
export const LICENSES_SCREEN_INTRO = licensesCatalog.screenIntro;

export function ossHeadline(n: OssNotice): string {
  return `${n.name} ${n.version} · ${n.spdx}`;
}

export function licensesDisplayLines(): string[] {
  const lines: string[] = [
    licensesCatalog.screenIntro,
    "",
    `First-party assets · Fish Shopping`,
    licensesCatalog.defaultLicense.spdx,
    "",
  ];
  for (const n of licensesCatalog.ossNotices) {
    lines.push(ossHeadline(n), n.notice, n.url, "");
  }
  return lines;
}
