plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.willio.jeanvilma.fishshopping"
    // Phase 27: Filament 1.77.3 + current AndroidX require compileSdk 37+.
    compileSdk {
        version = release(37)
    }

    // Optional Firebase REST keys from local.properties (never required for local play).
    fun localProp(key: String): String {
        val f = rootProject.file("local.properties")
        if (!f.exists()) return ""
        f.readLines().forEach { line ->
            val t = line.trim()
            if (t.isEmpty() || t.startsWith("#")) return@forEach
            val i = t.indexOf('=')
            if (i <= 0) return@forEach
            if (t.substring(0, i).trim() == key) return t.substring(i + 1).trim()
        }
        return ""
    }
    defaultConfig {
        applicationId = "com.willio.jeanvilma.fishshopping"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "FIREBASE_API_KEY", "\"${localProp("fish.firebase.apiKey")}\"")
        buildConfigField("String", "FIREBASE_PROJECT_ID", "\"${localProp("fish.firebase.projectId")}\"")
    }

    buildTypes {
        release {
            // Phase 27: R8 minify/shrink for ship builds. Signed with the debug
            // keystore until a Play upload key is configured (CI assembleRelease gate).
            signingConfig = signingConfigs.getByName("debug")
            optimization {
                enable = true
                keepRules {
                    includeDefault = true
                    @Suppress("DEPRECATION")
                    files.add(file("proguard-rules.pro"))
                }
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

// Package the shared content pack and 3D assets straight from ../shared so the
// Android and web clients always ship the same files (blueprint "Shared rules").
androidComponents {
    onVariants { variant ->
        variant.sources.assets?.apply {
            addStaticSourceDirectory("../shared/content")
            addStaticSourceDirectory("../shared/assets")
        }
    }
}

dependencies {
    implementation(project(":game-core"))

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)

    implementation(libs.filament.android)
    implementation(libs.filament.gltfio.android)
    implementation(libs.filament.utils.android)

    testImplementation(libs.junit)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
