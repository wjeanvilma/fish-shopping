package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 1 — kickoff + gap scoreboard from
 * `shared/ship/finish-5.0-kickoff.json`.
 *
 * Locks the Finish 4.0 freeze as the prior plan, pins measured gaps, and
 * exposes the 30-phase Finish 5.0 roadmap for validators and UI ops panels.
 */
object Finish5Kickoff {
    const val PHASE = 1
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.finish5_kickoff.v1"
    const val CATALOG = "shared/ship/finish-5.0-kickoff.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-finish-5.0-kickoff.json"
    const val KICKOFF_MARKER = "authored-finish-5.0-phase-1"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26

    const val PRIOR_PLAN = "30_finish_4.0"
    const val PRIOR_STATUS = "finished"
    const val PRIOR_RELEASE_TAG = "v4.0.0"
    const val PRIOR_FREEZE_CATALOG = "shared/ship/freeze-4.0.0.json"

    const val END_CONTENT_VERSION = "5.0.0"
    const val END_RELEASE_TAG = "v5.0.0"
    const val END_SCHEMA_VERSION_MIN = 26
    const val END_VERSION_CODE = 6
    const val END_PRODUCT_LOC_MIN = 120_000
    const val END_GAME_CORE_LOC_MIN = 38_000
    const val END_APP_LOC_MIN = 26_000
    const val END_WEB_SRC_LOC_MIN = 56_000

    const val BASELINE_GAME_CORE_LOC = 28_162
    const val BASELINE_APP_LOC = 14_691
    const val BASELINE_WEB_SRC_LOC = 37_322
    const val BASELINE_PRODUCT_LOC = 80_175
    const val BASELINE_HARBORS = 10
    const val BASELINE_SPECIES = 100
    const val BASELINE_MACHINES = 12
    const val BASELINE_QUESTS = 50
    const val BASELINE_AUTHORED_HARBORS = 10
    const val BASELINE_AUTHORED_FISH = 125
    const val BASELINE_HARBOR_BLOCKOUTS = 0
    const val BASELINE_I18N_LOCALES = 8
    const val BASELINE_I18N_UI_KEYS = 304
    const val BASELINE_ANDROID_UI_STRINGS_CALLS = 214
    const val BASELINE_ANDROID_TEXT_LITERALS = 0
    const val BASELINE_STAFF_COMING_SOON = 0
    const val BASELINE_PARITY_SUITES = 16

    const val GAP_AUTHORED_HARBORS_REMAINING = 2
    const val GAP_AUTHORED_FISH_REMAINING = 0
    const val GAP_PRODUCT_LOC_REMAINING = 39_825
    const val GAP_SPECIES_REMAINING = 25
    const val GAP_MACHINES_REMAINING = 2
    const val GAP_QUESTS_REMAINING = 25

    const val TARGET_AUTHORED_HARBORS = 12
    const val TARGET_AUTHORED_FISH = 125
    const val TARGET_I18N_LOCALES = 8
    const val TARGET_I18N_UI_KEYS_MIN = 360
    const val TARGET_ANDROID_TEXT_LITERALS_MAX = 0
    const val TARGET_STAFF_COMING_SOON = 0
    const val TARGET_PRODUCT_LOC = 120_000
    const val TARGET_SPECIES_MIN = 125
    const val TARGET_MACHINES_MIN = 14
    const val TARGET_QUESTS_MIN = 75
    const val TARGET_HARBORS_MIN = 12
    const val TARGET_SEASONAL_MIN = 16
    const val TARGET_BAITS_MIN = 16
    const val TARGET_COSMETICS_MIN = 24
    const val TARGET_CHAINS_MIN = 7
    const val TARGET_RIVALS_MIN = 16
    const val TARGET_PARITY_SUITES_MIN = 20

    const val PHASE_COUNT = 30

    data class PhaseGate(
        val phase: Int,
        val id: String,
        val title: String,
        val validate: String? = null,
    )

    data class GapScore(
        val id: String,
        val current: Int,
        val target: Int,
        val remaining: Int,
        val met: Boolean,
    )

