package com.willio.jeanvilma.fishshopping.core.store

/**
 * Phase 12 (post-1.0) — in-app licenses screen copy mirrored from
 * `shared/store/licenses.json` (ossNotices + first-party intro).
 */
object LicensesNotice {
    const val PHASE = 12
    const val ASSET_SCHEMA = "fish.store.asset_licenses.v1"
    const val CATALOG = "shared/store/licenses.json"
    const val SCREEN_TITLE = "Licenses & notices"
    const val SCREEN_INTRO =
        "Fish Shopping art, audio, and content are first-party. Runtime engines and libraries keep their upstream licenses."

    data class OssNotice(
        val id: String,
        val name: String,
        val version: String,
        val spdx: String,
        val url: String,
        val platforms: List<String>,
        val notice: String,
    ) {
        fun headline(): String = "$name $version · $spdx"
    }

    val OSS_NOTICES: List<OssNotice> = listOf(
        OssNotice(
            id = "filament",
            name = "Filament",
            version = "1.77.3",
            spdx = "Apache-2.0",
            url = "https://github.com/google/filament",
            platforms = listOf("android"),
            notice = "Copyright Google LLC. Licensed under the Apache License, Version 2.0.",
        ),
        OssNotice(
            id = "three",
            name = "three.js",
            version = "0.170.0",
            spdx = "MIT",
            url = "https://github.com/mrdoob/three.js",
            platforms = listOf("web"),
            notice = "Copyright © 2010-2024 three.js authors. MIT License.",
        ),
        OssNotice(
            id = "react",
            name = "React",
            version = "18.3.1",
            spdx = "MIT",
            url = "https://github.com/facebook/react",
            platforms = listOf("web"),
            notice = "Copyright Meta Platforms, Inc. and affiliates. MIT License.",
        ),
        OssNotice(
            id = "kotlin",
            name = "Kotlin",
            version = "2.4.0",
            spdx = "Apache-2.0",
            url = "https://github.com/JetBrains/kotlin",
            platforms = listOf("android"),
            notice = "Copyright JetBrains s.r.o. Licensed under the Apache License, Version 2.0.",
        ),
        OssNotice(
            id = "kotlinx-serialization",
            name = "kotlinx.serialization",
            version = "1.9.0",
            spdx = "Apache-2.0",
            url = "https://github.com/Kotlin/kotlinx.serialization",
            platforms = listOf("android"),
            notice = "Copyright JetBrains s.r.o. Licensed under the Apache License, Version 2.0.",
        ),
        OssNotice(
            id = "androidx-compose",
            name = "AndroidX / Jetpack Compose",
            version = "BOM",
            spdx = "Apache-2.0",
            url = "https://developer.android.com/jetpack",
            platforms = listOf("android"),
            notice = "Copyright The Android Open Source Project. Licensed under the Apache License, Version 2.0.",
        ),
        OssNotice(
            id = "vite",
            name = "Vite",
            version = "5.4.21",
            spdx = "MIT",
            url = "https://github.com/vitejs/vite",
            platforms = listOf("web"),
            notice = "Copyright Evan You and Vite contributors. MIT License. Used for the web client build.",
        ),
        OssNotice(
            id = "ajv",
            name = "Ajv",
            version = "8.17.1",
            spdx = "MIT",
            url = "https://github.com/ajv-validator/ajv",
            platforms = listOf("web"),
            notice = "Copyright 2015-2024 Evgeny Poberezkin. MIT License.",
        ),
    )

    val REQUIRED_OSS_IDS: Set<String> = setOf(
        "filament",
        "three",
        "react",
        "kotlin",
        "kotlinx-serialization",
        "androidx-compose",
    )

    /** Full OSS list on both clients so Filament / Three / etc. attributions always ship. */
    fun displayLines(): List<String> = buildList {
        add(SCREEN_INTRO)
        add("")
        add("First-party assets · ${StoreListing.APP_NAME}")
        add("LicenseRef-FishShopping-Proprietary-Ship")
        add("")
        for (n in OSS_NOTICES) {
            add(n.headline())
            add(n.notice)
            add(n.url)
            add("")
        }
    }
}
