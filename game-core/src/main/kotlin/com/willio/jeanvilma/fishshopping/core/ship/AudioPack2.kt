package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 21 — SFX/music pack 2 ship constants
 * (mirrors shared/ship/audio-pack-2.json).
 */
object AudioPack2 {
    const val PHASE = 21
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.audio_pack_2.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val AUDIO_PACK_MARKER = "authored-finish-2.0-phase-21"
    const val NEW_STINGER_MIN = 7
    const val NEW_BED_MIN = 2
    const val PARITY_FIXTURE = "shared/fixtures/parity-audio-pack-2.json"
    const val CATALOG = "shared/ship/audio-pack-2.json"

    val NEW_STINGERS = listOf(
        "achievement",
        "festival",
        "contract_done",
        "contract_fail",
        "goal_claim",
        "mastery_up",
        "quest_done",
    )

    val NEW_BEDS = listOf("festival", "storm")
}