    data class GapScoreboard(
        val authoredHarbors: GapScore,
        val authoredFish: GapScore,
        val productLoc: GapScore,
        val species: GapScore,
        val machines: GapScore,
        val quests: GapScore,
        val i18nLocales: GapScore,
        val staffComingSoon: GapScore,
        val openFlags: List<String>,
        val openFlagCount: Int,
        val allNumericGapsClosed: Boolean,
    )

    val PHASES: List<PhaseGate> = listOf(
        PhaseGate(1, "kickoff", "Kickoff + gap scoreboard", "finish5:validate"),
        PhaseGate(2, "engine-depth-1", "Engine depth 1 — fishing/mastery/spoilage", "enginedepth1:validate"),
        PhaseGate(3, "engine-depth-2", "Engine depth 2 — customers/contracts/progression", "enginedepth2:validate"),
        PhaseGate(4, "android-vm-depth", "Android VM/intent depth for new loops", "androidvmdepth:validate"),
        PhaseGate(5, "host-presenter-depth", "GameHost + presenter depth", "hostpresenterdepth:validate"),
        PhaseGate(6, "loc-midcheck", "LOC mid-check scoreboard", "locmidcheck:validate"),
        PhaseGate(7, "harbor-art-5a", "Harbor art 5a — harbors 1–6 beyond blockout", "harborart5a:validate"),
        PhaseGate(8, "harbor-art-5b", "Harbor art 5b — harbors 7–12", "harborart5b:validate"),
        PhaseGate(9, "fish-art-5", "Fish art 5 — species 101–125 meshes", "fishart5:validate"),
        PhaseGate(10, "product-art-5", "Product/cosmetic art presentation 5", "productart5:validate"),
        PhaseGate(11, "atmosphere-5", "Atmosphere/cozy render depth 5", "atmosphere5:validate"),
        PhaseGate(12, "audio-vfx-5", "Audio pack 5 + VFX juice 5", "audiovfx5:validate"),
        PhaseGate(13, "species-125", "Species 101–125 + ecology + i18n", "species125:validate"),
        PhaseGate(14, "harbors-11-12", "Harbors 11–12 with travel/prestige gates", "harbors1112:validate"),
        PhaseGate(15, "machines-13-14", "Machines 13–14 + recipes/UI", "machines1314:validate"),
        PhaseGate(16, "quests-contracts-5", "Quests→75, chains→7, contracts depth", "quests5:validate"),
        PhaseGate(17, "endgame-3", "Endgame deepen + schema 26", "endgame3:validate"),
        PhaseGate(18, "rivals-seasonal-5", "Rivals/seasonal/baits/cosmetics growth", "rivalsseasonal5:validate"),
        PhaseGate(19, "tutorial-retention-5", "Tutorial friction + retention hooks", "tutorialretention5:validate"),
        PhaseGate(20, "staff-ai-3", "Staff/worker AI depth wave 3", "staffai3:validate"),
        PhaseGate(21, "economy-bank-3", "Economy/bank/dashboard depth 3", "economy3:validate"),
        PhaseGate(22, "offline-cloud-3", "Offline/cloud/analytics hardening 3", "offlinecloud3:validate"),
        PhaseGate(23, "ui-parity-5", "Web↔Android panel parity depth 5", "uiparity5:validate"),
        PhaseGate(24, "a11y-i18n-5", "A11y depth 4 + i18n key growth (≥360)", "a11yi18n5:validate"),
        PhaseGate(25, "stripe-ops-5", "Stripe/checkout live-ready catalog ops 5", "stripeops5:validate"),
        PhaseGate(26, "deeplink-e2e-5", "Deep links + E2E floors ≥12/≥14", "deeplinke2e5:validate"),
        PhaseGate(27, "device-perf-5", "Device/browser/perf matrix 5", "deviceperf5:validate"),
        PhaseGate(28, "content-cli-5", "Content authoring CLI wave 5", "contentcli5:validate"),
        PhaseGate(29, "parity-lock-5", "Parity lock 5.0 (≥20 suites)", "parity5:validate"),
        PhaseGate(30, "freeze-5", "5.0.0 freeze & DoD", "freeze5:validate"),
    )

    /** Boolean gap flags still open after Finish 5.0 Phase 29 (parity-lock-5 closed). */
    val OPEN_GAP_FLAGS: List<String> = emptyList()

