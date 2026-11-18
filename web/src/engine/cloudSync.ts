/**
 * Optional cloud sync conflict policy (Phase 26). Mirrors game-core CloudSync.kt:
 * among checksum-valid snapshots, the newest savedAtEpochMs wins. Local play never
 * requires a remote.
 *
 * Phase 11 surfaces a dual-snapshot choice when both sides are valid and differ;
 * chooseCloudSnapshot still names the recommended side.
 */
import { crc32Hex } from "./snapshot";

export type SyncSource = "local" | "remote" | "none";

export interface SyncCandidate {
  text: string;
  checksum: string;
  savedAtEpochMs: number;
  schemaVersion: number;
  harborId: string;
  coins: number;
  tick: number;
}

export interface SyncDecision {
  text: string | null;
  source: SyncSource;
  reason: string;
}

/** Phase 11 dual-snapshot choice row (coins / harbor / playtime / timestamp). */
export interface SnapshotSummary {
  source: SyncSource;
  harborId: string;
  coins: number;
  tick: number;
  savedAtEpochMs: number;
  checksum: string;
}

/** When both local and remote are valid but differ, UI must ask before applying. */
export interface CloudConflictOffer {
  local: SnapshotSummary;
  remote: SnapshotSummary;
  recommended: SyncSource;
  reason: string;
  /** Finish 4.0 Phase 21 — stable machine code for the human reason. */
  reasonCode: string;
  /** Finish 4.0 Phase 21 — short UX hints describing local vs remote diffs. */
  diffHints: string[];
  localText: string;
  remoteText: string;
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
  const state = stateValue as Record<string, unknown>;
  const checksum = env.checksum;
  if (typeof checksum !== "string") return null;
  const actual = crc32Hex(JSON.stringify(stateValue));
  if (checksum !== actual) return null;
  const savedRaw = env.savedAtEpochMs;
  const savedAtEpochMs = typeof savedRaw === "number" && savedRaw >= 0 ? savedRaw : 0;
  const harborId = typeof state.harborId === "string" ? state.harborId : "";
  const coins = typeof state.coins === "number" && state.coins >= 0 ? Math.trunc(state.coins) : 0;
  const tick = typeof state.tick === "number" && state.tick >= 0 ? Math.trunc(state.tick) : 0;
  return { text, checksum, savedAtEpochMs, schemaVersion, harborId, coins, tick };
}

export function summaryOf(candidate: SyncCandidate, source: SyncSource): SnapshotSummary {
  return {
    source,
    harborId: candidate.harborId,
    coins: candidate.coins,
    tick: candidate.tick,
    savedAtEpochMs: candidate.savedAtEpochMs,
    checksum: candidate.checksum,
  };
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

/** Finish 4.0 Phase 21 — map human reason → stable code. */
export function cloudConflictReasonCode(reason: string): string {
  switch (reason) {
    case "remote newer":
      return "remote_newer";
    case "local newer":
      return "local_newer";
    case "equal age; keep local":
      return "equal_age";
    default:
      return "conflict";
  }
}

/** Finish 4.0 Phase 21 — coin / harbor / playtime / age hints for conflict UX. */
export function cloudConflictDiffHints(local: SnapshotSummary, remote: SnapshotSummary): string[] {
  const hints: string[] = [];
  const coinDelta = remote.coins - local.coins;
  if (coinDelta > 0) hints.push(`Cloud has ${coinDelta} more coins`);
  else if (coinDelta < 0) hints.push(`This device has ${-coinDelta} more coins`);
  if (local.harborId && remote.harborId && local.harborId !== remote.harborId) {
    hints.push(`Different harbors (${local.harborId} vs ${remote.harborId})`);
  }
  const tickDelta = remote.tick - local.tick;
  if (tickDelta > 0) hints.push("Cloud has more playtime");
  else if (tickDelta < 0) hints.push("This device has more playtime");
  const ageDelta = remote.savedAtEpochMs - local.savedAtEpochMs;
  if (ageDelta > 0) hints.push("Cloud save is newer");
  else if (ageDelta < 0) hints.push("This device save is newer");
  else hints.push("Same save age; prefer this device");
  return hints;
}

/**
 * Phase 11: when both sides are checksum-valid and differ, return a dual-choice
 * offer. Recommended side follows chooseCloudSnapshot. Null means auto-apply is fine.
 */
export function cloudConflictOffer(
  localText: string | null | undefined,
  remoteText: string | null | undefined,
): CloudConflictOffer | null {
  const local = localText ? peekSnapshot(localText) : null;
  const remote = remoteText ? peekSnapshot(remoteText) : null;
  if (!local || !remote) return null;
  if (local.checksum === remote.checksum) return null;
  const decision = chooseCloudSnapshot(localText, remoteText);
  const recommended: SyncSource = decision.source === "remote" ? "remote" : "local";
  const localSummary = summaryOf(local, "local");
  const remoteSummary = summaryOf(remote, "remote");
  return {
    local: localSummary,
    remote: remoteSummary,
    recommended,
    reason: decision.reason,
    reasonCode: cloudConflictReasonCode(decision.reason),
    diffHints: cloudConflictDiffHints(localSummary, remoteSummary),
    localText: local.text,
    remoteText: remote.text,
  };
}
