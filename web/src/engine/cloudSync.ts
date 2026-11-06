/**
 * Optional cloud sync conflict policy (Phase 26). Mirrors game-core CloudSync.kt:
 * among checksum-valid snapshots, the newest savedAtEpochMs wins. Local play never
 * requires a remote.
 */
import { crc32Hex } from "./snapshot";

export type SyncSource = "local" | "remote" | "none";

export interface SyncCandidate {
  text: string;
  checksum: string;
  savedAtEpochMs: number;
  schemaVersion: number;
}

export interface SyncDecision {
  text: string | null;
  source: SyncSource;
  reason: string;
}

/**
 * Returns a candidate when the envelope JSON parses and the CRC-32 of `state`
 * matches `checksum`. Corrupt or non-JSON text yields null.
 */
export function peekSnapshot(text: string): SyncCandidate | null {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof root !== "object" || root === null || Array.isArray(root)) return null;
  const env = root as Record<string, unknown>;
  const schemaVersion = env.schemaVersion;
  if (typeof schemaVersion !== "number" || schemaVersion < 1) return null;
  const stateValue = env.state;
  if (typeof stateValue !== "object" || stateValue === null) return null;
  const checksum = env.checksum;
  if (typeof checksum !== "string") return null;
  const actual = crc32Hex(JSON.stringify(stateValue));
  if (checksum !== actual) return null;
  const savedRaw = env.savedAtEpochMs;
  const savedAtEpochMs = typeof savedRaw === "number" && savedRaw >= 0 ? savedRaw : 0;
  return { text, checksum, savedAtEpochMs, schemaVersion };
}

/**
 * Newest checksum-valid snapshot wins. Equal timestamps keep local to avoid
 * pointless rewrites. Missing/corrupt sides are skipped.
 */
export function chooseCloudSnapshot(localText: string | null | undefined, remoteText: string | null | undefined): SyncDecision {
  const local = localText ? peekSnapshot(localText) : null;
  const remote = remoteText ? peekSnapshot(remoteText) : null;
  if (!local && !remote) return { text: null, source: "none", reason: "no valid snapshots" };
  if (!local) return { text: remote!.text, source: "remote", reason: "local missing or corrupt" };
  if (!remote) return { text: local.text, source: "local", reason: "remote missing or corrupt" };
  if (local.checksum === remote.checksum) {
    return { text: local.text, source: "local", reason: "identical checksum" };
  }
  if (remote.savedAtEpochMs > local.savedAtEpochMs) {
    return { text: remote.text, source: "remote", reason: "remote newer" };
  }
  if (local.savedAtEpochMs > remote.savedAtEpochMs) {
    return { text: local.text, source: "local", reason: "local newer" };
  }
  return { text: local.text, source: "local", reason: "equal age; keep local" };
}
