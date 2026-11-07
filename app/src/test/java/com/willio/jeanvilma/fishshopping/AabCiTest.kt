package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.signing.AabCi
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Post-1.0 Phase 5 — signed AAB CI artifact + RELEASE_PIN versions. */
class AabCiTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/android/aab-ci.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedAabCiJson() {
        val json = JSONObject(File(root, "shared/android/aab-ci.json").readText())
        assertEquals(AabCi.PHASE, json.getInt("phase"))
        assertEquals(AabCi.SCHEMA, json.getString("schema"))
        assertEquals(AabCi.RELEASE_PIN, json.getString("releasePin"))
        assertEquals(AabCi.GRADLE_TASK, json.getString("gradleTask"))
        assertEquals(AabCi.FALLBACK_TASK, json.getString("fallbackTask"))
        assertEquals(AabCi.ARTIFACT_UPLOAD_NAME, json.getString("artifactUploadName"))
        assertEquals(AabCi.CI_JOB, json.getString("ciJob"))

        val artifacts = json.getJSONObject("artifacts")
        assertEquals(AabCi.AAB_PATH, artifacts.getString("aab"))
        assertEquals(AabCi.MAPPING_PATH, artifacts.getString("mapping"))

        val version = json.getJSONObject("version")
        assertEquals(AabCi.VERSION_NAME_FIELD, version.getString("versionNameField"))
        assertEquals(AabCi.VERSION_CODE_FIELD, version.getString("versionCodeField"))
        assertTrue(version.getBoolean("mustMatchContentVersion"))
    }

    @Test
    fun releasePinVersionsMatchContentAndAndroidCatalog() {
        val pin = JSONObject(File(root, "shared/fixtures/RELEASE_PIN.json").readText())
        val content = JSONObject(File(root, "shared/content/content-pack.json").readText())
        assertEquals(pin.getString("contentVersion"), content.getString("contentVersion"))
        assertEquals(pin.getString("contentVersion"), pin.getString("versionName"))
        assertTrue(pin.getInt("versionCode") >= 1)

        val android = pin.getJSONObject("android")
        assertEquals(AabCi.GRADLE_TASK, android.getString("ciTask"))
        assertEquals(AabCi.AAB_PATH, android.getString("aabArtifact"))
        assertEquals(AabCi.MAPPING_PATH, android.getString("mappingArtifact"))

        assertEquals(pin.getString("versionName"), BuildConfig.RELEASE_PIN_VERSION_NAME)
        assertEquals(pin.getInt("versionCode"), BuildConfig.RELEASE_PIN_VERSION_CODE)
        assertEquals(pin.getString("versionName"), BuildConfig.VERSION_NAME)
        assertEquals(pin.getInt("versionCode"), BuildConfig.VERSION_CODE)
    }

    @Test
    fun gradleAndCiProduceBundleAndMapping() {
        val gradle = File(root, "app/build.gradle.kts").readText()
        assertTrue(gradle.contains("RELEASE_PIN.json"))
        assertTrue(gradle.contains("versionCode = pinVersionCode"))
        assertTrue(gradle.contains("versionName = pinVersionName"))
        assertTrue(gradle.contains("bundleRelease"))

        val ci = File(root, ".github/workflows/ci.yml").readText()
        assertTrue(ci.contains(":app:bundleRelease"))
        assertTrue(ci.contains("mapping.txt"))
        assertTrue(ci.contains("app-release.aab"))
        assertTrue(ci.contains("android-release-aab"))
        assertTrue(ci.contains("upload-artifact"))

        val hardening = JSONObject(File(root, "shared/android/release-hardening.json").readText())
        val ciJson = hardening.getJSONObject("ci")
        assertEquals(AabCi.GRADLE_TASK, ciJson.getString("task"))
        assertEquals(AabCi.AAB_PATH, ciJson.getJSONObject("artifacts").getString("aab"))
        assertEquals(AabCi.MAPPING_PATH, ciJson.getJSONObject("artifacts").getString("mapping"))
    }
}
