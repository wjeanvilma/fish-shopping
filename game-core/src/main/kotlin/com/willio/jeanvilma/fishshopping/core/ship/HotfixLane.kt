package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Phase 29 (post-1.0) — 1.0.x hotfix lane contracts from
 * `shared/ship/hotfix-lane.json`.
 */
object HotfixLane {
    const val PHASE = 29
    const val SCHEMA = "fish.ship.hotfix_lane.v1"
    const val CATALOG = "shared/ship/hotfix-lane.json"
    const val SCHEMA_VERSION = 20
    const val ALLOWED_MAJOR = 1
    const val ALLOWED_MINOR = 0
    const val MIN_PATCH = 1
    const val CI_JOB = "android-hotfix"
    const val ARTIFACT_NAME = "android-hotfix-aab"
    const val INITIAL_ROLLOUT_PERCENT = 10

    data class SemVer(val major: Int, val minor: Int, val patch: Int) {
        override fun toString(): String = "$major.$minor.$patch"
    }

    data class RolloutStep(val percent: Int, val minSoakHours: Int, val label: String)

    val ROLLOUT_STEPS: List<RolloutStep> = listOf(
        RolloutStep(10, 24, "canary"),
        RolloutStep(50, 24, "expand"),
        RolloutStep(100, 0, "full"),
    )

    val HALT_CRITERIA: List<String> = listOf(
        "Startup crash rate above Play bad-behavior threshold",
        "ANR spike on onStop checkpoint / low-memory path",
        "IAP purchase or restore failure rate for license testers",
        "Widespread save corruption reports (AtomicFile / Recover previous surge)",
    )

    fun parseSemVer(version: String): SemVer? {
        val parts = version.trim().split('.')
        if (parts.size != 3) return null
        val major = parts[0].toIntOrNull() ?: return null
        val minor = parts[1].toIntOrNull() ?: return null
        val patch = parts[2].toIntOrNull() ?: return null
        return SemVer(major, minor, patch)
    }

    fun isHotfixVersionName(version: String): Boolean {
        val v = parseSemVer(version) ?: return false
        return v.major == ALLOWED_MAJOR && v.minor == ALLOWED_MINOR && v.patch >= MIN_PATCH
    }

    fun isValidHotfixBump(previous: String, next: String): Boolean {
        val a = parseSemVer(previous) ?: return false
        val b = parseSemVer(next) ?: return false
        if (!isHotfixVersionName(previous) || !isHotfixVersionName(next)) return false
        return b.major == a.major && b.minor == a.minor && b.patch == a.patch + 1
    }

    fun tagFor(versionName: String): String? =
        if (isHotfixVersionName(versionName)) "v$versionName" else null

    fun validatePin(
        versionName: String,
        contentVersion: String,
        versionCode: Int,
        schemaVersion: Int,
        storeVersionName: String?,
        storeVersionCode: Int?,
    ): List<String> {
        val errors = mutableListOf<String>()
        if (versionName != contentVersion) errors += "versionName must match contentVersion"
        if (!isHotfixVersionName(versionName)) {
            errors += "versionName $versionName is not on the 1.0.x hotfix line"
        }
        if (schemaVersion != SCHEMA_VERSION) errors += "schemaVersion must stay $SCHEMA_VERSION"
        if (versionCode < 1) errors += "versionCode must be ≥1"
        if (storeVersionCode != null && versionCode <= storeVersionCode) {
            errors += "hotfix versionCode must exceed storeRelease.versionCode"
        }
        if (storeVersionName != null) {
            val storeV = parseSemVer(storeVersionName)
            val pinV = parseSemVer(versionName)
            if (storeV != null && pinV != null) {
                if (pinV.major != storeV.major || pinV.minor != storeV.minor) {
                    errors += "hotfix must stay on the same major.minor as storeRelease"
                }
                if (pinV.patch < storeV.patch) {
                    errors += "hotfix patch must be ≥ storeRelease patch"
                }
            }
        }
        return errors
    }
}
