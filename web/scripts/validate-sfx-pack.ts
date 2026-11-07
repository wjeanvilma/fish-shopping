/**
 * Phase 19 (post-1.0) — authored SFX pack readiness gate.
 *
 * Usage:
 *   npm run sfx:validate
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/audio/sfx-pack.json"));
  const licenses = readJson(resolve(root, "shared/store/licenses.json"));
  const webBus = readFileSync(resolve(root, "web/src/audio/audioBus.ts"), "utf8");
  const androidBus = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/audio/AudioBus.kt"),
    "utf8",
  );
  const webCues = readFileSync(resolve(root, "web/src/audio/sfxCues.ts"), "utf8");
  const androidCues = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/audio/SfxCues.kt"),
    "utf8",
  );
  const host = readFileSync(resolve(root, "web/src/game/GameHost.ts"), "utf8");
  const vm = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 19) errors.push(`phase expected 19, got ${catalog.phase}`);
  if (catalog.schema !== "fish.audio.sfx_pack.v1") errors.push("bad schema");
  if (catalog.sampleRate !== 22050) errors.push("sampleRate must be 22050");
  if (catalog.channels !== 1) errors.push("channels must be 1");
  if (catalog.voiceCostPerClip !== 1) errors.push("voiceCostPerClip must be 1");
  if (catalog.maxSfxVoices !== 6) errors.push("maxSfxVoices must be 6");
  if (catalog.busPolicy.proceduralFallback !== false) {
    errors.push("proceduralFallback must be false — authored clips are required");
  }
  if (catalog.busPolicy.ambienceRemainsProceduralUntilPhase !== 20) {
    errors.push("ambience must remain procedural until Phase 20");
  }

  const cues = catalog.cues as Array<{
    id: string;
    file: string;
    androidRaw: string;
    role: string;
    haptic: boolean;
  }>;
  if (cues.length < 7) errors.push("need ≥7 cues (catch/cut/sell/ui + abandon/upgrade/rush)");

  const roles = new Set(cues.map((c) => c.role));
  for (const need of ["catch", "cut", "sell", "ui"]) {
    if (!roles.has(need)) errors.push(`missing role ${need}`);
  }

  const ids = cues.map((c) => c.id);
  for (const need of ["catch", "machine_done", "sale", "ui", "abandon", "upgrade", "rush"]) {
    if (!ids.includes(need)) errors.push(`missing cue ${need}`);
  }

  let total = 0;
  for (const cue of cues) {
    const src = resolve(root, catalog.sourceDir, cue.file);
    const web = resolve(root, catalog.webPublicDir, cue.file);
    const raw = resolve(root, catalog.androidRawDir, `${cue.androidRaw}.wav`);
    for (const [label, path] of [
      ["source", src],
      ["web", web],
      ["android", raw],
    ] as const) {
      if (!existsSync(path)) {
        errors.push(`missing ${label} clip for ${cue.id}: ${path}`);
        continue;
      }
      const size = statSync(path).size;
      if (size < 44) errors.push(`${label} ${cue.id} too small`);
      if (size > catalog.maxBytesPerClip) {
        errors.push(`${label} ${cue.id} exceeds maxBytesPerClip (${size})`);
      }
      const header = readFileSync(path).subarray(0, 4).toString("ascii");
      if (header !== "RIFF") errors.push(`${label} ${cue.id} is not WAV/RIFF`);
    }
    if (existsSync(src) && existsSync(web) && sha256(src) !== sha256(web)) {
      errors.push(`${cue.id}: web public hash ≠ shared source — run npm run sfx:generate`);
    }
    if (existsSync(src) && existsSync(raw) && sha256(src) !== sha256(raw)) {
      errors.push(`${cue.id}: android raw hash ≠ shared source — run npm run sfx:generate`);
    }
    if (existsSync(src)) total += statSync(src).size;
  }
  if (total > catalog.maxTotalBytes) errors.push(`total ${total} exceeds maxTotalBytes`);

  const map = catalog.eventMap as Record<string, string>;
  if (map.fish_caught !== "catch") errors.push("eventMap.fish_caught");
  if (map.batch_completed !== "machine_done") errors.push("eventMap.batch_completed");
  if (map.sale_committed !== "sale") errors.push("eventMap.sale_committed");
  if (map.panel_opened !== "ui") errors.push("eventMap.panel_opened");

  if (!webBus.includes("sfxPublicPath") && !webBus.includes("/sfx/")) {
    errors.push("web AudioBus must load authored /sfx/*.wav");
  }
  if (!webBus.includes("decodeAudioData")) errors.push("web AudioBus must decodeAudioData");
  if (!androidBus.includes("SoundPool")) errors.push("Android AudioBus must use SoundPool");
  if (!androidBus.includes("ensureSoundPool")) errors.push("Android AudioBus missing ensureSoundPool");
  if (webBus.includes("CUES: Record") || webBus.includes("freq: 520")) {
    errors.push("web AudioBus still has procedural SFX tone table");
  }
  if (androidBus.includes("private val cues: Map<SfxCue")) {
    errors.push("Android AudioBus still has procedural Tone map");
  }

  if (!webCues.includes('"ui"') && !webCues.includes("| \"ui\"")) {
    errors.push("web sfxCues missing ui");
  }
  if (!androidCues.includes("UI")) errors.push("Android SfxCues missing UI");
  if (!host.includes('this.audio.play("ui")')) errors.push("GameHost must play ui on panel open");
  if (!vm.includes("SfxCue.UI")) errors.push("GameViewModel must play SfxCue.UI on panel open");

  const recordIds = (licenses.records as Array<{ id: string }>).map((r) => r.id);
  if (!recordIds.includes("authored-sfx")) errors.push("licenses.json missing authored-sfx record");
  // Phase 20 replaces procedural ambience with authored-music beds.
  if (!recordIds.includes("authored-music")) {
    errors.push("licenses.json missing authored-music (Phase 20 music beds)");
  }

  if (!ci.includes("sfx:validate")) errors.push("ci.yml missing sfx:validate");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("sfx:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK sfx:validate — authored catch/cut/sell/UI pack wired (bus policy kept)");
