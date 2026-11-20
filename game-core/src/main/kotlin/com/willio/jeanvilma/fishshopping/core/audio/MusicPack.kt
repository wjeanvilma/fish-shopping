package com.willio.jeanvilma.fishshopping.core.audio

/**
 * Phase 20 (post-1.0) — authored music bed contracts from `shared/audio/music-pack.json`.
 * Finish 2.0 Phase 21 adds festival + storm beds; Finish 3.0 Phase 23 adds night + rival beds;
 * Finish 4.0 Phase 23 adds endgame + ledger beds; Finish 5.0 Phase 12 adds pressure bed;
 * Finish 6.0 Phase 12 adds nest bed.
 * Ducking constants stay frozen.
 */
object MusicPack {
    const val PHASE = 20
    const val SCHEMA = "fish.audio.music_pack.v1"
    const val CATALOG = "shared/audio/music-pack.json"
    const val SOURCE_DIR = "shared/audio/music"
    const val WEB_PUBLIC_DIR = "web/public/music"
    const val ANDROID_RAW_DIR = "app/src/main/res/raw"
    const val SAMPLE_RATE = 22_050
    const val LOOP_DURATION_SEC = 4
    const val MAX_BYTES_PER_BED = 190_000
    const val MAX_TOTAL_BYTES = 1_800_000
    const val DEFAULT_BED = "harbor"
    const val SFX_DUCK_FACTOR = 0.35f
    const val SFX_DUCK_RECOVERY_MS = 280
    const val FOCUS_TRANSIENT_DUCK_FACTOR = 0.25f
    const val MASTER_MUSIC_SCALE = 0.42f

    val BED_IDS: List<String> = listOf(
        "harbor", "shop", "festival", "storm", "night", "rival", "endgame", "ledger", "pressure", "nest",
    )
    val PACK2_BED_IDS: List<String> = listOf("festival", "storm")
    val PACK3_BED_IDS: List<String> = listOf("night", "rival")
    val PACK4_BED_IDS: List<String> = listOf("endgame", "ledger")
    val PACK5_BED_IDS: List<String> = listOf("pressure")
    val PACK6_BED_IDS: List<String> = listOf("nest")

    fun androidRawName(bedId: String): String = "music_$bedId"

    fun bedForStationOpen(stationOpen: Boolean): String =
        if (stationOpen) "shop" else "harbor"

    /**
     * Resolve bed from presentation context.
     * Priority: festival > storm > rival > night > endgame > ledger > pressure > nest > shop > harbor.
     */
    fun bedForContext(
        stationOpen: Boolean,
        festivalActive: Boolean = false,
        stormActive: Boolean = false,
        rivalActive: Boolean = false,
        nightActive: Boolean = false,
        endgameActive: Boolean = false,
        ledgerActive: Boolean = false,
        pressureActive: Boolean = false,
        nestActive: Boolean = false,
    ): String = when {
        festivalActive -> "festival"
        stormActive -> "storm"
        rivalActive -> "rival"
        nightActive -> "night"
        endgameActive -> "endgame"
        ledgerActive -> "ledger"
        pressureActive -> "pressure"
        nestActive -> "nest"
        stationOpen -> "shop"
        else -> "harbor"
    }

    fun duckedMusicGain(baseGain: Float, sfxDucking: Boolean, factor: Float = SFX_DUCK_FACTOR): Float {
        if (baseGain <= 0f) return 0f
        return if (sfxDucking) baseGain * factor else baseGain
    }

    fun focusMusicScale(state: String, duckFactor: Float = FOCUS_TRANSIENT_DUCK_FACTOR): Float =
        when (state) {
            "gain" -> 1f
            "duck" -> duckFactor
            else -> 0f
        }
}
