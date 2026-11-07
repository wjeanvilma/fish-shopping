package com.willio.jeanvilma.fishshopping.core.store

/**
 * Phase 10 (post-1.0) — final icon pack + feature graphic constants from
 * `shared/store/icon-pack.json`.
 */
object IconPack {
    const val PHASE = 10
    const val SCHEMA = "fish.store.icon_pack.v1"
    const val CATALOG = "shared/store/icon-pack.json"
    const val TOOL = "shared/tools/generate_store_chrome.py"
    const val SOURCE_MARK = "shared/store/brand-mark.svg"

    const val FEATURE_GRAPHIC_PNG = "shared/store/feature-graphic.png"
    const val FEATURE_GRAPHIC_SVG = "shared/store/feature-graphic.svg"
    const val FEATURE_GRAPHIC_WIDTH = 1024
    const val FEATURE_GRAPHIC_HEIGHT = 500

    const val PLAY_HIRES_ICON = "shared/store/play-icon-512.png"
    const val PLAY_HIRES_SIZE = 512

    const val WEB_FAVICON = "web/public/favicon.svg"
    const val WEB_APPLE_TOUCH = "web/public/apple-touch-icon.png"
    const val WEB_ICON_192 = "web/public/icon-192.png"
    const val WEB_ICON_512 = "web/public/icon-512.png"
    const val WEB_ICON_512_MASKABLE = "web/public/icon-512-maskable.png"
    const val WEB_MANIFEST = "web/public/manifest.webmanifest"

    const val ADAPTIVE_ICON = "app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml"
    const val ADAPTIVE_FOREGROUND = "app/src/main/res/drawable/ic_launcher_foreground.xml"
    const val ADAPTIVE_BACKGROUND = "app/src/main/res/drawable/ic_launcher_background.xml"

    val LEGACY_MIPMAPS: Map<String, Int> = mapOf(
        "mipmap-mdpi" to 48,
        "mipmap-hdpi" to 72,
        "mipmap-xhdpi" to 96,
        "mipmap-xxhdpi" to 144,
        "mipmap-xxxhdpi" to 192,
    )

    const val INK = "#153449"
    const val SKY = "#9fd3ea"
    const val REWARD = "#e8af4a"
    const val ACTION = "#008f95"
}
