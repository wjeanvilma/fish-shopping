import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DATA_SAFETY_PHASE,
  DATA_SAFETY_SCHEMA,
  analyticsEventsMatchEngine,
  collectedPlayTypeIds,
  dataSafety,
  forbiddenKeysCovered,
} from "../src/store/dataSafety";
import { PRIVACY_POLICY_URL, storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Play Data safety (post-1.0 Phase 8)", () => {
  it("catalog admits optional collection with no PII / no card details", () => {
    expect(DATA_SAFETY_PHASE).toBe(8);
    expect(DATA_SAFETY_SCHEMA).toBe("fish.store.data_safety.v1");
    expect(dataSafety.packageName).toBe(storeListing.packageName);
    expect(dataSafety.privacyPolicyUrl).toBe(PRIVACY_POLICY_URL);
    expect(dataSafety.overview.collectsOrSharesUserData).toBe(true);
    expect(dataSafety.overview.encryptedInTransit).toBe(true);
    expect(dataSafety.overview.usersCanRequestDeletion).toBe(true);
    expect(dataSafety.analytics.noPiiClaim).toBe(true);
    expect(dataSafety.analytics.consentDefault).toBe(false);
    expect(dataSafety.cloudSync.defaultOff).toBe(true);
    expect(dataSafety.cloudSync.storesEmailOrDisplayName).toBe(false);
    expect(dataSafety.purchases.developerReceivesCardDetails).toBe(false);
    expect(dataSafety.purchases.playFormDeclaresUserPaymentInfo).toBe(false);
    for (const pii of ["name", "email_address", "phone_number", "user_payment_info"]) {
      expect(dataSafety.dataNotCollected).toContain(pii);
    }
    expect(collectedPlayTypeIds().sort()).toEqual(
      ["app_interactions", "device_or_other_ids", "diagnostics", "other_actions"].sort(),
    );
    for (const row of dataSafety.dataCollected.filter((r) => r.collected)) {
      expect(row.shared).toBe(false);
      expect(row.required).toBe(false);
    }
  });

  it("matches analytics engine allowlist and Autobackup excludes", () => {
    expect(analyticsEventsMatchEngine()).toBe(true);
    expect(forbiddenKeysCovered()).toBe(true);
    expect(dataSafety.androidBackup.excludesSaves).toBe(true);
    const hardening = JSON.parse(
      readFileSync(resolve(root, "shared/android/release-hardening.json"), "utf8"),
    );
    expect(dataSafety.androidBackup.excludedSharedPreferences).toEqual(
      hardening.backupExcludes.sharedPreferences,
    );
    expect(dataSafety.androidBackup.excludedFiles).toEqual(hardening.backupExcludes.files);
    expect(existsSync(resolve(root, "shared/store/data-safety.json"))).toBe(true);
    expect((storeListing as { dataSafetyPhase?: number }).dataSafetyPhase).toBe(8);
  });

  it("data-safety:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-data-safety.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK data-safety:validate");
  });
});
