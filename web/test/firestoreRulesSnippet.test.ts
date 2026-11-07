import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CLOUD_QA_SCENARIO_IDS,
  cloudQaFailures,
  runCloudQaHarness,
} from "../src/cloud/cloudQaHarness";
import { cloudProductionReadiness } from "../src/cloud/cloudProductionPath";
import {
  FIRESTORE_QA_SCENARIO_FLOOR,
  FIRESTORE_RULES_SNIPPET_MARKER,
  FIRESTORE_RULES_SNIPPET_PHASE,
  FIRESTORE_SNIPPET_PATH,
} from "../src/ship/firestoreRulesSnippet";
import { clearCloudOfflineQueue } from "../src/cloud/cloudOfflineQueue";

const root = resolve(__dirname, "../..");
const memory = new Map<string, string>();

describe("firestore rules snippet (Finish 2.0 Phase 26)", () => {
  beforeEach(() => {
    memory.clear();
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => {
        memory.set(k, v);
      },
      removeItem: (k) => {
        memory.delete(k);
      },
      clear: () => memory.clear(),
      key: () => null,
      get length() {
        return memory.size;
      },
    };
  });

  afterEach(() => {
    clearCloudOfflineQueue();
  });

  it("locks ship floors and forbids deployable rules", () => {
    expect(FIRESTORE_RULES_SNIPPET_PHASE).toBe(26);
    expect(FIRESTORE_RULES_SNIPPET_MARKER).toBe("authored-finish-2.0-phase-26");
    expect(FIRESTORE_QA_SCENARIO_FLOOR).toBe(4);
    expect(CLOUD_QA_SCENARIO_IDS).toHaveLength(4);
    expect(existsSync(resolve(root, FIRESTORE_SNIPPET_PATH))).toBe(true);
    expect(existsSync(resolve(root, "firestore.rules"))).toBe(false);
    expect(existsSync(resolve(root, "firebase/firestore.rules"))).toBe(false);
    const listing = JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
      firestoreRulesSnippetPhase?: number;
    };
    expect(listing.firestoreRulesSnippetPhase).toBe(26);
    const ready = cloudProductionReadiness({});
    expect(ready.firestoreRulesInRepo).toBe(false);
    expect(ready.firestoreRulesSnippetShipped).toBe(true);
  });

  it("cloud QA harness scenarios pass", async () => {
    const results = await runCloudQaHarness();
    expect(cloudQaFailures(results)).toEqual([]);
    expect(results.map((r) => r.id)).toEqual([...CLOUD_QA_SCENARIO_IDS]);
  });

  it("firestoreqa:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-firestore-rules-snippet.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK firestoreqa:validate");
  });
});
