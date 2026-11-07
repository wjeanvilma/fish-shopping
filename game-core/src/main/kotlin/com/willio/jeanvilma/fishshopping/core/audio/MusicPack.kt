package com.willio.jeanvilma.fishshopping.core.audio

/**
 * Phase 20 (post-1.0) — authored music bed contracts from `shared/audio/music-pack.json`.
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
    const val MAX_TOTAL_BYTES = 400_000
    const val DEFAULT_BED = "harbor"
    const val SFX_DUCK_FACTOR = 0.35f
    const val SFX_DUCK_RECOVERY_MS = 280
    const val FOCUS_TRANSIENT_DUCK_FACTOR = 0.25f
    const val MASTER_MUSIC_SCALE = 0.42f

    val BED_IDS: List<String> = listOf("harbor", "shop")

    fun androidRawName(bedId: String): String = "music_$bedId"

    fun bedForStationOpen(stationOpen: Boolean): String =
        if (stationOpen) "shop" else "harbor"

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
