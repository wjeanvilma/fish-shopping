/**
 * Finish 5.0 Phase 12 — audio pack 5 + VFX juice 5 readiness.
 *
 * Usage:
 *   npm run audiovfx5:validate
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { SFX_PACK5_CUES, sfxFromEvent } from "../src/audio/sfxCues";
import { MUSIC_PACK5_BED_IDS, musicBedForPanels, musicPack } from "../src/audio/musicBeds";
import { sfxPack } from "../src/audio/sfxPack";
import {
  AUDIO_PACK_5,
  AUDIO_PACK_5_MARKER,
  AUDIO_PACK_5_PHASE,
  AUDIO_PACK_5_SCHEMA,
  NEW_BED_FLOOR_5,
  NEW_STINGER_FLOOR_5,
} from "../src/ship/audioPack5";
import {
  VFX_JUICE_5,
  VFX_JUICE_5_MARKER,
  VFX_JUICE_5_PHASE,
  VFX_JUICE_5_SCHEMA,
  VFX5_BURST_FLOOR,
  VFX5_PRESSURE_AMBIENT_FLOOR,
  VFX5_SHAKE_FLOOR,
} from "../src/ship/vfxJuice5";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  PRESSURE_AMBIENT_MODE_IDS,
  pressureAmbientIdForView,
} from "../src/render/weatherAmbient";

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
  const audioCat = readJson(resolve(root, "shared/ship/audio-pack-5.json"));
  const vfxCat = readJson(resolve(root, "shared/ship/vfx-juice-5.json"));
  const audioFx = readJson(resolve(root, "shared/fixtures/parity-audio-pack-5.json"));
  const vfxFx = readJson(resolve(root, "shared/fixtures/parity-vfx-juice-5.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const licenses = readJson(resolve(root, "shared/store/licenses.json"));
  const budget = readJson(resolve(root, "shared/perf/budget-gate.json"));
  const sfx = readJson(resolve(root, "shared/audio/sfx-pack.json"));
  const music = readJson(resolve(root, "shared/audio/music-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const hostBus = readFileSync(resolve(root, "web/src/game/host/hostStepBus.ts"), "utf8");
  const vfxTs = readFileSync(resolve(root, "web/src/render/presenters/vfx.ts"), "utf8");
  const ambientTs = readFileSync(resolve(root, "web/src/render/weatherAmbient.ts"), "utf8");
  const vmKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );
  const vmStepBusKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/vm/VmStepBus.kt"),
    "utf8",
  );

  if (audioCat.phase !== 12 || vfxCat.phase !== 12) errors.push("phase expected 12");
  if (audioCat.schema !== AUDIO_PACK_5_SCHEMA) errors.push("audio schema mismatch");
  if (vfxCat.schema !== VFX_JUICE_5_SCHEMA) errors.push("vfx schema mismatch");
  if (audioCat.plan !== "30_finish_5.0" || vfxCat.plan !== "30_finish_5.0") {
    errors.push("plan must be 30_finish_5.0");
  }
  if (AUDIO_PACK_5_PHASE !== 12 || VFX_JUICE_5_PHASE !== 12) errors.push("phase mirror mismatch");
  if (audioCat.audioPackMarker !== AUDIO_PACK_5_MARKER) errors.push("audio marker mismatch");
  if (vfxCat.vfxJuice5Marker !== VFX_JUICE_5_MARKER) errors.push("vfx marker mismatch");
  if (audioFx.audioPackMarker !== AUDIO_PACK_5_MARKER) errors.push("audio fixture marker mismatch");
  if (vfxFx.vfxJuice5Marker !== VFX_JUICE_5_MARKER) errors.push("vfx fixture marker mismatch");
  if (audioCat.contentVersion !== "4.0.0" || vfxCat.contentVersion !== "4.0.0") {
    errors.push("contentVersion must stay 4.0.0");
  }
  if (audioCat.schemaVersion !== 25 || vfxCat.schemaVersion !== 25) {
    errors.push("schemaVersion must stay 25");
  }
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  if (audioCat.newStingerMin !== 5 || NEW_STINGER_FLOOR_5 !== 5) {
    errors.push("newStingerMin must be 5");
  }
  if (audioCat.newBedMin !== 1 || NEW_BED_FLOOR_5 !== 1) errors.push("newBedMin must be 1");
  if (SFX_PACK5_CUES.length < 5) errors.push("SFX_PACK5_CUES short");
  if (MUSIC_PACK5_BED_IDS.length < 1) errors.push("MUSIC_PACK5_BED_IDS short");

  for (const id of AUDIO_PACK_5.newStingers) {
    const cue = sfx.cues.find((c: any) => c.id === id);
    if (!cue || !cue.pack5) errors.push(`sfx missing pack5 cue ${id}`);
    else {
      const shared = resolve(root, `shared/audio/sfx/${cue.file}`);
      const web = resolve(root, `web/public/sfx/${cue.file}`);
      const raw = resolve(root, `app/src/main/res/raw/${cue.androidRaw}.wav`);
      for (const p of [shared, web, raw]) {
        if (!existsSync(p)) errors.push(`missing wav ${p}`);
      }
      if (existsSync(shared) && existsSync(web) && existsSync(raw)) {
        const a = sha(shared);
        if (sha(web) !== a || sha(raw) !== a) errors.push(`wav mirror drift ${id}`);
      }
    }
  }
  for (const id of AUDIO_PACK_5.newBeds) {
    const bed = music.beds.find((b: any) => b.id === id);
    if (!bed || !bed.pack5) errors.push(`music missing pack5 bed ${id}`);
    else {
      const shared = resolve(root, `shared/audio/music/${bed.file}`);
      const web = resolve(root, `web/public/music/${bed.file}`);
      const raw = resolve(root, `app/src/main/res/raw/${bed.androidRaw}.wav`);
      for (const p of [shared, web, raw]) {
        if (!existsSync(p)) errors.push(`missing music wav ${p}`);
      }
    }
  }

  const duck = music.ducking;
  const frozen = audioCat.frozenDucking;
  for (const k of Object.keys(frozen)) {
    if (duck[k] !== frozen[k]) errors.push(`ducking drift on ${k}`);
  }

  if (musicBedForPanels(false, true, true, true, true, true, true, true) !== "festival") {
    errors.push("bed priority festival broken");
  }
  if (musicBedForPanels(true, false, false, false, false, false, false, true) !== "pressure") {
    errors.push("bed priority pressure broken");
  }
  if (musicBedForPanels(true, false, false, false, false, false, true, true) !== "ledger") {
    errors.push("bed priority ledger over pressure broken");
  }

  if (vfxCat.eventBurstMin !== 5 || VFX5_BURST_FLOOR !== 5) errors.push("burst floor must be 5");
  if (vfxCat.eventShakeMin !== 2 || VFX5_SHAKE_FLOOR !== 2) errors.push("shake floor must be 2");
  if (vfxCat.pressureAmbientMin !== 3 || VFX5_PRESSURE_AMBIENT_FLOOR !== 3) {
    errors.push("pressure ambient floor must be 3");
  }
  for (const kind of VFX_JUICE_5.eventBursts.kinds) {
    if (!vfxTs.includes(`"${kind}"`)) errors.push(`vfx.ts missing burst kind ${kind}`);
  }
  for (const kind of VFX_JUICE_5.eventBursts.kinds) {
    const camel = kind.split("_").map((p) => p[0]!.toUpperCase() + p.slice(1)).join("");
    if (!hostBus.includes(`resolve${camel}Burst`) && !vfxTs.includes(`resolve${camel}Burst`)) {
      errors.push(`missing resolve${camel}Burst`);
    }
    if (!vmKt.includes(`resolve${camel}Burst`) && !vmStepBusKt.includes(`resolve${camel}Burst`)) {
      errors.push(`GameViewModel/VmStepBus missing resolve${camel}Burst`);
    }
  }
  for (const kind of VFX_JUICE_5.eventShake.kinds) {
    if (!vfxTs.includes(`"${kind}"`)) errors.push(`vfx.ts missing shake kind ${kind}`);
  }
  if (PRESSURE_AMBIENT_MODE_IDS.length < 3) errors.push("PRESSURE_AMBIENT_MODE_IDS short");
  if (!ambientTs.includes("PRESSURE_AMBIENT_MODE_IDS")) {
    errors.push("weatherAmbient missing PRESSURE_AMBIENT_MODE_IDS");
  }
  if (pressureAmbientIdForView(0, 0, null, null) !== "calm") errors.push("pressure ambient calm broken");
  if (pressureAmbientIdForView(800, 0, null, null) !== "rising") {
    errors.push("pressure ambient rising broken");
  }
  if (pressureAmbientIdForView(1100, 0, null, null) !== "critical") {
    errors.push("pressure ambient critical broken");
  }

  if (sfxFromEvent({ type: "cast_strike_reel" }) !== "cast_strike") {
    errors.push("sfx cast_strike map broken");
  }
  if (sfxFromEvent({ type: "spoil_pressure_warn" }) !== "spoil_warn") {
    errors.push("sfx spoil_warn map broken");
  }
  if (sfxFromEvent({ type: "service_queue_pressure" }) !== "service_queue") {
    errors.push("sfx service_queue map broken");
  }
  if (sfxFromEvent({ type: "contract_deadline_warn" }) !== "contract_deadline") {
    errors.push("sfx contract_deadline map broken");
  }
  if (sfxFromEvent({ type: "quest_near_complete" }) !== "quest_near") {
    errors.push("sfx quest_near map broken");
  }
  if (!sfxPack.cues.some((c) => c.id === "cast_strike")) {
    errors.push("sfxPack.ts missing cast_strike cue");
  }
  if (budget.vfxJuice5Phase !== 12) errors.push("budget-gate vfxJuice5Phase must be 12");
  if (budget.vfxJuice5Catalog !== "shared/ship/vfx-juice-5.json") {
    errors.push("budget-gate vfxJuice5Catalog mismatch");
  }

  const phase12 = (kickoff.phases as any[])?.find((p) => p.phase === 12);
  if (!phase12 || phase12.validate !== "audiovfx5:validate") {
    errors.push("kickoff phase 12 validate must be audiovfx5:validate");
  }
  if (phase12?.id !== "audio-vfx-5") errors.push("kickoff phase 12 id must be audio-vfx-5");
  if (!finish5Kt.includes("audiovfx5:validate")) {
    errors.push("Finish5Kickoff.kt missing audiovfx5:validate");
  }
  if (kickoff.gaps?.audioVfx5Incomplete !== false) {
    errors.push("kickoff gaps.audioVfx5Incomplete must be false");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("audioVfx5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop audioVfx5Incomplete after Phase 12");
  }
  const openBlock = finish5Kt.slice(
    finish5Kt.indexOf("OPEN_GAP_FLAGS"),
    finish5Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openBlock.includes("audioVfx5Incomplete")) {
    errors.push("Finish5Kickoff OPEN_GAP_FLAGS must drop audioVfx5Incomplete");
  }

  if (listing.audioPack5Phase !== 12) errors.push("listing.audioPack5Phase must be 12");
  if (listing.vfxJuice5Phase !== 12) errors.push("listing.vfxJuice5Phase must be 12");
  if (listing.audioPack5Catalog !== "shared/ship/audio-pack-5.json") {
    errors.push("listing.audioPack5Catalog mismatch");
  }
  if (listing.vfxJuice5Catalog !== "shared/ship/vfx-juice-5.json") {
    errors.push("listing.vfxJuice5Catalog mismatch");
  }
  if (pin.audioPack5 !== "shared/ship/audio-pack-5.json") errors.push("RELEASE_PIN.audioPack5 missing");
  if (pin.vfxJuice5 !== "shared/ship/vfx-juice-5.json") errors.push("RELEASE_PIN.vfxJuice5 missing");
  if (!pin.fixtures?.includes("parity-audio-pack-5.json")) {
    errors.push("RELEASE_PIN missing parity-audio-pack-5.json");
  }
  if (!pin.fixtures?.includes("parity-vfx-juice-5.json")) {
    errors.push("RELEASE_PIN missing parity-vfx-juice-5.json");
  }

  const audioBlock = dod.audioPack5;
  const vfxBlock = dod.vfxJuice5;
  if (!audioBlock || audioBlock.status !== "complete") errors.push("DoD audioPack5 incomplete");
  if (!vfxBlock || vfxBlock.status !== "complete") errors.push("DoD vfxJuice5 incomplete");
  if ((dod.quotas?.audioPack5Stingers ?? 0) < 5) errors.push("DoD quotas.audioPack5Stingers < 5");
  if ((dod.quotas?.audioPack5Beds ?? 0) < 1) errors.push("DoD quotas.audioPack5Beds < 1");
  if ((dod.quotas?.vfxJuice5BurstKinds ?? 0) < 5) errors.push("DoD quotas.vfxJuice5BurstKinds < 5");
  if ((dod.quotas?.vfxJuice5ShakeKinds ?? 0) < 2) errors.push("DoD quotas.vfxJuice5ShakeKinds < 2");
  if ((dod.quotas?.pressureAmbientModes ?? 0) < 3) errors.push("DoD quotas.pressureAmbientModes < 3");

  const licenseIds = new Set((licenses.records ?? []).map((n: any) => n.id));
  if (!licenseIds.has("authored-audio-pack-5")) {
    errors.push("licenses.json missing authored-audio-pack-5 record");
  }

  if (!pkg.scripts?.["audiovfx5:validate"]) errors.push("package.json missing audiovfx5:validate");
  if (!ci.includes("audiovfx5:validate")) errors.push("ci.yml missing audiovfx5:validate");
  if (!existsSync(resolve(root, "shared/tools/author_audio_vfx_5.py"))) {
    errors.push("missing author_audio_vfx_5.py");
  }
  if (audioFx.expect?.audioVfx5IncompleteClosed !== true) {
    errors.push("parity audio must expect audioVfx5IncompleteClosed");
  }
  if (vfxFx.expect?.audioVfx5IncompleteClosed !== true) {
    errors.push("parity vfx must expect audioVfx5IncompleteClosed");
  }

  for (const gate of [...AUDIO_PACK_5.preflightGates, ...VFX_JUICE_5.preflightGates]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  let sfxTotal = 0;
  for (const cue of sfx.cues) {
    const p = resolve(root, `shared/audio/sfx/${cue.file}`);
    if (existsSync(p)) sfxTotal += statSync(p).size;
  }
  if (sfxTotal > sfx.maxTotalBytes) errors.push(`sfx total ${sfxTotal} > maxTotalBytes`);
  let musicTotal = 0;
  for (const bed of music.beds) {
    const p = resolve(root, `shared/audio/music/${bed.file}`);
    if (existsSync(p)) musicTotal += statSync(p).size;
  }
  if (musicTotal > music.maxTotalBytes) errors.push(`music total ${musicTotal} > maxTotalBytes`);
  if (musicPack.maxTotalBytes < musicTotal) errors.push("musicBeds maxTotalBytes mirror short");
  if (sfxPack.maxTotalBytes < sfxTotal) errors.push("sfxPack maxTotalBytes mirror short");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("audiovfx5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK audiovfx5:validate — audio pack 5 + VFX juice 5 wired; audioVfx5Incomplete closed");
