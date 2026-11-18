package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 1 — kickoff + gap scoreboard from
 * `shared/ship/finish-3.0-kickoff.json`.
 *
 * Locks the Finish 2.0 freeze as the prior plan, pins measured gaps, and
 * exposes the 30-phase Finish 3.0 roadmap for validators and UI ops panels.
 */
object Finish3Kickoff {
    const val PHASE = 1
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.finish3_kickoff.v1"
    const val CATALOG = "shared/ship/finish-3.0-kickoff.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-finish-3.0-kickoff.json"
    const val KICKOFF_MARKER = "authored-finish-3.0-phase-1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24

    const val PRIOR_PLAN = "30_finish_2.0"
    const val PRIOR_STATUS = "finished"
    const val PRIOR_RELEASE_TAG = "v2.0.0"

    const val END_CONTENT_VERSION = "3.0.0"
    const val END_RELEASE_TAG = "v3.0.0"
    const val END_SCHEMA_VERSION_MIN = 24
    const val END_PRODUCT_LOC_MIN = 80_000
    const val END_GAME_CORE_LOC_MIN = 25_000
    const val END_APP_LOC_MIN = 16_000
    const val END_WEB_SRC_LOC_MIN = 38_000

    const val BASELINE_GAME_CORE_LOC = 20_962
    const val BASELINE_APP_LOC = 13_169
    const val BASELINE_WEB_SRC_LOC = 30_357
    const val BASELINE_PRODUCT_LOC = 64_488
    const val BASELINE_HARBORS = 8
    const val BASELINE_SPECIES = 75
    const val BASELINE_MACHINES = 10
    const val BASELINE_QUESTS = 30
    const val BASELINE_AUTHORED_HARBORS = 8
    const val BASELINE_AUTHORED_FISH = 50
    const val BASELINE_I18N_LOCALES = 3
    const val BASELINE_I18N_UI_KEYS = 248
    const val BASELINE_ANDROID_UI_STRINGS_CALLS = 214
    const val BASELINE_ANDROID_TEXT_LITERALS = 0
    const val BASELINE_STAFF_COMING_SOON = 0

    const val GAP_AUTHORED_HARBORS_REMAINING = 0
    const val GAP_AUTHORED_FISH_REMAINING = 0
    const val GAP_PRODUCT_LOC_REMAINING = 15_512

    const val TARGET_AUTHORED_HARBORS = 8
    const val TARGET_AUTHORED_FISH = 50
    const val TARGET_I18N_LOCALES = 3
    const val TARGET_I18N_UI_KEYS_MIN = 120
    const val TARGET_ANDROID_TEXT_LITERALS_MAX = 0
    const val TARGET_STAFF_COMING_SOON = 0
    const val TARGET_PRODUCT_LOC = 80_000
    const val TARGET_SPECIES_MIN = 75
    const val TARGET_MACHINES_MIN = 10
    const val TARGET_QUESTS_MIN = 30

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
        PhaseGate(1, "kickoff", "Kickoff + gap scoreboard", "finish3:validate"),
        PhaseGate(2, "android-hud-split", "Android HUD panel decomposition"),
        PhaseGate(3, "web-hud-split", "Web HUD panel decomposition"),
        PhaseGate(4, "shell-controller", "Shared shell controller extraction"),
        PhaseGate(5, "android-i18n", "Android i18n completion"),
        PhaseGate(6, "content-i18n", "Content i18n + third locale"),
        PhaseGate(7, "theme-ds", "Dark theme + design-system components"),
        PhaseGate(8, "harbor-art-2", "Harbor art pass 2 (remaining 5)", "harborart2:validate"),
        PhaseGate(9, "fish-art-2", "Fish mesh pass 2 (to 50 authored)", "fishart2:validate"),
        PhaseGate(10, "staff-unlock", "Unlock remaining staff roles", "staffunlock:validate"),
        PhaseGate(11, "worker-ai-depth", "Worker AI depth for new roles", "workerai:validate"),
        PhaseGate(12, "species-51-75", "Species 51–75 + ecology", "species5175:validate"),
        PhaseGate(13, "machines-9-10", "Machines 9–10 + recipes", "machines910:validate"),
        PhaseGate(14, "rival-markets", "Rival NPC markets (single-player)", "rivalmarkets:validate"),
        PhaseGate(15, "schema-24-endgame", "Schema 24 + endgame deepen", "schema24:validate"),
        PhaseGate(16, "stripe-live", "Live Stripe web checkout", "stripe:validate"),
        PhaseGate(17, "cloud-qa-2", "Cloud production QA harness 2"),
        PhaseGate(18, "local-push", "Local daily-goal push reminders"),
        PhaseGate(19, "pwa-shell", "Web PWA / service worker shell"),
        PhaseGate(20, "deep-links", "Android App Links + web deep links", "deeplink:validate"),
        PhaseGate(21, "compose-ui-tests", "Compose UI integration tests", "composeui:validate"),
        PhaseGate(22, "web-e2e", "Web Playwright E2E smoke", "webe2e:validate"),
        PhaseGate(23, "audio-pack-3", "SFX/music pack 3", "audiopack3:validate"),
        PhaseGate(24, "vfx-juice-3", "VFX/juice 3", "vfx3:validate"),
        PhaseGate(25, "a11y-depth-2", "A11y depth 2", "a11ydepth2:validate"),
        PhaseGate(26, "remote-analytics", "Opt-in remote analytics sink", "remoteanalytics:validate"),
        PhaseGate(27, "quests-contracts-3", "Quests/contracts expansion wave", "quests3:validate"),
        PhaseGate(28, "content-cli-2", "Content authoring CLI expansion", "contentcli2:validate"),
        PhaseGate(29, "parity-lock-3", "Parity lock 3.0", "parity3:validate"),
        PhaseGate(30, "freeze-3", "3.0.0 freeze & DoD", "freeze3:validate"),
    )

    /** Boolean gap flags still open after Phase 22 (web E2E closed — none remain). */
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
            PHASES.last().id == "freeze-3"

    fun productLocProgress(currentProductLoc: Int = BASELINE_PRODUCT_LOC): Int {
        val span = (TARGET_PRODUCT_LOC - BASELINE_PRODUCT_LOC).coerceAtLeast(1)
        val gained = (currentProductLoc - BASELINE_PRODUCT_LOC).coerceAtLeast(0)
        return ((gained * 100L) / span).toInt().coerceIn(0, 100)
    }

    fun summaryLine(board: GapScoreboard = baselineScoreboard()): String =
        "Finish 3.0 Phase 1 gaps: harbors ${board.authoredHarbors.current}/${board.authoredHarbors.target}, " +
            "fish ${board.authoredFish.current}/${board.authoredFish.target}, " +
            "LOC ${board.productLoc.current}/${board.productLoc.target}, " +
            "openFlags=${board.openFlagCount}"
}
