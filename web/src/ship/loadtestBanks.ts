/**
 * Large realistic loadtest JSON banks (save + telemetry) shared with Android.
 * Mirrors shared/ship/loadtest-banks.json — browser-safe catalog + URL probes.
 * Node disk probes live in loadtestBanksNode.ts (keeps vite client free of node:fs).
 */
import catalogJson from "../../../shared/ship/loadtest-banks.json";

export interface LoadtestBankRef {
  fixture: string;
  asset: string;
  webUrl: string;
  schema: string;
  minBytes: number;
}

export interface LoadtestBanksCatalog {
  schema: string;
  label: string;
  contentVersion: string;
  schemaVersion: number;
  saveBank: LoadtestBankRef;
  telemetryBank: LoadtestBankRef;
  parityFixture: string;
  purpose: string;
}

export const LOADTEST_BANKS = catalogJson as unknown as LoadtestBanksCatalog;
export const LOADTEST_BANKS_SCHEMA = LOADTEST_BANKS.schema;
export const LOADTEST_SAVE_BANK = LOADTEST_BANKS.saveBank;
export const LOADTEST_TELEMETRY_BANK = LOADTEST_BANKS.telemetryBank;

export interface LoadtestBankProbe {
  pathOrUrl: string;
  bytes: number;
  schema: string | null;
  label: string | null;
  contentVersion: string | null;
  schemaVersion: number | null;
  sampleKey: string | null;
  floorsMet: boolean;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractField(header: string, key: string): string | null {
  const re = new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*"([^"]+)"`);
  const m = header.match(re);
  return m?.[1] ?? null;
}

export function extractInt(header: string, key: string): number | null {
  const re = new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*(-?\\d+)`);
  const m = header.match(re);
  return m ? Number(m[1]) : null;
}

export function floorsMetFromHeader(
  ref: LoadtestBankRef,
  bytes: number,
  header: string,
): Omit<LoadtestBankProbe, "pathOrUrl" | "floorsMet"> & { floorsMet: boolean } {
  const schema = extractField(header, "$schema");
  const label = extractField(header, "label");
  const contentVersion = extractField(header, "contentVersion");
  const schemaVersion = extractInt(header, "schemaVersion");
  const sampleKey =
    header.includes('"records"') ? "records" : header.includes('"events"') ? "events" : null;
  return {
    bytes,
    schema,
    label,
    contentVersion,
    schemaVersion,
    sampleKey,
    floorsMet:
      bytes >= ref.minBytes &&
      schema === ref.schema &&
      contentVersion === LOADTEST_BANKS.contentVersion &&
      (schemaVersion ?? 0) >= LOADTEST_BANKS.schemaVersion,
  };
}

/** Browser probe via HEAD + ranged GET (avoids loading ~90MB into memory). */
export async function probeLoadtestBankUrl(
  ref: LoadtestBankRef,
  base = "",
): Promise<LoadtestBankProbe> {
  const url = `${base}${ref.webUrl}`;
  let bytes = 0;
  try {
    const head = await fetch(url, { method: "HEAD" });
    bytes = Number(head.headers.get("content-length") || 0);
  } catch {
    /* fall through to ranged GET */
  }
  const res = await fetch(url, { headers: { Range: "bytes=0-4095" } });
  if (!bytes) {
    const full = res.headers.get("content-range")?.match(/\/(\d+)\s*$/);
    bytes = full ? Number(full[1]) : Number(res.headers.get("content-length") || 0);
  }
  const header = await res.text();
  const measured = floorsMetFromHeader(ref, bytes, header);
  return {
    pathOrUrl: url,
    ...measured,
  };
}

export async function measureLoadtestBanksInBrowser(base = ""): Promise<{
  save: LoadtestBankProbe;
  telemetry: LoadtestBankProbe;
  floorsMet: boolean;
}> {
  const save = await probeLoadtestBankUrl(LOADTEST_SAVE_BANK, base);
  const telemetry = await probeLoadtestBankUrl(LOADTEST_TELEMETRY_BANK, base);
  return { save, telemetry, floorsMet: save.floorsMet && telemetry.floorsMet };
}
