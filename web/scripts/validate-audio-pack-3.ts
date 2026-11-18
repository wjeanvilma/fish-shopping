/**
 * Finish 3.0 Phase 23 — SFX/music pack 3 readiness.
 *
 * Usage:
 *   npm run audiopack3:validate
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  AUDIO_PACK_3,
  AUDIO_PACK_3_MARKER,
  AUDIO_PACK_3_PHASE,
  AUDIO_PACK_3_SCHEMA,
  NEW_BED_FLOOR_3,
  NEW_STINGER_FLOOR_3,
} from "../src/ship/audioPack3";
import { SFX_PACK3_CUES } from "../src/audio/sfxCues";
import { MUSIC_PACK3_BED_IDS, musicBedForPanels, musicPack } from "../src/audio/musicBeds";
import { sfxPack } from "../src/audio/sfxPack";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/audio-pack-3.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-audio-pack-3.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const licenses = readJson(resolve(root, "shared/store/licenses.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const sfx = readJson(resolve(root, "shared/audio/sfx-pack.json"));
  const music = readJson(resolve(root, "shared/audio/music-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const cuesTs = readFileSync(resolve(root, "web/src/audio/sfxCues.ts"), "utf8");
  const cuesKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/audio/SfxCues.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/AudioPack3.kt"),
    "utf8",
  );
  const finish3Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish3Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 23) errors.push(`phase expected 23, got ${catalog.phase}`);
  if (catalog.schema !== AUDIO_PACK_3_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (AUDIO_PACK_3_PHASE !== 23) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must be 24");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (SCHEMA_VERSION !== 24) errors.push("engine SCHEMA_VERSION must stay 24");
  if (catalog.audioPackMarker !== AUDIO_PACK_3_MARKER) errors.push("marker mismatch");
  if (fixture.audioPackMarker !== AUDIO_PACK_3_MARKER) errors.push("fixture marker mismatch");
  if (catalog.newStingerMin !== 8 || NEW_STINGER_FLOOR_3 !== 8) {
    errors.push("newStingerMin must be 8");
  }
  if (catalog.newBedMin !== 2 || NEW_BED_FLOOR_3 !== 2) errors.push("newBedMin must be 2");
  if ((dod.quotas?.audioPack3Stingers ?? 0) < 8) {
    errors.push("DoD quotas.audioPack3Stingers must be ≥ 8");
  }
  if ((dod.quotas?.audioPack3Beds ?? 0) < 2) {
    errors.push("DoD quotas.audioPack3Beds must be ≥ 2");
  }
  if (listing.audioPack3Phase !== 23) errors.push("listing.audioPack3Phase must be 23");
  if (listing.audioPack3Catalog !== "shared/ship/audio-pack-3.json") {
    errors.push("listing.audioPack3Catalog mismatch");
  }
  if (!pkg.scripts?.["audiopack3:validate"]) {
    errors.push("package.json missing audiopack3:validate");
  }
  if (!ci.includes("audiopack3:validate")) errors.push("ci.yml missing audiopack3:validate");
  if (!pin.fixtures?.includes("parity-audio-pack-3.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-audio-pack-3.json");
  }
  if (pin.audioPack3 !== "shared/ship/audio-pack-3.json") {
    errors.push("RELEASE_PIN.audioPack3 path mismatch");
  }
  if (pin.schemaVersion < 24) errors.push("RELEASE_PIN.schemaVersion must be ≥ 24");

  const licenseIds = new Set((licenses.records ?? []).map((r: { id: string }) => r.id));
  if (!licenseIds.has("authored-audio-pack-3")) {
    errors.push("licenses.json missing authored-audio-pack-3 record");
  }

  // Post-1.0 catalogs keep their phase numbers.
  if (sfx.phase !== 19) errors.push("sfx-pack phase must stay 19");
  if (music.phase !== 20) errors.push("music-pack phase must stay 20");

  // Ducking frozen.
  const frozen = catalog.frozenDucking;
  const duck = music.ducking;
  for (const key of Object.keys(frozen)) {
    if (duck[key] !== frozen[key]) {
      errors.push(`ducking.${key} drifted (expected ${frozen[key]}, got ${duck[key]})`);
    }
  }
  for (const key of Object.keys(fixture.expect.ducking)) {
    if (duck[key] !== fixture.expect.ducking[key]) {
      errors.push(`parity ducking.${key} mismatch`);
    }
  }

  const sfxIds = new Set((sfx.cues as any[]).map((c) => c.id));
  for (const id of catalog.newStingers) {
    if (!sfxIds.has(id)) errors.push(`sfx-pack missing pack-3 cue ${id}`);
    const cue = (sfx.cues as any[]).find((c) => c.id === id);
    if (!cue?.pack3) errors.push(`sfx cue ${id} missing pack3:true`);
    const src = resolve(root, "shared/audio/sfx", cue.file);
    const web = resolve(root, "web/public/sfx", cue.file);
    const raw = resolve(root, "app/src/main/res/raw", `${cue.androidRaw}.wav`);
    for (const p of [src, web, raw]) {
      if (!existsSync(p)) errors.push(`missing ${p}`);
    }
    if (existsSync(src) && existsSync(web) && existsSync(raw)) {
      if (sha(src) !== sha(web) || sha(src) !== sha(raw)) {
        errors.push(`${id} WAV hash mismatch across mirrors`);
      }
      if (statSync(src).size > sfx.maxBytesPerClip) {
        errors.push(`${id} exceeds maxBytesPerClip`);
      }
    }
    if (!SFX_PACK3_CUES.includes(id as any)) errors.push(`SFX_PACK3_CUES missing ${id}`);
    if (!cuesTs.includes(`"${id}"`)) errors.push(`sfxCues.ts missing ${id}`);
    const enumName = id.toUpperCase();
    if (!cuesKt.includes(enumName)) errors.push(`SfxCues.kt missing enum ${enumName}`);
  }
  if (catalog.newStingers.length < catalog.newStingerMin) {
    errors.push("newStingers below floor");
  }

  const musicIds = new Set((music.beds as any[]).map((b) => b.id));
  for (const id of catalog.newBeds) {
    if (!musicIds.has(id)) errors.push(`music-pack missing pack-3 bed ${id}`);
    const bed = (music.beds as any[]).find((b) => b.id === id);
    if (!bed?.pack3) errors.push(`music bed ${id} missing pack3:true`);
    const src = resolve(root, "shared/audio/music", bed.file);
    const web = resolve(root, "web/public/music", bed.file);
    const raw = resolve(root, "app/src/main/res/raw", `${bed.androidRaw}.wav`);
    for (const p of [src, web, raw]) {
      if (!existsSync(p)) errors.push(`missing ${p}`);
    }
    if (existsSync(src) && existsSync(web) && existsSync(raw)) {
      if (sha(src) !== sha(web) || sha(src) !== sha(raw)) {
        errors.push(`${id} bed hash mismatch across mirrors`);
      }
      if (statSync(src).size > music.maxBytesPerBed) {
        errors.push(`${id} exceeds maxBytesPerBed`);
      }
    }
    if (!MUSIC_PACK3_BED_IDS.includes(id as any)) errors.push(`MUSIC_PACK3_BED_IDS missing ${id}`);
  }

  for (const [ev, cue] of Object.entries(fixture.expect.eventMap)) {
    if (sfx.eventMap?.[ev] !== cue) errors.push(`eventMap ${ev} → ${cue} missing`);
  }

  // Bed priority: festival > storm > rival > night > shop > harbor
  if (musicBedForPanels(false, true, true, true, true) !== "festival") {
    errors.push("festival bed priority failed");
  }
  if (musicBedForPanels(true, false, true, true, true) !== "storm") {
    errors.push("storm bed priority failed");
  }
  if (musicBedForPanels(true, false, false, true, true) !== "rival") {
    errors.push("rival bed priority failed");
  }
  if (musicBedForPanels(true, false, false, false, true) !== "night") {
    errors.push("night bed priority failed");
  }
  if (musicBedForPanels(true, false, false, false, false) !== "shop") {
    errors.push("shop bed priority failed");
  }
  if (musicBedForPanels(false, false, false, false, false) !== "harbor") {
    errors.push("harbor bed priority failed");
  }
  if (musicPack.ducking.sfxDuckFactor !== 0.35) {
    errors.push("TS musicPack ducking drifted");
  }
  if (!sfxPack.cues.some((c) => c.id === "rival_open")) {
    errors.push("sfxPack.ts missing rival_open cue");
  }

  const phase23 = (kickoff.phases as any[])?.find((p: any) => p.phase === 23);
  if (!phase23 || phase23.validate !== "audiopack3:validate") {
    errors.push("kickoff phase 23 validate must be audiopack3:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 23) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 23");
  }
  if (!finish3Kt.includes('"audiopack3:validate"') && !finish3Kt.includes("audiopack3:validate")) {
    errors.push("Finish3Kickoff.kt phase 23 missing audiopack3:validate");
  }
  if (!kotlin.includes("NEW_STINGER_MIN") || !kotlin.includes("PACK3")) {
    // AudioPack3 object itself
  }
  if (!kotlin.includes("AUDIO_PACK_MARKER") || !kotlin.includes("NEW_BEDS")) {
    errors.push("Kotlin AudioPack3 missing constants");
  }

  const block = dod.audioPack3;
  if (!block) errors.push("DoD missing audioPack3 block");
  else {
    if (block.phase !== 23) errors.push("DoD audioPack3.phase must be 23");
    if (block.plan !== "30_finish_3.0") errors.push("DoD audioPack3.plan mismatch");
    if (block.status !== "complete") errors.push("DoD audioPack3.status must be complete");
    if (block.audioPackMarker !== AUDIO_PACK_3_MARKER) {
      errors.push("DoD audioPack3 marker mismatch");
    }
  }

  for (const gate of catalog.preflightGates ?? []) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight gate ${gate}`);
  }

  for (const id of AUDIO_PACK_3.newStingers) {
    if (!catalog.newStingers.includes(id)) errors.push(`TS mirror stinger missing ${id}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("audiopack3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK audiopack3:validate — SFX/music pack 3 ready");
