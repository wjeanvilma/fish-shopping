package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 1 — kickoff + gap scoreboard from
 * `shared/ship/finish-6.0-kickoff.json`.
 *
 * Locks the Finish 5.0 freeze as the prior plan, pins measured gaps (~90.6k
 * product LOC + AI-lab structure debt), and exposes the 30-phase Finish 6.0
 * roadmap for validators and UI ops panels.
 */
object Finish6Kickoff {
    const val PHASE = 1
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.finish6_kickoff.v1"
    const val CATALOG = "shared/ship/finish-6.0-kickoff.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-finish-6.0-kickoff.json"
    const val KICKOFF_MARKER = "authored-finish-6.0-phase-1"
    const val CONTENT_VERSION = "6.0.0"
    const val SCHEMA_VERSION = 27

    const val PRIOR_PLAN = "30_finish_5.0"
    const val PRIOR_STATUS = "finished"
    const val PRIOR_RELEASE_TAG = "v5.0.0"
    const val PRIOR_FREEZE_CATALOG = "shared/ship/freeze-5.0.0.json"

    const val END_CONTENT_VERSION = "6.0.0"
    const val END_RELEASE_TAG = "v6.0.0"
    const val END_SCHEMA_VERSION_MIN = 27
    const val END_VERSION_CODE = 7
    const val END_PRODUCT_LOC_MIN = 120_000
    const val END_GAME_CORE_LOC_MIN = 38_000
    const val END_APP_LOC_MIN = 26_000
    const val END_WEB_SRC_LOC_MIN = 56_000

    const val BASELINE_GAME_CORE_LOC = 32_287
    const val BASELINE_APP_LOC = 15_415
    const val BASELINE_WEB_SRC_LOC = 42_895
    const val BASELINE_PRODUCT_LOC = 90_597
    const val BASELINE_HARBORS = 12
    const val BASELINE_SPECIES = 125
    const val BASELINE_MACHINES = 14
    const val BASELINE_QUESTS = 75
    const val BASELINE_AUTHORED_HARBORS = 12
    const val BASELINE_AUTHORED_FISH = 125
    const val BASELINE_HARBOR_BLOCKOUTS = 0
    const val BASELINE_I18N_LOCALES = 8
    const val BASELINE_I18N_UI_KEYS = 361
    const val BASELINE_ANDROID_UI_STRINGS_CALLS = 214
    const val BASELINE_ANDROID_TEXT_LITERALS = 0
    const val BASELINE_STAFF_COMING_SOON = 0
    const val BASELINE_PARITY_SUITES = 20
    const val BASELINE_PLAYWRIGHT_E2E = 12
    const val BASELINE_COMPOSE_E2E = 14
    const val BASELINE_SYSTEMS_TS_LINES = 4_293
    const val BASELINE_GAME_VIEW_MODEL_LINES = 1_644
    const val BASELINE_GAME_HOST_LINES = 1_313

    const val GAP_AUTHORED_HARBORS_REMAINING = 0
    const val GAP_AUTHORED_FISH_REMAINING = 0
    const val GAP_PRODUCT_LOC_REMAINING = 29_403
    const val GAP_SPECIES_REMAINING = 0
    const val GAP_MACHINES_REMAINING = 0
    const val GAP_QUESTS_REMAINING = 25

