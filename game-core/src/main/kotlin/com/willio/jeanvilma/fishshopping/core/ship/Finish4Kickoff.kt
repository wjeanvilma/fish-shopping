package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 1 — kickoff + gap scoreboard from
 * `shared/ship/finish-4.0-kickoff.json`.
 *
 * Locks the Finish 3.0 freeze as the prior plan, pins measured gaps, and
 * exposes the 30-phase Finish 4.0 roadmap for validators and UI ops panels.
 */
object Finish4Kickoff {
    const val PHASE = 1
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.finish4_kickoff.v1"
    const val CATALOG = "shared/ship/finish-4.0-kickoff.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-finish-4.0-kickoff.json"
    const val KICKOFF_MARKER = "authored-finish-4.0-phase-1"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25

    const val PRIOR_PLAN = "30_finish_3.0"
    const val PRIOR_STATUS = "finished"
    const val PRIOR_RELEASE_TAG = "v3.0.0"
    const val PRIOR_FREEZE_CATALOG = "shared/ship/freeze-3.0.0.json"

    const val END_CONTENT_VERSION = "4.0.0"
    const val END_RELEASE_TAG = "v4.0.0"
    const val END_SCHEMA_VERSION_MIN = 25
    const val END_VERSION_CODE = 5
    const val END_PRODUCT_LOC_MIN = 100_000
    const val END_GAME_CORE_LOC_MIN = 32_000
    const val END_APP_LOC_MIN = 20_000
    const val END_WEB_SRC_LOC_MIN = 48_000

    const val BASELINE_GAME_CORE_LOC = 23_675
    const val BASELINE_APP_LOC = 13_947
    const val BASELINE_WEB_SRC_LOC = 35_851
    const val BASELINE_PRODUCT_LOC = 73_473
    const val BASELINE_HARBORS = 10
    const val BASELINE_SPECIES = 100
    const val BASELINE_MACHINES = 12
    const val BASELINE_QUESTS = 50
    const val BASELINE_AUTHORED_HARBORS = 10
    const val BASELINE_AUTHORED_FISH = 100
    const val BASELINE_HARBOR_BLOCKOUTS = 0
    const val BASELINE_I18N_LOCALES = 3
    const val BASELINE_I18N_UI_KEYS = 248
    const val BASELINE_ANDROID_UI_STRINGS_CALLS = 214
    const val BASELINE_ANDROID_TEXT_LITERALS = 0
    const val BASELINE_STAFF_COMING_SOON = 0
    const val BASELINE_PARITY_SUITES = 16

    const val GAP_AUTHORED_HARBORS_REMAINING = 0
    const val GAP_AUTHORED_FISH_REMAINING = 0
    const val GAP_PRODUCT_LOC_REMAINING = 26_527
    const val GAP_SPECIES_REMAINING = 0
    const val GAP_MACHINES_REMAINING = 0
    const val GAP_QUESTS_REMAINING = 0

