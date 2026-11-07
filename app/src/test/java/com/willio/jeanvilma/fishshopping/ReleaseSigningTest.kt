package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.signing.ReleaseSigning
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Post-1.0 Phase 4 + Finish 2.0 Phase 5 — upload signing + CC-safe fail gate. */
class ReleaseSigningTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/android/release-signing.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedReleaseSigningJson() {
        val json = JSONObject(File(root, "shared/android/release-signing.json").readText())
        assertEquals(ReleaseSigning.PHASE, json.getInt("phase"))
        assertEquals(ReleaseSigning.SCHEMA, json.getString("schema"))
        assertEquals(ReleaseSigning.SIGNING_CONFIG_NAME, json.getString("signingConfigName"))
        assertEquals(ReleaseSigning.RELEASE_DEFAULT, json.getString("releaseDefault"))
        assertEquals(ReleaseSigning.DEBUG_FALLBACK, json.getString("debugFallback"))
        assertTrue(json.getBoolean("storeFileNeverCommitted"))
        assertTrue(json.getBoolean("ciEphemeralWhenSecretsMissing"))

        val env = json.getJSONArray("envKeys")
        assertEquals(ReleaseSigning.ENV_KEYS.size, env.length())
        for (i in 0 until env.length()) {
            assertEquals(ReleaseSigning.ENV_KEYS[i], env.getJSONObject(i).getString("name"))
        }
        val local = json.getJSONArray("localPropertiesKeys")
        assertEquals(ReleaseSigning.LOCAL_PROP_KEYS.size, local.length())
        for (i in 0 until local.length()) {
            assertEquals(ReleaseSigning.LOCAL_PROP_KEYS[i], local.getJSONObject(i).getString("name"))
        }
        val secrets = json.getJSONArray("ciSecrets")
        assertEquals(ReleaseSigning.CI_SECRETS.size, secrets.length())
        for (i in 0 until secrets.length()) {
            assertEquals(ReleaseSigning.CI_SECRETS[i], secrets.getString(i))
        }
        val ignore = json.getJSONArray("gitignore")
        for (i in 0 until ignore.length()) {
            assertTrue(ReleaseSigning.GITIGNORE_GLOBS.contains(ignore.getString(i)))
        }
    }

    @Test
    fun readinessRequiresUploadCredentials() {
        val missing = ReleaseSigning.readiness(null, null, null, null, allowDebugFallback = false)
        assertFalse(missing.uploadConfigured)
        assertEquals(4, missing.missingKeys.size)

        val ready = ReleaseSigning.readiness(
            storeFile = "/tmp/upload.jks",
            storePassword = "s",
            keyAlias = "upload",
            keyPassword = "k",
            allowDebugFallback = false,
        )
        assertTrue(ready.uploadConfigured)
        assertTrue(ready.missingKeys.isEmpty())
        assertEquals(ReleaseSigning.SIGNING_CONFIG_NAME, ready.signingConfigName)
    }

    @Test
    fun gradleCiGitignoreAndExampleDocumentUploadPath() {
        val gradle = File(root, "app/build.gradle.kts").readText()
        assertTrue(gradle.contains("create(\"upload\")"))
        assertTrue(gradle.contains("FISH_UPLOAD_STORE_FILE"))
        assertTrue(gradle.contains("fish.upload.storeFile"))
        assertTrue(gradle.contains("allowDebugFallback"))
        assertTrue(gradle.contains("signingConfigs.getByName(\"upload\")"))
        assertTrue(gradle.contains("Release signing not configured"))
        assertTrue(gradle.contains("packageRelease"))
        assertTrue(gradle.contains("checkReleaseUploadSigning"))
        assertTrue(gradle.contains("dependsOn(checkReleaseUploadSigning)"))
        assertTrue(gradle.contains("tasks.register(\"checkReleaseUploadSigning\")"))
        assertFalse(gradle.contains("tasks.findByName(taskName)?.doFirst"))
        assertTrue(gradle.contains("FISH_UPLOAD_FORCE_UNSIGNED"))

        val ci = File(root, ".github/workflows/ci.yml").readText()
        assertTrue(ci.contains("FISH_UPLOAD_KEYSTORE_BASE64"))
        assertTrue(ci.contains("Prepare upload keystore"))
        assertTrue(ci.contains("ephemeral CI keystore") || ci.contains("ephemeral"))
        assertTrue(ci.contains("signing:validate"))
        assertTrue(ci.contains("FISH_UPLOAD_FORCE_UNSIGNED"))

        val ignore = File(root, ".gitignore").readText()
        for (glob in ReleaseSigning.GITIGNORE_GLOBS) {
            assertTrue("missing $glob in .gitignore", ignore.contains(glob))
        }

        val example = File(root, "local.properties.example").readText()
        assertTrue(example.contains("fish.upload.storeFile="))
        assertTrue(example.contains("fish.upload.allowDebugFallback=true"))

        val hardening = JSONObject(File(root, "shared/android/release-hardening.json").readText())
        val signing = hardening.getJSONObject("signing")
        assertFalse(signing.getBoolean("ciReleaseUsesDebugKeystore"))
        assertEquals("shared/android/release-signing.json", signing.getString("catalog"))
        assertEquals("upload", signing.getString("signingConfigName"))
    }
}
