package com.willio.jeanvilma.fishshopping.core.store

/**
 * Phase 9 (post-1.0) — Play screenshot capture sizes + paths from
 * `shared/store/screenshot-capture.json`. Storyboard SVGs feed phone + tablet PNGs.
 */
object ScreenshotCapture {
    const val PHASE = 9
    const val SCHEMA = "fish.store.screenshot_capture.v1"
    const val CATALOG = "shared/store/screenshot-capture.json"
    const val OUTPUT_DIR = "shared/store/screenshots/captures"
    const val TOOL = "shared/tools/capture_store_screenshots.py"
    const val MIN_SHOTS = 7

    data class Size(val width: Int, val height: Int, val aspect: String)

    val PHONE_PORTRAIT = Size(1080, 1920, "9:16")
    val PHONE_LANDSCAPE = Size(1920, 1080, "16:9")
    val TABLET_PORTRAIT = Size(1200, 1920, "5:8")
    val TABLET_LANDSCAPE = Size(1920, 1200, "16:10")

    val FORM_FACTORS: List<String> = listOf("phone", "tablet")

    val SHOT_IDS: List<String> = listOf(
        "title",
        "pier_cast",
        "cutter_transfers",
        "counter_service",
        "panels",
        "map_travel",
        "rush_hour",
    )

    val PORTRAIT_IDS: Set<String> = setOf("title", "pier_cast", "panels", "map_travel")
    val LANDSCAPE_IDS: Set<String> = setOf("cutter_transfers", "counter_service", "rush_hour")

    fun sizeFor(formFactor: String, orientation: String): Size = when (formFactor to orientation) {
        "phone" to "portrait" -> PHONE_PORTRAIT
        "phone" to "landscape" -> PHONE_LANDSCAPE
        "tablet" to "portrait" -> TABLET_PORTRAIT
        "tablet" to "landscape" -> TABLET_LANDSCAPE
        else -> error("unknown size $formFactor/$orientation")
    }

    fun orientationFor(shotId: String): String = when (shotId) {
        in PORTRAIT_IDS -> "portrait"
        in LANDSCAPE_IDS -> "landscape"
        else -> error("unknown shot $shotId")
    }

    fun capturePath(formFactor: String, shotId: String): String =
        "$OUTPUT_DIR/$formFactor/$shotId.png"

    fun expectedFileCount(): Int = FORM_FACTORS.size * SHOT_IDS.size

    fun isPlayPixelBounds(width: Int, height: Int): Boolean {
        val min = minOf(width, height)
        val max = maxOf(width, height)
        return min >= 320 && max <= 3840
    }
}
