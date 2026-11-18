/**
 * Finish 4.0 Phase 23 — audio pack 4 + VFX juice 4 readiness.
 *
 * Usage:
 *   npm run audiovfx4:validate
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { SFX_PACK4_CUES, sfxFromEvent } from "../src/audio/sfxCues";
import { MUSIC_PACK4_BED_IDS, musicBedForPanels, musicPack } from "../src/audio/musicBeds";
import { sfxPack } from "../src/audio/sfxPack";
import {
  AUDIO_PACK_4,
  AUDIO_PACK_4_MARKER,
  AUDIO_PACK_4_PHASE,
  AUDIO_PACK_4_SCHEMA,
  NEW_BED_FLOOR_4,
  NEW_STINGER_FLOOR_4,
} from "../src/ship/audioPack4";
import {
  VFX_JUICE_4,
  VFX_JUICE_4_MARKER,
  VFX_JUICE_4_PHASE,
  VFX_JUICE_4_SCHEMA,
  VFX4_BURST_FLOOR,
  VFX4_ENDGAME_AMBIENT_FLOOR,
  VFX4_SHAKE_FLOOR,
} from "../src/ship/vfxJuice4";
import { ENDGAME_AMBIENT_MODE_IDS, endgameAmbientIdForView } from "../src/render/weatherAmbient";

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
  const audioCat = readJson(resolve(root, "shared/ship/audio-pack-4.json"));
  const vfxCat = readJson(resolve(root, "shared/ship/vfx-juice-4.json"));
  const audioFx = readJson(resolve(root, "shared/fixtures/parity-audio-pack-4.json"));
  const vfxFx = readJson(resolve(root, "shared/fixtures/parity-vfx-juice-4.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const licenses = readJson(resolve(root, "shared/store/licenses.json"));
  const budget = readJson(resolve(root, "shared/perf/budget-gate.json"));
  const sfx = readJson(resolve(root, "shared/audio/sfx-pack.json"));
  const music = readJson(resolve(root, "shared/audio/music-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const hostBus = readFileSync(resolve(root, "web/src/game/host/hostStepBus.ts"), "utf8");
  const vfxTs = readFileSync(resolve(root, "web/src/render/presenters/vfx.ts"), "utf8");
  const ambientTs = readFileSync(resolve(root, "web/src/render/weatherAmbient.ts"), "utf8");
  const vmKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );

  if (audioCat.phase !== 23 || vfxCat.phase !== 23) errors.push("phase expected 23");
  if (audioCat.schema !== AUDIO_PACK_4_SCHEMA) errors.push("audio schema mismatch");
  if (vfxCat.schema !== VFX_JUICE_4_SCHEMA) errors.push("vfx schema mismatch");
  if (audioCat.plan !== "30_finish_4.0" || vfxCat.plan !== "30_finish_4.0") {
    errors.push("plan must be 30_finish_4.0");
  }
  if (AUDIO_PACK_4_PHASE !== 23 || VFX_JUICE_4_PHASE !== 23) errors.push("phase mirror mismatch");
  if (audioCat.audioPackMarker !== AUDIO_PACK_4_MARKER) errors.push("audio marker mismatch");
  if (vfxCat.vfxJuice4Marker !== VFX_JUICE_4_MARKER) errors.push("vfx marker mismatch");
  if (audioFx.audioPackMarker !== AUDIO_PACK_4_MARKER) errors.push("audio fixture marker mismatch");
  if (vfxFx.vfxJuice4Marker !== VFX_JUICE_4_MARKER) errors.push("vfx fixture marker mismatch");
  if (audioCat.contentVersion !== "3.0.0" || vfxCat.contentVersion !== "3.0.0") {
    errors.push("contentVersion must stay 3.0.0");
  }
  if (audioCat.schemaVersion !== 25 || vfxCat.schemaVersion !== 25) {
    errors.push("schemaVersion must stay 25");
  }
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  if (audioCat.newStingerMin !== 9 || NEW_STINGER_FLOOR_4 !== 9) {
    errors.push("newStingerMin must be 9");
  }
  if (audioCat.newBedMin !== 2 || NEW_BED_FLOOR_4 !== 2) errors.push("newBedMin must be 2");
  if (SFX_PACK4_CUES.length < 9) errors.push("SFX_PACK4_CUES short");
  if (MUSIC_PACK4_BED_IDS.length < 2) errors.push("MUSIC_PACK4_BED_IDS short");

  for (const id of AUDIO_PACK_4.newStingers) {
    const cue = sfx.cues.find((c: any) => c.id === id);
    if (!cue || !cue.pack4) errors.push(`sfx missing pack4 cue ${id}`);
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
  for (const id of AUDIO_PACK_4.newBeds) {
    const bed = music.beds.find((b: any) => b.id === id);
    if (!bed || !bed.pack4) errors.push(`music missing pack4 bed ${id}`);
    else {
      const shared = resolve(root, `shared/audio/music/${bed.file}`);
      const web = resolve(root, `web/public/music/${bed.file}`);
      const raw = resolve(root, `app/src/main/res/raw/${bed.androidRaw}.wav`);
      for (const p of [shared, web, raw]) {
        if (!existsSync(p)) errors.push(`missing music wav ${p}`);
      }
    }
  }

  // Ducking frozen vs music-pack.
  const duck = music.ducking;
  const frozen = audioCat.frozenDucking;
  for (const k of Object.keys(frozen)) {
    if (duck[k] !== frozen[k]) errors.push(`ducking drift on ${k}`);
  }

  if (musicBedForPanels(false, true, true, true, true, true, true) !== "festival") {
    errors.push("bed priority festival broken");
  }
  if (musicBedForPanels(true, false, true, true, true, true, true) !== "storm") {
    errors.push("bed priority storm broken");
  }
  if (musicBedForPanels(true, false, false, true, true, true, true) !== "rival") {
    errors.push("bed priority rival broken");
  }
  if (musicBedForPanels(true, false, false, false, true, true, true) !== "night") {
    errors.push("bed priority night broken");
  }
  if (musicBedForPanels(true, false, false, false, false, true, true) !== "endgame") {
    errors.push("bed priority endgame broken");
  }
  if (musicBedForPanels(true, false, false, false, false, false, true) !== "ledger") {
    errors.push("bed priority ledger broken");
  }
  if (musicBedForPanels(true, false, false, false, false, false, false) !== "shop") {
    errors.push("bed priority shop broken");
  }

  if (vfxCat.eventBurstMin !== 7 || VFX4_BURST_FLOOR !== 7) errors.push("burst floor must be 7");
  if (vfxCat.eventShakeMin !== 2 || VFX4_SHAKE_FLOOR !== 2) errors.push("shake floor must be 2");
  if (vfxCat.endgameAmbientMin !== 3 || VFX4_ENDGAME_AMBIENT_FLOOR !== 3) {
    errors.push("endgame ambient floor must be 3");
  }
  for (const kind of VFX_JUICE_4.eventBursts.kinds) {
    if (!vfxTs.includes(`"${kind}"`)) errors.push(`vfx.ts missing burst kind ${kind}`);
  }
  for (const kind of VFX_JUICE_4.eventBursts.kinds) {
    const camel = kind.split("_").map((p) => p[0]!.toUpperCase() + p.slice(1)).join("");
    if (!hostBus.includes(`resolve${camel}Burst`) && !vfxTs.includes(`resolve${camel}Burst`)) {
      errors.push(`missing resolve${camel}Burst`);
    }
    if (!vmKt.includes(`resolve${camel}Burst`)) errors.push(`GameViewModel missing resolve${camel}Burst`);
  }
  for (const kind of VFX_JUICE_4.eventShake.kinds) {
    if (!vfxTs.includes(`"${kind}"`)) errors.push(`vfx.ts missing shake kind ${kind}`);
  }
  if (ENDGAME_AMBIENT_MODE_IDS.length < 3) errors.push("ENDGAME_AMBIENT_MODE_IDS short");
  if (!ambientTs.includes("ENDGAME_AMBIENT_MODE_IDS")) {
    errors.push("weatherAmbient missing ENDGAME_AMBIENT_MODE_IDS");
  }
  if (endgameAmbientIdForView(false, 0) !== "locked") errors.push("endgame ambient locked broken");
  if (endgameAmbientIdForView(true, 0) !== "active") errors.push("endgame ambient active broken");
  if (endgameAmbientIdForView(true, 1) !== "crowned") errors.push("endgame ambient crowned broken");

  // Finish 4.0 event → SFX map
  if (sfxFromEvent({ type: "decor_purchased" }) !== "decor") errors.push("sfx decor map broken");
  if (sfxFromEvent({ type: "endgame_tier_unlocked" }) !== "endgame_tier") {
    errors.push("sfx endgame_tier map broken");
  }
  if (sfxFromEvent({ type: "contract_accepted" }) !== "contract_accept") {
    errors.push("sfx contract_accept map broken");
  }
  if (sfxFromEvent({ type: "bait_purchased" }) !== "bait") errors.push("sfx bait map broken");
  if (sfxFromEvent({ type: "full_harbor_unlock_granted" }) !== "full_unlock") {
    errors.push("sfx full_unlock map broken");
  }
  if (sfxFromEvent({ type: "items_spoiled" }) !== "spoil") errors.push("sfx spoil map broken");
  if (!sfxPack.cues.some((c) => c.id === "decor")) errors.push("sfxPack.ts missing decor cue");
  if (budget.vfxJuice4Phase !== 23) errors.push("budget-gate vfxJuice4Phase must be 23");
  if (budget.vfxJuice4Catalog !== "shared/ship/vfx-juice-4.json") {
    errors.push("budget-gate vfxJuice4Catalog mismatch");
  }

  const phase23 = (kickoff.phases as any[])?.find((p) => p.phase === 23);
  if (!phase23 || phase23.validate !== "audiovfx4:validate") {
    errors.push("kickoff phase 23 validate must be audiovfx4:validate");
  }
  if (phase23?.id !== "audio-vfx-4") errors.push("kickoff phase 23 id must be audio-vfx-4");
  if (!finish4Kt.includes("audiovfx4:validate")) {
    errors.push("Finish4Kickoff.kt missing audiovfx4:validate");
  }

  if (listing.audioPack4Phase !== 23) errors.push("listing.audioPack4Phase must be 23");
  if (listing.vfxJuice4Phase !== 23) errors.push("listing.vfxJuice4Phase must be 23");
  if (listing.audioPack4Catalog !== "shared/ship/audio-pack-4.json") {
    errors.push("listing.audioPack4Catalog mismatch");
  }
  if (listing.vfxJuice4Catalog !== "shared/ship/vfx-juice-4.json") {
    errors.push("listing.vfxJuice4Catalog mismatch");
  }
  if (pin.audioPack4 !== "shared/ship/audio-pack-4.json") errors.push("RELEASE_PIN.audioPack4 missing");
  if (pin.vfxJuice4 !== "shared/ship/vfx-juice-4.json") errors.push("RELEASE_PIN.vfxJuice4 missing");
  if (!pin.fixtures?.includes("parity-audio-pack-4.json")) {
    errors.push("RELEASE_PIN missing parity-audio-pack-4.json");
  }
  if (!pin.fixtures?.includes("parity-vfx-juice-4.json")) {
    errors.push("RELEASE_PIN missing parity-vfx-juice-4.json");
  }

  const audioBlock = dod.audioPack4;
  const vfxBlock = dod.vfxJuice4;
  if (!audioBlock || audioBlock.status !== "complete") errors.push("DoD audioPack4 incomplete");
  if (!vfxBlock || vfxBlock.status !== "complete") errors.push("DoD vfxJuice4 incomplete");
  if ((dod.quotas?.audioPack4Stingers ?? 0) < 9) errors.push("DoD quotas.audioPack4Stingers < 9");
  if ((dod.quotas?.audioPack4Beds ?? 0) < 2) errors.push("DoD quotas.audioPack4Beds < 2");
  if ((dod.quotas?.vfxJuice4BurstKinds ?? 0) < 7) errors.push("DoD quotas.vfxJuice4BurstKinds < 7");
  if ((dod.quotas?.vfxJuice4ShakeKinds ?? 0) < 2) errors.push("DoD quotas.vfxJuice4ShakeKinds < 2");
  if ((dod.quotas?.endgameAmbientModes ?? 0) < 3) errors.push("DoD quotas.endgameAmbientModes < 3");

  const licenseIds = new Set((licenses.records ?? []).map((n: any) => n.id));
  if (!licenseIds.has("authored-audio-pack-4")) {
    errors.push("licenses.json missing authored-audio-pack-4 record");
  }

  if (!pkg.scripts?.["audiovfx4:validate"]) errors.push("package.json missing audiovfx4:validate");
  if (!ci.includes("audiovfx4:validate")) errors.push("ci.yml missing audiovfx4:validate");

  for (const gate of [...AUDIO_PACK_4.preflightGates, ...VFX_JUICE_4.preflightGates]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  // Byte budgets still hold after pack growth.
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
  console.error("audiovfx4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK audiovfx4:validate — audio pack 4 + VFX juice 4 wired");
