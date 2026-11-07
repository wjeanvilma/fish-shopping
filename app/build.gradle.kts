plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

// Optional Firebase REST keys + Phase 4 upload signing from local.properties
// (never required for local debug play; never commit secrets).
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

fun envOrLocal(envKey: String, localKey: String): String {
    val fromEnv = System.getenv(envKey)?.trim().orEmpty()
    if (fromEnv.isNotEmpty()) return fromEnv
    return localProp(localKey)
}

fun truthy(value: String): Boolean =
    value.equals("true", ignoreCase = true) || value == "1" || value.equals("yes", ignoreCase = true)

val uploadStorePath = envOrLocal("FISH_UPLOAD_STORE_FILE", "fish.upload.storeFile")
val uploadStorePassword = envOrLocal("FISH_UPLOAD_STORE_PASSWORD", "fish.upload.storePassword")
val uploadKeyAlias = envOrLocal("FISH_UPLOAD_KEY_ALIAS", "fish.upload.keyAlias")
val uploadKeyPassword = envOrLocal("FISH_UPLOAD_KEY_PASSWORD", "fish.upload.keyPassword")
val allowDebugFallback = truthy(
    envOrLocal("FISH_UPLOAD_ALLOW_DEBUG_FALLBACK", "fish.upload.allowDebugFallback"),
)

val uploadStoreFileResolved = uploadStorePath.takeIf { it.isNotBlank() }?.let { path ->
    val asFile = file(path)
    when {
        asFile.isFile -> asFile
        rootProject.file(path).isFile -> rootProject.file(path)
        else -> asFile
    }
}
val uploadConfigured = uploadStoreFileResolved?.isFile == true &&
    uploadStorePassword.isNotBlank() &&
    uploadKeyAlias.isNotBlank() &&
    uploadKeyPassword.isNotBlank()

// Phase 5 (post-1.0): versionCode / versionName from shared/fixtures/RELEASE_PIN.json.
@Suppress("UNCHECKED_CAST")
val releasePin: Map<String, Any> = run {
    val pinFile = rootProject.file("shared/fixtures/RELEASE_PIN.json")
    require(pinFile.isFile) { "Missing RELEASE_PIN at ${pinFile.path}" }
    groovy.json.JsonSlurper().parse(pinFile) as Map<String, Any>
}
val pinVersionName: String = (releasePin["versionName"] as? String)
    ?: (releasePin["contentVersion"] as? String)
    ?: error("RELEASE_PIN missing versionName/contentVersion")
val pinVersionCode: Int = when (val raw = releasePin["versionCode"]) {
    is Number -> raw.toInt()
    is String -> raw.toInt()
    else -> error("RELEASE_PIN missing versionCode")
}
val pinContentVersion: String = releasePin["contentVersion"] as? String
    ?: error("RELEASE_PIN missing contentVersion")
require(pinVersionName == pinContentVersion) {
    "RELEASE_PIN versionName ($pinVersionName) must match contentVersion ($pinContentVersion)"
}

android {
    namespace = "com.willio.jeanvilma.fishshopping"
    // Phase 27: Filament 1.77.3 + current AndroidX require compileSdk 37+.
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.willio.jeanvilma.fishshopping"
        minSdk = 24
        targetSdk = 36
        versionCode = pinVersionCode
        versionName = pinVersionName
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "FIREBASE_API_KEY", "\"${localProp("fish.firebase.apiKey")}\"")
        buildConfigField("String", "FIREBASE_PROJECT_ID", "\"${localProp("fish.firebase.projectId")}\"")
        buildConfigField("boolean", "UPLOAD_SIGNING_CONFIGURED", "$uploadConfigured")
        buildConfigField("String", "RELEASE_PIN_VERSION_NAME", "\"$pinVersionName\"")
        buildConfigField("int", "RELEASE_PIN_VERSION_CODE", "$pinVersionCode")
    }

    signingConfigs {
        // Phase 4 (post-1.0): Play upload keystore. Populated only when credentials resolve.
        create("upload") {
            if (uploadConfigured) {
                storeFile = uploadStoreFileResolved
                storePassword = uploadStorePassword
                keyAlias = uploadKeyAlias
                keyPassword = uploadKeyPassword
            }
        }
    }

    buildTypes {
        release {
            // Phase 27: R8 minify/shrink for ship builds.
            // Phase 4: sign with upload keystore (env / local.properties). Debug signing
            // only when fish.upload.allowDebugFallback / FISH_UPLOAD_ALLOW_DEBUG_FALLBACK is explicit.
            // Missing credentials do not fail debug/unit-test configuration — packageRelease guards below.
            if (uploadConfigured) {
                signingConfig = signingConfigs.getByName("upload")
            } else if (allowDebugFallback) {
                logger.warn(
                    "Release signing: using debug keystore (explicit allowDebugFallback). " +
                        "Do not upload this APK/AAB to Play.",
                )
                signingConfig = signingConfigs.getByName("debug")
            }
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

// Phase 4: fail release packaging with a clear message when upload signing is missing.
// Capture primitives at configuration time so the action is configuration-cache safe.
afterEvaluate {
    val releaseSigningReady = uploadConfigured || allowDebugFallback
    if (!releaseSigningReady) {
        val releaseSigningMessage =
            "Release signing not configured. Set FISH_UPLOAD_STORE_FILE / " +
                "FISH_UPLOAD_STORE_PASSWORD / FISH_UPLOAD_KEY_ALIAS / FISH_UPLOAD_KEY_PASSWORD " +
                "(or fish.upload.* in local.properties). " +
                "For local R8 smoke only, set fish.upload.allowDebugFallback=true. " +
                "See local.properties.example and shared/android/release-signing.json."
        listOf("packageRelease", "assembleRelease", "bundleRelease").forEach { taskName ->
            tasks.findByName(taskName)?.doFirst {
                throw GradleException(releaseSigningMessage)
            }
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

    // Phase 1 (post-1.0): Play Billing production path for full unlock + cosmetics.
    implementation(libs.play.billing.ktx)

    testImplementation(libs.junit)
    // Real org.json for JVM unit tests (Android's org.json is not mocked usefully).
    testImplementation(libs.org.json)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
