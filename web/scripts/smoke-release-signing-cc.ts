/**
 * Finish 2.0 Phase 5 — smoke unsigned-fail + signed-release under configuration cache.
 *
 * Usage:
 *   npm run signing:smoke
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function runGradle(args: string[], env: NodeJS.ProcessEnv = {}): { status: number; out: string } {
  const res = spawnSync("./gradlew", args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return { status: res.status ?? 1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function main(): number {
  console.log("Gate A: unsigned checkReleaseUploadSigning must fail…");
  const unsigned = runGradle([
    ":app:checkReleaseUploadSigning",
    "--no-daemon",
    "-PFISH_UPLOAD_FORCE_UNSIGNED=true",
  ]);
  const unsignedOk =
    unsigned.status !== 0 &&
    unsigned.out.includes("Release signing not configured") &&
    /Configuration cache entry (stored|reused)/.test(unsigned.out);
  if (!unsignedOk) {
    console.error("unsigned gate FAILED");
    console.error(unsigned.out.slice(-3000));
    return 1;
  }
  console.log("  OK unsigned fail + configuration cache");

  console.log("Gate B: signed assembleRelease with ephemeral keystore…");
  const dir = mkdtempSync(join(tmpdir(), "fish-upload-"));
  const keystore = join(dir, "smoke.jks");
  try {
    execFileSync(
      "keytool",
      [
        "-genkeypair",
        "-keystore",
        keystore,
        "-storetype",
        "JKS",
        "-storepass",
        "smokepass",
        "-keypass",
        "smokepass",
        "-alias",
        "fishshopping",
        "-keyalg",
        "RSA",
        "-keysize",
        "2048",
        "-validity",
        "1",
        "-dname",
        "CN=FishShopping Smoke,OU=CI,O=Fish,L=Local,ST=NA,C=US",
      ],
      { stdio: "ignore" },
    );
  } catch (e) {
    console.error("keytool failed", e);
    rmSync(dir, { recursive: true, force: true });
    return 1;
  }

  const signed = runGradle([":app:assembleRelease", "--no-daemon"], {
    FISH_UPLOAD_STORE_FILE: keystore,
    FISH_UPLOAD_STORE_PASSWORD: "smokepass",
    FISH_UPLOAD_KEY_ALIAS: "fishshopping",
    FISH_UPLOAD_KEY_PASSWORD: "smokepass",
    FISH_UPLOAD_FORCE_UNSIGNED: "",
  });
  rmSync(dir, { recursive: true, force: true });

  const signedOk =
    signed.status === 0 &&
    signed.out.includes("BUILD SUCCESSFUL") &&
    /Configuration cache entry (stored|reused)/.test(signed.out);
  if (!signedOk) {
    console.error("signed gate FAILED");
    console.error(signed.out.slice(-3000));
    return 1;
  }
  console.log("  OK signed assembleRelease + configuration cache");
  console.log("OK signing:smoke — unsigned-fail + signed-release under configuration cache");
  return 0;
}

process.exit(main());
