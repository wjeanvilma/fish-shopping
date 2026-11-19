/**
 * Large realistic loadtest JSON banks (save + telemetry) shared with Android.
 * Mirrors shared/ship/loadtest-banks.json — probe headers/size without full parse.
 */
import { existsSync, openSync, readSync, closeSync, statSync } from "node:fs";
import { resolve } from "node:path";
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractField(header: string, key: string): string | null {
  const re = new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*"([^"]+)"`);
  const m = header.match(re);
  return m?.[1] ?? null;
}

function extractInt(header: string, key: string): number | null {
  const re = new RegExp(`"${escapeRegExp(key)}"\\s*:\\s*(-?\\d+)`);
  const m = header.match(re);
  return m ? Number(m[1]) : null;
}

/** Probe a bank on disk (Node / vitest / ship scripts). */
export function probeLoadtestBankFile(
  repoRoot: string,
  ref: LoadtestBankRef,
): LoadtestBankProbe {
  const path = resolve(repoRoot, ref.fixture);
  if (!existsSync(path)) {
    return {
      pathOrUrl: path,
      bytes: 0,
      schema: null,
      label: null,
      contentVersion: null,
      schemaVersion: null,
      sampleKey: null,
      floorsMet: false,
    };
  }
  const bytes = statSync(path).size;
  const fd = openSync(path, "r");
  const buf = Buffer.alloc(4096);
  const n = readSync(fd, buf, 0, buf.length, 0);
  closeSync(fd);
  const header = buf.subarray(0, n).toString("utf8");
  const schema = extractField(header, "$schema");
  const label = extractField(header, "label");
  const contentVersion = extractField(header, "contentVersion");
  const schemaVersion = extractInt(header, "schemaVersion");
  const sampleKey =
    header.includes('"records"') ? "records" : header.includes('"events"') ? "events" : null;
  return {
    pathOrUrl: path,
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

export function measureLoadtestBanks(repoRoot: string): {
  save: LoadtestBankProbe;
  telemetry: LoadtestBankProbe;
  floorsMet: boolean;
} {
  const save = probeLoadtestBankFile(repoRoot, LOADTEST_SAVE_BANK);
  const telemetry = probeLoadtestBankFile(repoRoot, LOADTEST_TELEMETRY_BANK);
  return { save, telemetry, floorsMet: save.floorsMet && telemetry.floorsMet };
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
  const schema = extractField(header, "$schema");
  const label = extractField(header, "label");
  const contentVersion = extractField(header, "contentVersion");
  const schemaVersion = extractInt(header, "schemaVersion");
  const sampleKey =
    header.includes('"records"') ? "records" : header.includes('"events"') ? "events" : null;
  return {
    pathOrUrl: url,
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

export async function measureLoadtestBanksInBrowser(base = ""): Promise<{
  save: LoadtestBankProbe;
  telemetry: LoadtestBankProbe;
  floorsMet: boolean;
}> {
  const save = await probeLoadtestBankUrl(LOADTEST_SAVE_BANK, base);
  const telemetry = await probeLoadtestBankUrl(LOADTEST_TELEMETRY_BANK, base);
  return { save, telemetry, floorsMet: save.floorsMet && telemetry.floorsMet };
}