    fun score(
        current: Int,
        target: Int,
        remainingOverride: Int? = null,
        invertRemaining: Boolean = false,
    ): GapScore {
        val remaining = remainingOverride ?: if (invertRemaining) {
            (current - target).coerceAtLeast(0)
        } else {
            (target - current).coerceAtLeast(0)
        }
        val met = if (invertRemaining) current <= target else current >= target
        return GapScore(
            id = "",
            current = current,
            target = target,
            remaining = remaining,
            met = met,
        )
    }

    fun baselineScoreboard(
        authoredHarbors: Int = BASELINE_AUTHORED_HARBORS,
        authoredFish: Int = BASELINE_AUTHORED_FISH,
        productLoc: Int = BASELINE_PRODUCT_LOC,
        species: Int = BASELINE_SPECIES,
        machines: Int = BASELINE_MACHINES,
        quests: Int = BASELINE_QUESTS,
        i18nLocales: Int = BASELINE_I18N_LOCALES,
        staffComingSoon: Int = BASELINE_STAFF_COMING_SOON,
        openFlags: List<String> = OPEN_GAP_FLAGS,
    ): GapScoreboard {
        fun named(id: String, s: GapScore) = s.copy(id = id)
        val harbors = named(
            "authoredHarbors",
            score(authoredHarbors, TARGET_AUTHORED_HARBORS, GAP_AUTHORED_HARBORS_REMAINING),
        )
        val fish = named(
            "authoredFish",
            score(authoredFish, TARGET_AUTHORED_FISH, GAP_AUTHORED_FISH_REMAINING),
        )
        val loc = named(
            "productLoc",
            score(productLoc, TARGET_PRODUCT_LOC, GAP_PRODUCT_LOC_REMAINING),
        )
        val speciesGap = named("species", score(species, TARGET_SPECIES_MIN, GAP_SPECIES_REMAINING))
        val machinesGap = named("machines", score(machines, TARGET_MACHINES_MIN, GAP_MACHINES_REMAINING))
        val questsGap = named("quests", score(quests, TARGET_QUESTS_MIN, GAP_QUESTS_REMAINING))
        val locales = named("i18nLocales", score(i18nLocales, TARGET_I18N_LOCALES))
        val staff = named(
            "staffComingSoon",
            score(
                staffComingSoon,
                TARGET_STAFF_COMING_SOON,
                remainingOverride = staffComingSoon,
                invertRemaining = true,
            ),
        )
        val numeric = listOf(harbors, fish, loc, speciesGap, machinesGap, questsGap, locales, staff)
        return GapScoreboard(
            authoredHarbors = harbors,
            authoredFish = fish,
            productLoc = loc,
            species = speciesGap,
            machines = machinesGap,
            quests = questsGap,
            i18nLocales = locales,
            staffComingSoon = staff,
            openFlags = openFlags,
            openFlagCount = openFlags.size,
            allNumericGapsClosed = numeric.all { it.met } && openFlags.isEmpty(),
        )
    }

    fun phaseIds(): List<String> = PHASES.map { it.id }

    fun phaseById(id: String): PhaseGate? = PHASES.firstOrNull { it.id == id }

    fun requireThirtyPhases(): Boolean =
        PHASES.size == PHASE_COUNT &&
            PHASES.map { it.phase } == (1..PHASE_COUNT).toList() &&
            PHASES.first().id == "kickoff" &&
            PHASES.last().id == "freeze-5"

    fun productLocProgress(currentProductLoc: Int = BASELINE_PRODUCT_LOC): Int {
        val span = (TARGET_PRODUCT_LOC - BASELINE_PRODUCT_LOC).coerceAtLeast(1)
        val gained = (currentProductLoc - BASELINE_PRODUCT_LOC).coerceAtLeast(0)
        return ((gained * 100L) / span).toInt().coerceIn(0, 100)
    }

    fun summaryLine(board: GapScoreboard = baselineScoreboard()): String =
        "Finish 5.0 Phase 1 gaps: harbors ${board.authoredHarbors.current}/${board.authoredHarbors.target}, " +
            "fish ${board.authoredFish.current}/${board.authoredFish.target}, " +
            "LOC ${board.productLoc.current}/${board.productLoc.target}, " +
            "openFlags=${board.openFlagCount}"
}
