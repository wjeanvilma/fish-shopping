/**
 * Node-only loadtest bank disk probes (vitest / ship scripts).
 * Keep out of the browser bundle — GameHost imports loadtestBanks.ts only.
 */
import { existsSync, openSync, readSync, closeSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  floorsMetFromHeader,
  LOADTEST_SAVE_BANK,
  LOADTEST_TELEMETRY_BANK,
  type LoadtestBankProbe,
  type LoadtestBankRef,
} from "./loadtestBanks";

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
  const measured = floorsMetFromHeader(ref, bytes, header);
  return {
    pathOrUrl: path,
    ...measured,
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
