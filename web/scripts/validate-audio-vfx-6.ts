/**
 * Finish 6.0 Phase 12 — audio pack 6 + VFX juice 6 readiness.
 *
 * Usage:
 *   npm run audiovfx6:validate
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { SFX_PACK6_CUES, sfxFromEvent } from "../src/audio/sfxCues";
import { MUSIC_PACK6_BED_IDS, musicBedForPanels, musicPack } from "../src/audio/musicBeds";
import { sfxPack } from "../src/audio/sfxPack";
import {
  AUDIO_PACK_6,
  AUDIO_PACK_6_MARKER,
  AUDIO_PACK_6_PHASE,
  AUDIO_PACK_6_SCHEMA,
  NEW_BED_FLOOR_6,
  NEW_STINGER_FLOOR_6,
} from "../src/ship/audioPack6";
import {
  VFX_JUICE_6,
  VFX_JUICE_6_MARKER,
  VFX_JUICE_6_PHASE,
  VFX_JUICE_6_SCHEMA,
  VFX6_BURST_FLOOR,
  VFX6_NEST_AMBIENT_FLOOR,
  VFX6_SHAKE_FLOOR,
} from "../src/ship/vfxJuice6";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  NEST_AMBIENT_MODE_IDS,
  nestAmbientIdForView,
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
  const audioCat = readJson(resolve(root, "shared/ship/audio-pack-6.json"));
  const vfxCat = readJson(resolve(root, "shared/ship/vfx-juice-6.json"));
  const audioFx = readJson(resolve(root, "shared/fixtures/parity-audio-pack-6.json"));
  const vfxFx = readJson(resolve(root, "shared/fixtures/parity-vfx-juice-6.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const licenses = readJson(resolve(root, "shared/store/licenses.json"));
  const budget = readJson(resolve(root, "shared/perf/budget-gate.json"));
  const sfx = readJson(resolve(root, "shared/audio/sfx-pack.json"));
  const music = readJson(resolve(root, "shared/audio/music-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const hostBus = readFileSync(resolve(root, "web/src/game/host/hostStepBus.ts"), "utf8");
  const vfxTs = readFileSync(resolve(root, "web/src/render/presenters/vfx.ts"), "utf8");
  const ambientTs = readFileSync(resolve(root, "web/src/render/weatherAmbient.ts"), "utf8");
  const vmStepBusKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/vm/VmStepBus.kt"),
    "utf8",
  );

  if (audioCat.phase !== 12 || vfxCat.phase !== 12) errors.push("phase expected 12");
  if (audioCat.schema !== AUDIO_PACK_6_SCHEMA) errors.push("audio schema mismatch");
  if (vfxCat.schema !== VFX_JUICE_6_SCHEMA) errors.push("vfx schema mismatch");
  if (audioCat.plan !== "30_finish_6.0" || vfxCat.plan !== "30_finish_6.0") {
    errors.push("plan must be 30_finish_6.0");
  }
  if (AUDIO_PACK_6_PHASE !== 12 || VFX_JUICE_6_PHASE !== 12) errors.push("phase mirror mismatch");
  if (audioCat.audioPackMarker !== AUDIO_PACK_6_MARKER) errors.push("audio marker mismatch");
  if (vfxCat.vfxJuice6Marker !== VFX_JUICE_6_MARKER) errors.push("vfx marker mismatch");
  if (audioFx.audioPackMarker !== AUDIO_PACK_6_MARKER) errors.push("audio fixture marker mismatch");
  if (vfxFx.vfxJuice6Marker !== VFX_JUICE_6_MARKER) errors.push("vfx fixture marker mismatch");
  if (audioCat.contentVersion !== "5.0.0" || vfxCat.contentVersion !== "5.0.0") {
    errors.push("contentVersion must stay 5.0.0");
  }
  if (audioCat.schemaVersion !== 26 || vfxCat.schemaVersion !== 26) {
    errors.push("schemaVersion must stay 26");
  }
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");

  if (audioCat.newStingerMin !== 5 || NEW_STINGER_FLOOR_6 !== 5) {
    errors.push("newStingerMin must be 5");
  }
  if (audioCat.newBedMin !== 1 || NEW_BED_FLOOR_6 !== 1) errors.push("newBedMin must be 1");
  if (SFX_PACK6_CUES.length < 5) errors.push("SFX_PACK6_CUES short");
  if (MUSIC_PACK6_BED_IDS.length < 1) errors.push("MUSIC_PACK6_BED_IDS short");

  for (const id of AUDIO_PACK_6.newStingers) {
    const cue = sfx.cues.find((c: any) => c.id === id);
    if (!cue || !cue.pack6) errors.push(`sfx missing pack6 cue ${id}`);
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
  for (const id of AUDIO_PACK_6.newBeds) {
    const bed = music.beds.find((b: any) => b.id === id);
    if (!bed || !bed.pack6) errors.push(`music missing pack6 bed ${id}`);
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

  if (musicBedForPanels(false, true, true, true, true, true, true, true, true) !== "festival") {
    errors.push("bed priority festival broken");
  }
  if (musicBedForPanels(true, false, false, false, false, false, false, true, true) !== "pressure") {
    errors.push("bed priority pressure over nest broken");
  }
  if (musicBedForPanels(true, false, false, false, false, false, false, false, true) !== "nest") {
    errors.push("bed priority nest broken");
  }
  if (musicBedForPanels(true, false, false, false, false, false, true, true, true) !== "ledger") {
    errors.push("bed priority ledger over nest broken");
  }

  if (vfxCat.eventBurstMin !== 5 || VFX6_BURST_FLOOR !== 5) errors.push("burst floor must be 5");
  if (vfxCat.eventShakeMin !== 2 || VFX6_SHAKE_FLOOR !== 2) errors.push("shake floor must be 2");
  if (vfxCat.nestAmbientMin !== 3 || VFX6_NEST_AMBIENT_FLOOR !== 3) {
    errors.push("nest ambient floor must be 3");
  }
  for (const kind of VFX_JUICE_6.eventBursts.kinds) {
    if (!vfxTs.includes(`"${kind}"`)) errors.push(`vfx.ts missing burst kind ${kind}`);
  }
  for (const kind of VFX_JUICE_6.eventBursts.kinds) {
    const camel = kind.split("_").map((p) => p[0]!.toUpperCase() + p.slice(1)).join("");
    if (!hostBus.includes(`resolve${camel}Burst`) && !vfxTs.includes(`resolve${camel}Burst`)) {
      errors.push(`missing resolve${camel}Burst`);
    }
    if (!vmStepBusKt.includes(`resolve${camel}Burst`)) {
      errors.push(`VmStepBus missing resolve${camel}Burst`);
    }
  }
  for (const kind of VFX_JUICE_6.eventShake.kinds) {
    if (!vfxTs.includes(`"${kind}"`)) errors.push(`vfx.ts missing shake kind ${kind}`);
  }
  if (NEST_AMBIENT_MODE_IDS.length < 3) errors.push("NEST_AMBIENT_MODE_IDS short");
  if (!ambientTs.includes("NEST_AMBIENT_MODE_IDS")) {
    errors.push("weatherAmbient missing NEST_AMBIENT_MODE_IDS");
  }
  if (nestAmbientIdForView(0, false) !== "idle") errors.push("nest ambient idle broken");
  if (nestAmbientIdForView(1, false) !== "roosting") errors.push("nest ambient roosting broken");
  if (nestAmbientIdForView(3, false) !== "settled") errors.push("nest ambient settled broken");
  if (nestAmbientIdForView(0, true) !== "roosting") {
    errors.push("nest ambient night roosting broken");
  }

  if (sfxFromEvent({ type: "nest_settle_pulse" }) !== "nest_settle") {
    errors.push("sfx nest_settle map broken");
  }
  if (sfxFromEvent({ type: "roast_cycle_ready" }) !== "roast_ready") {
    errors.push("sfx roast_ready map broken");
  }
  if (sfxFromEvent({ type: "ferment_cycle_ready" }) !== "ferment_ready") {
    errors.push("sfx ferment_ready map broken");
  }
  if (sfxFromEvent({ type: "school_flash" }) !== "school_flash") {
    errors.push("sfx school_flash map broken");
  }
  if (sfxFromEvent({ type: "aurora_crest" }) !== "aurora_crest") {
    errors.push("sfx aurora_crest map broken");
  }
  if (!sfxPack.cues.some((c) => c.id === "nest_settle")) {
    errors.push("sfxPack.ts missing nest_settle cue");
  }
  if (budget.vfxJuice6Phase !== 12) errors.push("budget-gate vfxJuice6Phase must be 12");
  if (budget.vfxJuice6Catalog !== "shared/ship/vfx-juice-6.json") {
    errors.push("budget-gate vfxJuice6Catalog mismatch");
  }

  const phase12 = (kickoff.phases as any[])?.find((p) => p.phase === 12);
  if (!phase12 || phase12.validate !== "audiovfx6:validate") {
    errors.push("kickoff phase 12 validate must be audiovfx6:validate");
  }
  if (phase12?.id !== "audio-vfx-6") errors.push("kickoff phase 12 id must be audio-vfx-6");
  if (!finish6Kt.includes("audiovfx6:validate")) {
    errors.push("Finish6Kickoff.kt missing audiovfx6:validate");
  }
  if (kickoff.gaps?.audioVfx6Incomplete !== false) {
    errors.push("kickoff gaps.audioVfx6Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("audioVfx6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop audioVfx6Incomplete after Phase 12");
  }
  const openBlock = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openBlock.includes("audioVfx6Incomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop audioVfx6Incomplete");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }

  if (listing.audioPack6Phase !== 12) errors.push("listing.audioPack6Phase must be 12");
  if (listing.vfxJuice6Phase !== 12) errors.push("listing.vfxJuice6Phase must be 12");
  if (listing.audioPack6Catalog !== "shared/ship/audio-pack-6.json") {
    errors.push("listing.audioPack6Catalog mismatch");
  }
  if (listing.vfxJuice6Catalog !== "shared/ship/vfx-juice-6.json") {
    errors.push("listing.vfxJuice6Catalog mismatch");
  }
  if (pin.audioPack6 !== "shared/ship/audio-pack-6.json") errors.push("RELEASE_PIN.audioPack6 missing");
  if (pin.vfxJuice6 !== "shared/ship/vfx-juice-6.json") errors.push("RELEASE_PIN.vfxJuice6 missing");
  if (!pin.fixtures?.includes("parity-audio-pack-6.json")) {
    errors.push("RELEASE_PIN missing parity-audio-pack-6.json");
  }
  if (!pin.fixtures?.includes("parity-vfx-juice-6.json")) {
    errors.push("RELEASE_PIN missing parity-vfx-juice-6.json");
  }

  const audioBlock = dod.audioPack6;
  const vfxBlock = dod.vfxJuice6;
  if (!audioBlock || audioBlock.status !== "complete") errors.push("DoD audioPack6 incomplete");
  if (!vfxBlock || vfxBlock.status !== "complete") errors.push("DoD vfxJuice6 incomplete");
  if ((dod.quotas?.audioPack6Stingers ?? 0) < 5) errors.push("DoD quotas.audioPack6Stingers < 5");
  if ((dod.quotas?.audioPack6Beds ?? 0) < 1) errors.push("DoD quotas.audioPack6Beds < 1");
  if ((dod.quotas?.vfxJuice6BurstKinds ?? 0) < 5) errors.push("DoD quotas.vfxJuice6BurstKinds < 5");
  if ((dod.quotas?.vfxJuice6ShakeKinds ?? 0) < 2) errors.push("DoD quotas.vfxJuice6ShakeKinds < 2");
  if ((dod.quotas?.nestAmbientModes ?? 0) < 3) errors.push("DoD quotas.nestAmbientModes < 3");

  const licenseIds = new Set((licenses.records ?? []).map((n: any) => n.id));
  if (!licenseIds.has("authored-audio-pack-6")) {
    errors.push("licenses.json missing authored-audio-pack-6 record");
  }

  if (!pkg.scripts?.["audiovfx6:validate"]) errors.push("package.json missing audiovfx6:validate");
  if (!ci.includes("audiovfx6:validate")) errors.push("ci.yml missing audiovfx6:validate");
  if (!existsSync(resolve(root, "shared/tools/author_audio_vfx_6.py"))) {
    errors.push("missing author_audio_vfx_6.py");
  }
  if (audioFx.expect?.audioVfx6IncompleteClosed !== true) {
    errors.push("parity audio must expect audioVfx6IncompleteClosed");
  }
  if (vfxFx.expect?.audioVfx6IncompleteClosed !== true) {
    errors.push("parity vfx must expect audioVfx6IncompleteClosed");
  }

  for (const gate of [...AUDIO_PACK_6.preflightGates, ...VFX_JUICE_6.preflightGates]) {
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
  console.error("audiovfx6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK audiovfx6:validate — audio pack 6 + VFX juice 6 wired; audioVfx6Incomplete closed");
