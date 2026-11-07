/**
 * Phase 20 (post-1.0) — authored music beds + ducking readiness gate.
 *
 * Usage:
 *   npm run music:validate
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
  const catalog = readJson(resolve(root, "shared/audio/music-pack.json"));
  const sfx = readJson(resolve(root, "shared/audio/sfx-pack.json"));
  const licenses = readJson(resolve(root, "shared/store/licenses.json"));
  const webBus = readFileSync(resolve(root, "web/src/audio/audioBus.ts"), "utf8");
  const androidBus = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/audio/AudioBus.kt"),
    "utf8",
  );
  const host = readFileSync(resolve(root, "web/src/game/GameHost.ts"), "utf8");
  const vm = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");

  if (catalog.phase !== 20) errors.push(`phase expected 20, got ${catalog.phase}`);
  if (catalog.schema !== "fish.audio.music_pack.v1") errors.push("bad schema");
  if (catalog.sampleRate !== 22050) errors.push("sampleRate must be 22050");
  if (catalog.loopDurationSec !== 4) errors.push("loopDurationSec must be 4");
  if (!catalog.replacesProceduralAmbience) errors.push("must replace procedural ambience");
  if (catalog.defaultBed !== "harbor") errors.push("defaultBed must be harbor");

  const beds = catalog.beds as Array<{ id: string; file: string; androidRaw: string; role: string }>;
  if (beds.length < 2) errors.push("need harbor + shop beds");
  const ids = beds.map((b) => b.id);
  if (!ids.includes("harbor") || !ids.includes("shop")) errors.push("beds must include harbor and shop");

  const duck = catalog.ducking;
  if (duck.sfxDuckFactor <= 0 || duck.sfxDuckFactor >= 1) errors.push("sfxDuckFactor must be (0,1)");
  if (duck.focusTransientCanDuckFactor <= 0 || duck.focusTransientCanDuckFactor >= 1) {
    errors.push("focusTransientCanDuckFactor must be (0,1)");
  }
  if (!duck.focusLossSilence) errors.push("focusLossSilence must be true");
  if (!duck.webHiddenSuspendsContext) errors.push("webHiddenSuspendsContext must be true");

  let total = 0;
  for (const bed of beds) {
    const src = resolve(root, catalog.sourceDir, bed.file);
    const web = resolve(root, catalog.webPublicDir, bed.file);
    const raw = resolve(root, catalog.androidRawDir, `${bed.androidRaw}.wav`);
    for (const [label, path] of [
      ["source", src],
      ["web", web],
      ["android", raw],
    ] as const) {
      if (!existsSync(path)) {
        errors.push(`missing ${label} bed ${bed.id}`);
        continue;
      }
      const size = statSync(path).size;
      if (size > catalog.maxBytesPerBed) errors.push(`${label} ${bed.id} over maxBytesPerBed`);
      if (readFileSync(path).subarray(0, 4).toString("ascii") !== "RIFF") {
        errors.push(`${label} ${bed.id} not WAV`);
      }
    }
    if (existsSync(src) && existsSync(web) && sha256(src) !== sha256(web)) {
      errors.push(`${bed.id}: web hash ≠ source — run npm run music:generate`);
    }
    if (existsSync(src) && existsSync(raw) && sha256(src) !== sha256(raw)) {
      errors.push(`${bed.id}: android hash ≠ source — run npm run music:generate`);
    }
    if (existsSync(src)) total += statSync(src).size;
  }
  if (total > catalog.maxTotalBytes) errors.push(`total ${total} exceeds maxTotalBytes`);

  if (!webBus.includes("musicPublicPath") && !webBus.includes("/music/")) {
    errors.push("web AudioBus must load /music/*.wav beds");
  }
  if (!webBus.includes("beginSfxDuck") && !webBus.includes("sfxDucking")) {
    errors.push("web AudioBus must duck music on SFX");
  }
  if (webBus.includes("brown-ish noise bed") || webBus.includes("Soft brown-ish noise")) {
    errors.push("web AudioBus still has procedural ambience");
  }
  if (!androidBus.includes("MediaPlayer")) errors.push("Android AudioBus must use MediaPlayer for beds");
  if (!androidBus.includes("AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK")) {
    errors.push("Android must duck on TRANSIENT_CAN_DUCK");
  }
  if (!androidBus.includes("beginSfxDuck") && !androidBus.includes("sfxDucking")) {
    errors.push("Android AudioBus must duck music on SFX");
  }
  if (androidBus.includes("brown") || androidBus.includes("Random(17)")) {
    errors.push("Android AudioBus still has procedural ambience");
  }

  if (!host.includes("syncMusicBedFromPanels")) {
    errors.push("GameHost must sync music bed from panels");
  }
  if (!vm.includes("syncMusicBedFromPanels")) {
    errors.push("GameViewModel must sync music bed from panels");
  }

  const recordIds = (licenses.records as Array<{ id: string }>).map((r) => r.id);
  if (!recordIds.includes("authored-music")) errors.push("licenses missing authored-music");
  if (recordIds.includes("procedural-ambience")) {
    errors.push("licenses still lists procedural-ambience — replace with authored-music");
  }

  if (sfx.busPolicy.ambienceRemainsProceduralUntilPhase !== 20) {
    errors.push("sfx-pack must still document ambience handoff at Phase 20");
  }

  if (!ci.includes("music:validate")) errors.push("ci.yml missing music:validate");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("music:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK music:validate — harbor/shop beds + ducking wired");