    const val TARGET_AUTHORED_HARBORS = 14
    const val TARGET_AUTHORED_FISH = 150
    const val TARGET_I18N_LOCALES = 8
    const val TARGET_I18N_UI_KEYS_MIN = 400
    const val TARGET_ANDROID_TEXT_LITERALS_MAX = 0
    const val TARGET_STAFF_COMING_SOON = 0
    const val TARGET_PRODUCT_LOC = 120_000
    const val TARGET_SPECIES_MIN = 150
    const val TARGET_MACHINES_MIN = 16
    const val TARGET_QUESTS_MIN = 100
    const val TARGET_HARBORS_MIN = 14
    const val TARGET_SEASONAL_MIN = 20
    const val TARGET_BAITS_MIN = 20
    const val TARGET_COSMETICS_MIN = 30
    const val TARGET_CHAINS_MIN = 9
    const val TARGET_RIVALS_MIN = 20
    const val TARGET_PARITY_SUITES_MIN = 24
    const val TARGET_PLAYWRIGHT_E2E_MIN = 24
    const val TARGET_COMPOSE_E2E_MIN = 20
    const val TARGET_SYSTEMS_TS_MAX = 2_800
    const val TARGET_GAME_VIEW_MODEL_MAX = 1_200
    const val TARGET_GAME_HOST_MAX = 1_100

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
        val systemsTs: GapScore,
        val gameViewModel: GapScore,
        val gameHost: GapScore,
        val openFlags: List<String>,
        val openFlagCount: Int,
        val allNumericGapsClosed: Boolean,
    )

    val PHASES: List<PhaseGate> = listOf(
        PhaseGate(1, "kickoff", "Kickoff + gap scoreboard", "finish6:validate"),
        PhaseGate(2, "schema-foundations", "Schema foundations — ship/billing/ops JSON Schema", "schema6:validate"),
        PhaseGate(3, "ship-codegen", "Ship catalog codegen for Finish 6 mirrors", "shipcodegen:validate"),
        PhaseGate(4, "systems-split-3", "systems.ts split 3 (≤2800) + Kotlin parity", "systemssplit3:validate"),
        PhaseGate(5, "host-vm-caps", "GameViewModel ≤1200 + GameHost ≤1100", "hostvmcaps:validate"),
        PhaseGate(6, "loc-midcheck-6", "LOC mid-check scoreboard 6", "locmidcheck6:validate"),
        PhaseGate(7, "harbors-13-14", "Harbors 13–14 with scenic art + prestige", "harbors1314:validate"),
        PhaseGate(8, "species-150", "Species 126–150 + ecology + i18n", "species150:validate"),
        PhaseGate(9, "machines-15-16", "Machines 15–16 + recipes/UI", "machines1516:validate"),
        PhaseGate(10, "product-art-6", "Product/cosmetic art presentation 6", "productart6:validate"),
        PhaseGate(11, "atmosphere-6", "Atmosphere/cozy render depth 6", "atmosphere6:validate"),
        PhaseGate(12, "audio-vfx-6", "Audio pack 6 + VFX juice 6", "audiovfx6:validate"),
        PhaseGate(13, "quests-contracts-6", "Quests→100, chains→9, contracts depth", "quests6:validate"),
        PhaseGate(14, "endgame-4", "Endgame deepen + schema 27", "endgame4:validate"),
        PhaseGate(15, "rivals-seasonal-6", "Rivals/seasonal/baits/cosmetics growth 6", "rivalsseasonal6:validate"),
        PhaseGate(16, "staff-ai-4", "Staff AI 4 + decision-trace fixtures", "staffai4:validate"),
        PhaseGate(17, "economy-bank-4", "Economy/bank/dashboard depth 4", "economy4:validate"),
        PhaseGate(18, "offline-cloud-4", "Offline/cloud/analytics hardening 4", "offlinecloud4:validate"),
        PhaseGate(19, "tutorial-retention-6", "Tutorial friction + retention hooks 6", "tutorialretention6:validate"),
        PhaseGate(20, "ui-parity-6", "Web↔Android panel parity depth 6", "uiparity6:validate"),
        PhaseGate(21, "presenter-harness", "Presenter/render CPU snapshot harness", "presenterharness:validate"),
        PhaseGate(22, "a11y-i18n-6", "A11y depth 5 + i18n key growth (≥400)", "a11yi18n6:validate"),
        PhaseGate(23, "playwright-e2e-6", "Playwright E2E floors ≥24", "playwrighte2e6:validate"),
        PhaseGate(24, "compose-e2e-6", "Compose instrumented floors ≥20", "composee2e6:validate"),
        PhaseGate(25, "stripe-ops-6", "Stripe/checkout live-ready catalog ops 6", "stripeops6:validate"),
        PhaseGate(26, "analytics-loadtest-6", "Analytics + loadtest banks expansion 6", "analyticsloadtest6:validate"),
        PhaseGate(27, "content-cli-6", "Content authoring CLI wave 6 + modular packs", "contentcli6:validate"),
        PhaseGate(28, "device-perf-6", "Device/browser/perf matrix 6", "deviceperf6:validate"),
        PhaseGate(29, "parity-lock-6", "Parity lock 6.0 (≥24 suites)", "parity6:validate"),
        PhaseGate(30, "freeze-6", "6.0.0 freeze & DoD", "freeze6:validate"),
    )

    /** Boolean gap flags still open after Finish 6.0 Phase 29 (parity-lock-6 closed). */
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
        systemsTsLines: Int = BASELINE_SYSTEMS_TS_LINES,
        gameViewModelLines: Int = BASELINE_GAME_VIEW_MODEL_LINES,
        gameHostLines: Int = BASELINE_GAME_HOST_LINES,
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
        val systems = named(
            "systemsTs",
            score(systemsTsLines, TARGET_SYSTEMS_TS_MAX, invertRemaining = true),
        )
        val viewModel = named(
            "gameViewModel",
            score(gameViewModelLines, TARGET_GAME_VIEW_MODEL_MAX, invertRemaining = true),
        )
        val host = named(
            "gameHost",
            score(gameHostLines, TARGET_GAME_HOST_MAX, invertRemaining = true),
        )
        val numeric = listOf(
            harbors, fish, loc, speciesGap, machinesGap, questsGap, locales, staff,
            systems, viewModel, host,
        )
        return GapScoreboard(
            authoredHarbors = harbors,
            authoredFish = fish,
            productLoc = loc,
            species = speciesGap,
            machines = machinesGap,
            quests = questsGap,
            i18nLocales = locales,
            staffComingSoon = staff,
            systemsTs = systems,
            gameViewModel = viewModel,
            gameHost = host,
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
            PHASES.last().id == "freeze-6"

    fun productLocProgress(currentProductLoc: Int = BASELINE_PRODUCT_LOC): Int {
        val span = (TARGET_PRODUCT_LOC - BASELINE_PRODUCT_LOC).coerceAtLeast(1)
        val gained = (currentProductLoc - BASELINE_PRODUCT_LOC).coerceAtLeast(0)
        return ((gained * 100L) / span).toInt().coerceIn(0, 100)
    }

    fun summaryLine(board: GapScoreboard = baselineScoreboard()): String =
        "Finish 6.0 Phase 1 gaps: harbors ${board.authoredHarbors.current}/${board.authoredHarbors.target}, " +
            "fish ${board.authoredFish.current}/${board.authoredFish.target}, " +
            "LOC ${board.productLoc.current}/${board.productLoc.target}, " +
            "openFlags=${board.openFlagCount}"
}
