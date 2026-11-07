/**
 * Finish 2.0 Phase 21 — SFX/music pack 2 readiness.
 *
 * Usage:
 *   npm run audiopack2:validate
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  AUDIO_PACK_2,
  AUDIO_PACK_2_MARKER,
  AUDIO_PACK_2_PHASE,
  AUDIO_PACK_2_SCHEMA,
  NEW_BED_FLOOR,
  NEW_STINGER_FLOOR,
} from "../src/ship/audioPack2";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";
import { SFX_PACK2_CUES } from "../src/audio/sfxCues";
import { MUSIC_PACK2_BED_IDS, musicBedForPanels, musicPack } from "../src/audio/musicBeds";
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
  const catalog = readJson(resolve(root, "shared/ship/audio-pack-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-audio-pack-2.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const licenses = readJson(resolve(root, "shared/store/licenses.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const sfx = readJson(resolve(root, "shared/audio/sfx-pack.json"));
  const music = readJson(resolve(root, "shared/audio/music-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const cuesTs = readFileSync(resolve(root, "web/src/audio/sfxCues.ts"), "utf8");
  const cuesKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/audio/SfxCues.kt"),
    "utf8",
  );

  if (catalog.phase !== 21) errors.push(`phase expected 21, got ${catalog.phase}`);
  if (catalog.schema !== AUDIO_PACK_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (AUDIO_PACK_2_PHASE !== 21) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.audioPackMarker !== AUDIO_PACK_2_MARKER) errors.push("marker mismatch");
  if (catalog.newStingerMin !== 7 || NEW_STINGER_FLOOR !== 7) errors.push("newStingerMin must be 7");
  if (catalog.newBedMin !== 2 || NEW_BED_FLOOR !== 2) errors.push("newBedMin must be 2");
  if ((dod.quotas?.audioPack2Stingers ?? 0) < 7) {
    errors.push("DoD quotas.audioPack2Stingers must be ≥ 7");
  }
  if ((dod.quotas?.audioPack2Beds ?? 0) < 2) {
    errors.push("DoD quotas.audioPack2Beds must be ≥ 2");
  }
  if (listing.audioPack2Phase !== 21) errors.push("listing.audioPack2Phase must be 21");
  if (listing.audioPack2Catalog !== "shared/ship/audio-pack-2.json") {
    errors.push("listing.audioPack2Catalog mismatch");
  }
  if (!ci.includes("audiopack2:validate")) errors.push("ci.yml missing audiopack2:validate");
  if (!pin.fixtures?.includes("parity-audio-pack-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-audio-pack-2.json");
  }
  if (pin.audioPack2 !== "shared/ship/audio-pack-2.json") {
    errors.push("RELEASE_PIN.audioPack2 path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");

  const licenseIds = new Set((licenses.records ?? []).map((r: { id: string }) => r.id));
  if (!licenseIds.has("authored-audio-pack-2")) {
    errors.push("licenses.json missing authored-audio-pack-2 record");
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
    if (!sfxIds.has(id)) errors.push(`sfx-pack missing pack-2 cue ${id}`);
    const cue = (sfx.cues as any[]).find((c) => c.id === id);
    if (!cue?.pack2) errors.push(`sfx cue ${id} missing pack2:true`);
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
    if (!SFX_PACK2_CUES.includes(id as any)) errors.push(`SFX_PACK2_CUES missing ${id}`);
    if (!cuesTs.includes(`"${id}"`)) errors.push(`sfxCues.ts missing ${id}`);
    const enumName = id.toUpperCase();
    if (!cuesKt.includes(enumName)) errors.push(`SfxCues.kt missing enum ${enumName}`);
  }
  if (catalog.newStingers.length < catalog.newStingerMin) {
    errors.push("newStingers below floor");
  }

  const musicIds = new Set((music.beds as any[]).map((b) => b.id));
  for (const id of catalog.newBeds) {
    if (!musicIds.has(id)) errors.push(`music-pack missing pack-2 bed ${id}`);
    const bed = (music.beds as any[]).find((b) => b.id === id);
    if (!bed?.pack2) errors.push(`music bed ${id} missing pack2:true`);
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
    if (!MUSIC_PACK2_BED_IDS.includes(id as any)) errors.push(`MUSIC_PACK2_BED_IDS missing ${id}`);
  }

  // Event map + bed priority smoke.
  for (const [ev, cue] of Object.entries(fixture.expect.eventMap)) {
    if (sfx.eventMap?.[ev] !== cue) errors.push(`eventMap ${ev} → ${cue} missing`);
  }
  if (musicBedForPanels(false, true, false) !== "festival") {
    errors.push("festival bed priority failed");
  }
  if (musicBedForPanels(true, false, true) !== "storm") {
    errors.push("storm bed priority failed");
  }
  if (musicBedForPanels(true, false, false) !== "shop") {
    errors.push("shop bed priority failed");
  }
  if (musicPack.ducking.sfxDuckFactor !== 0.35) {
    errors.push("TS musicPack ducking drifted");
  }
  if (!sfxPack.cues.some((c) => c.id === "achievement")) {
    errors.push("sfxPack.ts missing achievement cue");
  }

  for (const gate of catalog.preflightGates ?? []) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight gate ${gate}`);
  }

  for (const id of AUDIO_PACK_2.newStingers) {
    if (!catalog.newStingers.includes(id)) errors.push(`TS mirror stinger missing ${id}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("audiopack2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK audiopack2:validate — SFX/music pack 2 ready");
