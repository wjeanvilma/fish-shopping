package com.willio.jeanvilma.fishshopping.core.audio

/**
 * Phase 19 (post-1.0) — authored SFX pack contracts from `shared/audio/sfx-pack.json`.
 * Finish 2.0 Phase 21 adds pack-2 stingers; phase field stays 19 for post-1.0 gates.
 * Clips live under shared/audio/sfx and are mirrored to web public + Android raw.
 */
object SfxPack {
    const val PHASE = 19
    const val SCHEMA = "fish.audio.sfx_pack.v1"
    const val CATALOG = "shared/audio/sfx-pack.json"
    const val SOURCE_DIR = "shared/audio/sfx"
    const val WEB_PUBLIC_DIR = "web/public/sfx"
    const val ANDROID_RAW_DIR = "app/src/main/res/raw"
    const val SAMPLE_RATE = 22_050
    const val MAX_BYTES_PER_CLIP = 24_576
    const val MAX_TOTAL_BYTES = 240_000
    const val MAX_DURATION_MS = 420
    const val VOICE_COST_PER_CLIP = 1
    const val MAX_SFX_VOICES = 6
    const val AMBIENCE_PROCEDURAL_UNTIL_PHASE = 20

    val CUE_IDS: List<String> = listOf(
        "catch",
        "machine_done",
        "sale",
        "ui",
        "abandon",
        "upgrade",
        "rush",
        "achievement",
        "festival",
        "contract_done",
        "contract_fail",
        "goal_claim",
        "mastery_up",
        "quest_done",
    )

    val PACK2_CUE_IDS: List<String> = listOf(
        "achievement",
        "festival",
        "contract_done",
        "contract_fail",
        "goal_claim",
        "mastery_up",
        "quest_done",
    )

    val ROLE_REQUIRED: List<String> = listOf("catch", "cut", "sell", "ui")

    fun androidRawName(cueId: String): String = "sfx_" + cueId
}