    const val TARGET_AUTHORED_HARBORS = 10
    const val TARGET_AUTHORED_FISH = 100
    const val TARGET_I18N_LOCALES = 3
    const val TARGET_I18N_UI_KEYS_MIN = 120
    const val TARGET_ANDROID_TEXT_LITERALS_MAX = 0
    const val TARGET_STAFF_COMING_SOON = 0
    const val TARGET_PRODUCT_LOC = 100_000
    const val TARGET_SPECIES_MIN = 100
    const val TARGET_MACHINES_MIN = 12
    const val TARGET_QUESTS_MIN = 50
    const val TARGET_HARBORS_MIN = 10
    const val TARGET_SEASONAL_MIN = 12
    const val TARGET_BAITS_MIN = 12
    const val TARGET_COSMETICS_MIN = 18
    const val TARGET_CHAINS_MIN = 5
    const val TARGET_RIVALS_MIN = 12
    const val TARGET_PARITY_SUITES_MIN = 16

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
        PhaseGate(1, "kickoff", "Kickoff + gap scoreboard", "finish4:validate"),
        PhaseGate(2, "systems-split-1", "systems.ts split — fishing/production/inventory", "systemssplit1:validate"),
        PhaseGate(3, "systems-split-2", "systems.ts split — customers/contracts/quests/progression", "systemssplit2:validate"),
        PhaseGate(4, "viewmodel-split", "Android GameViewModel intent/handler decomposition", "viewmodelsplit:validate"),
        PhaseGate(5, "workers-simview-split", "Workers.kt + SimView.kt module split + AI hooks", "workersplit:validate"),
        PhaseGate(6, "gamehost-split", "GameHost.ts + renderer presenter cleanup", "gamehostsplit:validate"),
        PhaseGate(7, "fish-art-3a", "Fish art 3a — author meshes 51–75", "fishart3a:validate"),
        PhaseGate(8, "fish-art-3b", "Fish art 3b — author meshes toward 100", "fishart3b:validate"),
        PhaseGate(9, "harbor-art-3", "Harbor art beyond blockout for 8 harbors", "harborart3:validate"),
        PhaseGate(10, "product-art", "Product/cosmetic art presentation pass", "productart:validate"),
        PhaseGate(11, "species-76-100", "Species 76–100 + ecology + i18n", "species76100:validate"),
        PhaseGate(12, "harbors-9-10", "Harbors 9–10 with travel/prestige gates", "harbors910:validate"),
        PhaseGate(13, "machines-11-12", "Machines 11–12 + recipes/UI", "machines1112:validate"),
        PhaseGate(14, "quests-contracts-4", "Quests→50, chains→5, contracts depth", "quests4:validate"),
        PhaseGate(15, "rivals-2", "Rival markets 8→12 + AI depth", "rivals2:validate"),
        PhaseGate(16, "seasonal-bait-4", "Seasonal→12, baits→12, mastery depth", "seasonalbait4:validate"),
        PhaseGate(17, "endgame-2", "Endgame deepen + schema 25", "endgame2:validate"),
        PhaseGate(18, "cosmetics-iap-4", "Cosmetics/IAP 12→18 power-neutral", "cosmetics4:validate"),
        PhaseGate(19, "staff-ai-2", "Staff/worker AI depth wave 2", "staffai2:validate"),
        PhaseGate(20, "economy-bank-2", "Economy/bank/dashboard depth", "economy2:validate"),
        PhaseGate(21, "offline-cloud-2", "Offline/cloud/analytics hardening", "offlinecloud2:validate"),
        PhaseGate(22, "ui-parity-depth", "Web↔Android panel feature parity depth", "uiparity:validate"),
        PhaseGate(23, "audio-vfx-4", "Audio pack 4 + VFX juice 4", "audiovfx4:validate"),
        PhaseGate(24, "a11y-i18n-4", "A11y depth 3 + i18n key growth", "a11yi18n4:validate"),
        PhaseGate(25, "stripe-ops-4", "Stripe/checkout live-ready catalog ops", "stripeops4:validate"),
        PhaseGate(26, "deeplink-e2e-4", "Deep links + expanded E2E/Compose", "deeplinke2e4:validate"),
        PhaseGate(27, "device-perf-4", "Device/browser/perf matrix tighten", "deviceperf4:validate"),
        PhaseGate(28, "content-cli-3", "Content authoring CLI wave 3", "contentcli3:validate"),
        PhaseGate(29, "parity-lock-4", "Parity lock 4.0 (≥16 suites)", "parity4:validate"),
        PhaseGate(30, "freeze-4", "4.0.0 freeze & DoD", "freeze4:validate"),
    )

    /** Boolean gap flags still open after Finish 4.0 Phase 29 (parity lock 4.0 closed). */
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
        val speciesGap = named("species", score(species, TARGET_SPECIES_MIN))
        val machinesGap = named("machines", score(machines, TARGET_MACHINES_MIN))
        val questsGap = named("quests", score(quests, TARGET_QUESTS_MIN))
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
            PHASES.last().id == "freeze-4"

    fun productLocProgress(currentProductLoc: Int = BASELINE_PRODUCT_LOC): Int {
        val span = (TARGET_PRODUCT_LOC - BASELINE_PRODUCT_LOC).coerceAtLeast(1)
        val gained = (currentProductLoc - BASELINE_PRODUCT_LOC).coerceAtLeast(0)
        return ((gained * 100L) / span).toInt().coerceIn(0, 100)
    }

    fun summaryLine(board: GapScoreboard = baselineScoreboard()): String =
        "Finish 4.0 Phase 1 gaps: harbors ${board.authoredHarbors.current}/${board.authoredHarbors.target}, " +
            "fish ${board.authoredFish.current}/${board.authoredFish.target}, " +
            "LOC ${board.productLoc.current}/${board.productLoc.target}, " +
            "openFlags=${board.openFlagCount}"
}
