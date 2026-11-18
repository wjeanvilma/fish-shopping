package com.willio.jeanvilma.fishshopping.core.sim


import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.customers.ReputationSystem
import com.willio.jeanvilma.fishshopping.core.customers.RivalMarketSystem
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
import com.willio.jeanvilma.fishshopping.core.contracts.ContractSystem
import com.willio.jeanvilma.fishshopping.core.economy.EconomySystem
import com.willio.jeanvilma.fishshopping.core.progression.EndgameSystem
import com.willio.jeanvilma.fishshopping.core.progression.PrestigeSystem
import com.willio.jeanvilma.fishshopping.core.progression.ProgressionSystem
import com.willio.jeanvilma.fishshopping.core.progression.UpgradeSystem
import com.willio.jeanvilma.fishshopping.core.workers.StaffTreesSystem
import com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem
import com.willio.jeanvilma.fishshopping.core.world.HarborTravelSystem

/**
 * Immutable presentation snapshot built on the simulation thread and handed to
 * the HUD and renderer. Nothing here can mutate game state.
 */
/**
 * Immutable presentation snapshot built on the simulation thread and handed to
 * the HUD and renderer. Nothing here can mutate game state.
 *
 * Finish 4.0 Phase 5: view-model types live in SimViewModels.kt; helpers in SimViewBuilders.kt.
 */

fun Simulation.view(): SimView {
    val s = state
    val c = content
    val p = s.player
    val zone = p.zoneId?.let { harbor.zonesById[it] }

    val stationViews = s.machines.map { m ->
        val stDef = harbor.stations.first { it.id == m.stationId }
        val unlocked = ProductionSystem.isUnlocked(stDef, s)
        val lockName = stDef.requiresUpgrade?.let { c.upgradesById[it]?.let { u -> c.displayName(u.id, u.name) } ?: it } ?: "an upgrade"
        val status = when {
            !unlocked -> MachineStatus.LOCKED
            m.broken -> MachineStatus.NEEDS_REPAIR
            else -> m.status
        }
        val batch = m.activeBatch
        val progress = if (unlocked && !m.broken) batch?.let { 1f - it.remainingTicks.toFloat() / it.durationTicks } else null
        val slowed = unlocked && EconomySystem.isSlowed(m, s.tick)
        val needsRepair = unlocked && EconomySystem.needsRepair(m, s.tick)
        val statusText = when {
            !unlocked -> "Locked — buy $lockName"
            m.broken -> "Needs repair"
            slowed -> "Running slow"
            else -> ProductionSystem.statusText(m, c)
        }
        StationView(
            m.stationId, status, m.input.usedUnits(), m.output.usedUnits(), progress,
            statusText = statusText,
            preferredRecipeId = m.preferredRecipeId,
            nextRecipeId = if (unlocked && !m.broken) {
                ProductionSystem.nextStartable(c, m)?.id ?: m.activeBatch?.recipeId
            } else null,
            needsRepair = needsRepair,
            repairCost = if (needsRepair) EconomySystem.repairCost(c) else 0,
            slowed = slowed,
            slowTicksRemaining = if (slowed) (m.slowUntilTick - s.tick).toInt().coerceAtLeast(0) else 0,
        )
    }
    val topSpeciesViews = topSpeciesCatchShareViews()
    val automationIssueViews = automationIssueViews(stationViews)

    val context: ContextCard? = when (zone?.kind) {
        ZoneKind.FISHING -> {
            val spotDef = harbor.fishingSpots.first { it.zone == zone.id }
            val spot = s.fishingSpots.first { it.zoneId == zone.id }
            val unlocked = FishingSystem.isUnlocked(spotDef, s)
            val full = p.bag.freeUnits() == 0
            val casting = p.fishingSpecies != null && p.fishingCatchTicks > 0
            val windows = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s)
            val inWindow = casting && FishingSystem.inTimingWindow(
                p.fishingProgress, p.fishingCatchTicks,
                windows.goodStart, windows.goodEnd,
            )
            val empty = unlocked && spot.stock <= 0
            val part = FishingSystem.dayPartAt(c, s.tick)
            val tideOwned = FishingSystem.hasTideChart(s)
            val lines = mutableListOf(
                when {
                    !unlocked -> {
                        val name = spotDef.requiresUpgrade?.let { c.upgradesById[it]?.name } ?: "an upgrade"
                        "Locked — buy $name"
                    }
                    full -> "Bag full - deliver your catch"
                    empty -> "Pier empty — fish are returning"
                    casting && inWindow && !p.reelAttemptedThisCast -> {
                        when (FishingSystem.timingTierAt(p, p.fishingProgress, p.fishingCatchTicks)) {
                            TimingTier.PERFECT -> "Perfect — reel now!"
                            TimingTier.GOOD -> "Good — reel for a tip!"
                            TimingTier.MISS -> "Reel now for a bonus!"
                        }
                    }
                    else -> "Fishing..."
                },
                "Fish here: ${spot.stock}/${spotDef.stockMax}",
                if (tideOwned) "${part.name} · tide chart" else part.name,
            )
            if (casting) lines += "Hooked: ${c.speciesById.getValue(p.fishingSpecies!!).let { c.displayName(it.id, it.name) }}"
            val regenNeeded = FishingSystem.regenTicksFor(c, s, spotDef, spot.stock)
            val progress = when {
                casting -> p.fishingProgress.toFloat() / p.fishingCatchTicks
                unlocked && spot.stock < spotDef.stockMax -> spot.regenProgress.toFloat() / regenNeeded
                else -> null
            }
            ContextCard("Fishing spot", lines, progress)
        }
        ZoneKind.MACHINE_INPUT, ZoneKind.MACHINE_OUTPUT -> {
            val station = harbor.stations.first { it.inputZone == zone.id || it.outputZone == zone.id }
            val m = s.machines.first { it.stationId == station.id }
            val v = stationViews.first { it.stationId == station.id }
            val queue = ProductionSystem.queuedReady(c, m)
            val queuePreview = when {
                queue.isEmpty() -> "Queue: empty"
                else -> "Queue: " + queue.take(3).joinToString(" → ") { ProductionSystem.recipeLabel(it.id) } +
                    if (queue.size > 3) "…" else ""
            }
            val mode = m.preferredRecipeId?.let { ProductionSystem.recipeLabel(it) } ?: "Auto"
            ContextCard(
                title = c.machinesById.getValue(m.machineId).let { c.displayName(it.id, it.name) },
                lines = listOf(
                    v.statusText,
                    "In: ${m.input.usedUnits()}/${m.input.capacityUnits}   Out: ${m.output.usedUnits()}/${m.output.capacityUnits}",
                    queuePreview,
                    "Recipe: $mode",
                ),
                progress = v.progress,
                stationId = m.stationId,
                recipeModeLabel = mode,
            )
        }
        ZoneKind.COUNTER -> {
            val def = harbor.counters.first { it.zone == zone.id }
            val counter = s.counters.first { it.counterId == def.id }
            val unlocked = CustomerSystem.isUnlocked(def, s)
            val padLabel = if (def.kind.wire == "wholesale") "Wholesale" else "Counter"
            if (!unlocked) {
                val lockName = def.requiresUpgrade?.let { c.upgradesById[it]?.let { u -> c.displayName(u.id, u.name) } ?: it } ?: "an upgrade"
                ContextCard(
                    "$padLabel locked",
                    listOf("Buy $lockName to open this B2B pad"),
                    null,
                )
            } else {
                val queued = s.customers.filter { it.counterId == def.id }
                val front = queued.firstOrNull { it.arrived }
                val label = def.products.joinToString(" / ") { c.productsById.getValue(it).let { p -> c.displayName(p.id, p.name) } }
                val demandMult = CustomerSystem.demandPriceMultPermille(c, s, harbor, def, counter)
                val lines = mutableListOf(
                    "Stock: ${counter.stock.usedUnits()}/${def.capacityUnits}",
                    "Queue: ${queued.size}",
                )
                if (demandMult != 1000) {
                    val pct = ((demandMult - 1000) * 100) / 1000
                    lines += if (pct >= 0) "Demand prices +$pct%" else "Demand prices $pct%"
                }
                if (front != null) {
                    val type = c.customersById[front.typeId]
                    val who = type?.name ?: front.typeId
                    val kindNote = when (type?.kind?.wire) {
                        "premium" -> " · tips well"
                        "bulk" -> " · bulk order"
                        "tourist" -> " · tourist tip"
                        "wholesaler" -> " · wholesale order"
                        "critic" -> " · picky critic"
                        "night_regular" -> " · night regular"
                        else -> ""
                    }
                    val wantLabel = front.preferredProductId?.let { c.itemName(it) } ?: "anything"
                    val subNote = when {
                        front.preferredProductId == null -> ""
                        front.reserved == 0 -> ""
                        front.preferenceMet() -> ""
                        else -> " · substituting"
                    }
                    lines += "Front: $who wants ${front.wants} $wantLabel$kindNote$subNote"
                }
                ContextCard(
                    if (def.kind.wire == "wholesale") "Wholesale · $label" else "$label counter",
                    lines,
                    if (counter.checkoutProgress > 0) counter.checkoutProgress.toFloat() / def.checkoutTicks else null,
                )
            }
        }
        ZoneKind.KIOSK -> {
            val preferred = p.preferredBaitId?.let { c.baitById[it]?.let { b -> c.displayName(b.id, b.name) } } ?: "Auto"
            ContextCard(
                title = "Bait kiosk",
                lines = listOf(
                    "Buy chum packs for rare bites",
                    "Preferred: $preferred",
                    "Bag: ${p.bag.usedUnits()}/${p.bag.capacityUnits}",
                ),
                progress = null,
            )
        }
        ZoneKind.PLOT -> {
            val plot = harbor.plotsByZone.getValue(zone.id)
            val u = c.upgradesById.getValue(plot.grantsUpgrade)
            val owned = plot.grantsUpgrade in s.ownedUpgrades
            val avail = UpgradeSystem.availability(c, s, u)
            val reqLine = when (avail) {
                UpgradeSystem.Availability.Owned -> "Built — station registered"
                is UpgradeSystem.Availability.Locked -> avail.reason
                is UpgradeSystem.Availability.TooExpensive -> "Need ${avail.missing} more coins"
                UpgradeSystem.Availability.Purchasable -> "Confirm spend to register"
            }
            ContextCard(
                title = plot.name,
                lines = listOf(plot.description, "Cost: ${u.cost}", reqLine),
                progress = null,
                plotId = plot.id,
                plotCost = if (owned) null else u.cost,
                plotBuildable = avail == UpgradeSystem.Availability.Purchasable,
            )
        }
        null -> null
    }

    val atKiosk = zone?.kind == ZoneKind.KIOSK
    val baitOffers = if (atKiosk) {
        c.bait.map { b ->
            val locked = !com.willio.jeanvilma.fishshopping.core.fishing.BaitSystem.requirementsMet(s, b)
            val miss = com.willio.jeanvilma.fishshopping.core.fishing.BaitSystem.missingRequirement(c, s, b)
            val room = p.bag.roomFor(b.id)
            val reason = when {
                locked -> "Requires: ${miss ?: "an unlock"}"
                s.coins < b.cost -> "Need ${b.cost - s.coins} more coins"
                room < 1 -> "Bag full"
                else -> null
            }
            BaitOfferView(
                id = b.id,
                name = c.displayName(b.id, b.name),
                description = b.description,
                cost = b.cost,
                packQuantity = b.packQuantity,
                ownedCount = p.bag.quantity(b.id),
                purchasable = reason == null,
                reason = reason,
                preferred = p.preferredBaitId == b.id,
            )
        }
    } else {
        emptyList()
    }

    return SimView(
        tick = s.tick,
        coins = s.coins,
        harborId = s.harborId,
        harborName = c.displayName(harbor.id, harbor.name),
        harborSpecializationName = harbor.specialization?.name,
        harborSpecializationDescription = harbor.specialization?.description,
        blockoutAsset = harbor.blockoutAsset,
        harbors = c.harbors.map { h ->
            val unlocked = HarborTravelSystem.unlocked(c, s, h)
            val current = h.id == s.harborId
            HarborMapEntryView(
                harborId = h.id,
                name = h.name,
                blockoutAsset = h.blockoutAsset,
                current = current,
                unlocked = unlocked,
                travelEnabled = unlocked && !current,
                reason = when {
                    current -> "You are here"
                    !unlocked -> HarborTravelSystem.missingRequirement(c, s, h)?.let { "Requires: $it" }
                    else -> null
                },
                specializationName = h.specialization?.name,
                specializationDescription = h.specialization?.description,
            )
        },
        fullHarborUnlock = s.fullHarborUnlock,
        player = PlayerView(p.x, p.z, p.facingX, p.facingZ, p.zoneId),
        bag = p.bag.contents().map { (id, n) -> ItemCount(id, c.itemName(id), n) },
        bagUsedUnits = p.bag.usedUnits(),
        bagCapacityUnits = p.bag.capacityUnits,
        fishingProgress = p.fishingSpecies?.let {
            val dur = p.fishingCatchTicks.coerceAtLeast(1)
            p.fishingProgress.toFloat() / dur
        },
        fishingTimingWindow = run {
            if (p.fishingSpecies == null || p.fishingCatchTicks <= 0) return@run false
            val w = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s)
            FishingSystem.inTimingWindow(p.fishingProgress, p.fishingCatchTicks, w.goodStart, w.goodEnd)
        },
        fishingTimingTier = run {
            if (p.fishingSpecies == null || p.fishingCatchTicks <= 0) return@run null
            when (FishingSystem.timingTierAt(c, s, p.fishingProgress, p.fishingCatchTicks)) {
                TimingTier.PERFECT -> "perfect"
                TimingTier.GOOD -> "good"
                TimingTier.MISS -> null
            }
        },
        timingGoodStart01 = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s).goodStart / 1000f,
        timingGoodEnd01 = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s).goodEnd / 1000f,
        timingPerfectStart01 = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s).perfectStart / 1000f,
        timingPerfectEnd01 = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.timingWindows(c, s).perfectEnd / 1000f,
        fishingCanReel = p.fishingSpecies != null && !p.reelAttemptedThisCast,
        fishingSpotEmpty = run {
            val z = zone ?: return@run false
            if (z.kind != ZoneKind.FISHING) return@run false
            val def = harbor.fishingSpots.first { it.zone == z.id }
            val spot = s.fishingSpots.first { it.zoneId == z.id }
            FishingSystem.isUnlocked(def, s) && spot.stock <= 0
        },
        fishingRegenProgress = run {
            val z = zone ?: return@run null
            if (z.kind != ZoneKind.FISHING) return@run null
            val def = harbor.fishingSpots.first { it.zone == z.id }
            val spot = s.fishingSpots.first { it.zoneId == z.id }
            if (!FishingSystem.isUnlocked(def, s) || spot.stock >= def.stockMax) return@run null
            val needed = FishingSystem.regenTicksFor(c, s, def, spot.stock)
            spot.regenProgress.toFloat() / needed
        },
        dayPartId = FishingSystem.dayPartAt(c, s.tick).id,
        dayPartName = FishingSystem.dayPartAt(c, s.tick).name,
        tideChartOwned = FishingSystem.hasTideChart(s),
        weatherId = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.weatherAt(c, s.tick).id,
        weatherName = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.weatherAt(c, s.tick).let { c.displayName(it.id, it.name) },
        weatherDescription = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.weatherAt(c, s.tick).description,
        weatherTicksRemaining = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.ticksUntilWeatherChange(c, s.tick),
        tidePhaseId = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.tidePhaseAt(c, s.tick).id,
        tidePhaseName = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.tidePhaseAt(c, s.tick).let { c.displayName(it.id, it.name) },
        tideTicksRemaining = com.willio.jeanvilma.fishshopping.core.world.WeatherSystem.ticksUntilTideChange(c, s.tick),
        activeTechniqueId = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.technique(c, s).id,
        activeTechniqueName = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.technique(c, s).let { c.displayName(it.id, it.name) },
        masteryGlobalLevel = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.globalLevel(c, s),
        techniques = c.fishingMastery.techniques.map { tech ->
            val unlocked = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.isUnlocked(c, s, tech)
            val active = com.willio.jeanvilma.fishshopping.core.fishing.MasterySystem.technique(c, s).id == tech.id
            TechniqueView(
                id = tech.id,
                name = c.displayName(tech.id, tech.name),
                description = tech.description,
                requiresMasteryLevel = tech.requiresMasteryLevel,
                unlocked = unlocked,
                active = active,
            )
        },
        preferredBaitId = p.preferredBaitId,
        activeBaitId = p.activeBaitId,
        baitOffers = baitOffers,
        context = context,
        stations = stationViews,
        counters = s.counters.map { ct ->
            CounterView(ct.counterId, ct.stock.usedUnits(), ct.stock.capacityUnits, s.customers.count { it.counterId == ct.counterId })
        },
        customersWaiting = s.customers.size,
        customers = customerViews(),
        customerEntryXMm = harbor.customerEntry.x,
        customerEntryZMm = harbor.customerEntry.z,
        customerPathWaypoints = harbor.customerPathWaypoints.map { PathPointView(it.x, it.z) },
        tutorialText = c.tutorial.getOrNull(s.tutorialIndex)?.text,
        objective = Coaching.objective(c, s),
        upgrades = c.upgrades.map { u ->
            val a = UpgradeSystem.availability(c, s, u)
            val needsPlot = com.willio.jeanvilma.fishshopping.core.world.PlotSystem.requiresPlotPresence(harbor, u.id)
            val onPlot = com.willio.jeanvilma.fishshopping.core.world.PlotSystem.standingOnUpgradePlot(harbor, s, u.id)
            val plotReady = a is UpgradeSystem.Availability.Purchasable && (!needsPlot || onPlot)
            UpgradeView(
                u.id, c.displayName(u.id, u.name), u.description, u.cost,
                owned = a is UpgradeSystem.Availability.Owned,
                purchasable = plotReady,
                reason = when {
                    a is UpgradeSystem.Availability.Locked -> a.reason
                    a is UpgradeSystem.Availability.TooExpensive -> "Need ${a.missing} more coins"
                    a is UpgradeSystem.Availability.Purchasable && needsPlot && !onPlot ->
                        "Stand on the expansion marker"
                    else -> null
                },
            )
        },
        rush = CustomerSystem.activeRush(harbor, s.tick)?.let { r ->
            RushBannerView(r.id, c.displayName(r.id, r.name), CustomerSystem.ticksRemaining(r, s.tick))
        },
        seasonalEvent = com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem.active(c, s.tick)?.let { e ->
            SeasonalEventBannerView(
                eventId = e.id,
                name = c.displayName(e.id, e.name),
                description = e.description,
                ticksRemaining = com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem.ticksRemaining(e, s.tick),
                banner = e.banner,
                customerSpawnMultPermille = e.customerSpawnMultPermille,
                priceMultPermille = e.priceMultPermille,
            )
        },
        bank = run {
            val BS = com.willio.jeanvilma.fishshopping.core.economy.BankSystem
            val unlocked = BS.unlocked(c, s)
            val hasLoan = BS.hasLoan(s)
            val products = c.bank.productsOrLegacy().map { product ->
                val productUnlocked = unlocked && BS.productUnlocked(c, s, product)
                BankLoanProductView(
                    id = product.id,
                    name = product.name,
                    description = product.description,
                    principal = product.principal,
                    repayAmount = product.repayAmount(),
                    termTicks = product.termTicks,
                    unlocked = productUnlocked,
                    lockedReason = when {
                        !unlocked -> BS.missingRequirement(c, s)?.let { "Requires: $it" }
                        !productUnlocked -> BS.productMissingRequirement(c, s, product)?.let { "Requires: $it" }
                        else -> null
                    },
                    canTake = productUnlocked && !hasLoan,
                )
            }
            BankView(
                unlocked = unlocked,
                lockedReason = BS.missingRequirement(c, s)?.let { "Requires: $it" },
                loanPrincipal = c.bank.loanPrincipal,
                repayAmount = BS.repayAmount(c),
                termTicks = c.bank.termTicks,
                loanOwed = s.loanOwed,
                loanDueTicksLeft = BS.ticksRemaining(s),
                loanOverdue = BS.overdue(s),
                canTakeLoan = unlocked && !hasLoan && products.any { it.canTake },
                canRepayLoan = hasLoan && s.coins > 0L,
                coinGoal = s.coinGoal,
                coinGoalCelebrated = s.coinGoalCelebrated,
                goalPresets = c.bank.goalPresets,
                loanProducts = products,
            )
        },
        telemetryRates = TelemetryRatesView(
            abandonPermille = Telemetry.abandonPermille(s),
            wageRatioPermille = Telemetry.wageRatioPermille(s),
            topSpecies = topSpeciesViews,
        ),
        supervisorOnDuty = WorkerSystem.supervisorOnDuty(c, s),
        workerWagePerWorkerPerHour = s.workerWagePerWorkerPerHour,
        freeOnShiftSlots = WorkerSystem.freeOnShiftSlots(c, s),
        onShiftCount = s.workers.count { it.onShift },
        overtimeOnShiftCount = (s.workers.count { it.onShift } - WorkerSystem.freeOnShiftSlots(c, s)).coerceAtLeast(0),
        workers = s.workers.map { w ->
            val def = c.workersById[w.roleId]
            val prog = c.staffProgression
            val xpToNext = if (w.level >= prog.maxLevel) null
            else prog.xpThresholds.getOrNull(w.level)?.let { (it - w.xp).coerceAtLeast(0) }
            val roleWire = def?.role?.wire ?: "fisher"
            val activeBranch = w.activeBranchId?.let { c.staffBranchesById[it] }
            val activeSchedule = w.scheduleId?.let { c.staffSchedulesById[it] }
            WorkerView(
                w.id, w.roleId, def?.let { c.displayName(it.id, it.name) } ?: w.roleId, roleWire,
                w.x, w.z, w.bag.usedUnits(), w.bag.capacityUnits, w.phase.name,
                level = w.level,
                xp = w.xp,
                xpToNext = xpToNext,
                traitNames = w.traits.map { tid -> c.workerTraitsById[tid]?.let { c.displayName(it.id, it.name) } ?: tid },
                onShift = w.onShift,
                equipment = prog.loadouts.slots.mapNotNull { slot ->
                    val uid = w.equipment[slot.id] ?: return@mapNotNull null
                    WorkerEquipmentView(
                        slotId = slot.id,
                        slotName = slot.name,
                        upgradeId = uid,
                        upgradeName = c.upgradesById[uid]?.let { c.displayName(it.id, it.name) } ?: uid,
                    )
                },
                blockedReason = WorkerSystem.blockedReason(c, s, harbor, w),
                activeBranchId = activeBranch?.id,
                activeBranchName = activeBranch?.name,
                scheduleId = activeSchedule?.id,
                scheduleName = activeSchedule?.name,
                branches = c.staffTrees.branches.filter { it.role == roleWire }.map { branch ->
                    val unlocked = branch.id in w.unlockedBranchIds
                    val reason = if (unlocked) null
                    else StaffTreesSystem.canTrain(c, s, w, branch.id)
                    StaffBranchOfferView(
                        id = branch.id,
                        name = c.displayName(branch.id, branch.name),
                        description = branch.description,
                        parentId = branch.parentId,
                        requiresWorkerLevel = branch.requiresWorkerLevel,
                        trainingCostCoins = branch.trainingCostCoins,
                        unlocked = unlocked,
                        active = w.activeBranchId == branch.id,
                        canTrain = reason == null,
                        trainReason = reason,
                        catchSpeedMultPermille = branch.catchSpeedMultPermille,
                        moveSpeedMultPermille = branch.moveSpeedMultPermille,
                        carryBonus = branch.carryBonus,
                        wageMultPermille = branch.wageMultPermille,
                    )
                },
                schedules = c.staffTrees.schedules.map { sch ->
                    StaffScheduleOfferView(
                        id = sch.id,
                        name = c.displayName(sch.id, sch.name),
                        description = sch.description,
                        dayParts = sch.dayParts,
                        wageMultPermille = sch.wageMultPermille,
                        active = w.scheduleId == sch.id,
                    )
                },
            )
        },
        staff = c.workers.map { def ->
            val a = WorkerSystem.availability(c, s, def)
            val hired = s.workers.count { it.roleId == def.id }
            StaffHireView(
                def.id, c.displayName(def.id, def.name), def.role.wire, def.hireCost, hired, def.maxHired,
                purchasable = a is WorkerSystem.WorkerHireAvailability.Purchasable,
                reason = when (a) {
                    is WorkerSystem.WorkerHireAvailability.Locked -> a.reason
                    is WorkerSystem.WorkerHireAvailability.TooExpensive -> "Need ${a.missing} more coins"
                    is WorkerSystem.WorkerHireAvailability.Maxed -> "Max hired"
                    else -> null
                },
            )
        },
        staffGear = c.staffProgression.loadouts.slots.flatMap { slot ->
            slot.upgradeIds.mapNotNull { uid ->
                if (uid !in s.ownedUpgrades) return@mapNotNull null
                val wearer = s.workers.firstOrNull { it.equipment[slot.id] == uid }
                StaffGearView(
                    upgradeId = uid,
                    name = c.upgradesById[uid]?.let { c.displayName(it.id, it.name) } ?: uid,
                    slotId = slot.id,
                    slotName = slot.name,
                    equippedOnWorkerId = wearer?.id,
                    equippedOnRoleName = wearer?.let { c.workersById[it.roleId]?.name ?: it.roleId },
                )
            }
        },
        automationIssues = automationIssueViews,
        quests = c.quests.map { q ->
            val completed = q.id in s.completedQuests
            val locked = !completed && !ProgressionSystem.requirementsMet(s, q)
            val progress = s.stat(q.goal.stat).coerceAtMost(q.goal.atLeast)
            QuestView(
                id = q.id,
                name = c.displayName(q.id, q.name),
                description = q.description,
                status = when {
                    completed -> "completed"
                    locked -> "locked"
                    else -> "active"
                },
                progress = if (completed) q.goal.atLeast else progress,
                goalAtLeast = q.goal.atLeast,
                rewardCoins = q.reward.coins,
                rewardUnlockNames = q.reward.unlockUpgrades.map { uid -> c.upgradesById[uid]?.name ?: uid },
                reason = if (locked) ProgressionSystem.missingRequirement(c, s, q)?.let { "Requires: $it" } else null,
            )
        },
        contractsUnlocked = ContractSystem.boardUnlocked(c, s),
        contractsLockedReason = ContractSystem.missingBoardRequirement(c, s)?.let { "Requires: $it" },
        contractOffers = s.contractOffers.map { o ->
            val t = c.contractTemplatesById[o.templateId]
            val maxed = s.activeContracts.size >= c.contracts.maxActive
            val standing = t?.isStanding == true
            val chainId = t?.chainId
            ContractOfferView(
                offerId = o.id,
                templateId = o.templateId,
                name = t?.name ?: o.templateId,
                description = t?.description ?: "",
                itemId = o.itemId,
                itemName = c.itemName(o.itemId),
                quantity = o.quantity,
                durationTicks = o.durationTicks,
                payout = o.payout,
                penalty = o.penalty,
                acceptEnabled = !maxed,
                reason = if (maxed) "Max active contracts" else null,
                standing = standing,
                standingStreak = if (standing) ContractSystem.standingStreak(s, o.templateId) else 0,
                chainId = chainId,
                chainStep = t?.chainStep ?: 0,
                chainLength = chainId?.let { ContractSystem.chainLength(c, it) } ?: 0,
                requiresReputationBand = t?.requiresReputationBand,
            )
        },
        activeContracts = s.activeContracts.map { job ->
            val t = c.contractTemplatesById[job.templateId]
            val bag = s.player.bag.available(job.itemId)
            val standing = t?.isStanding == true
            val chainId = t?.chainId
            ActiveContractView(
                contractId = job.id,
                templateId = job.templateId,
                name = t?.name ?: job.templateId,
                itemId = job.itemId,
                itemName = c.itemName(job.itemId),
                delivered = job.delivered,
                quantity = job.quantity,
                ticksRemaining = (job.deadlineTick - s.tick).coerceAtLeast(0).toInt(),
                payout = job.payout,
                penalty = job.penalty,
                bagAvailable = bag,
                deliverEnabled = bag > 0 && job.delivered < job.quantity,
                standing = standing,
                standingStreak = if (standing) ContractSystem.standingStreak(s, job.templateId) else 0,
                chainId = chainId,
                chainStep = t?.chainStep ?: 0,
                chainLength = chainId?.let { ContractSystem.chainLength(c, it) } ?: 0,
            )
        },
        contractRefreshTicksLeft = if (s.contractBoardRefreshAt <= 0L) 0
        else (s.contractBoardRefreshAt - s.tick).coerceAtLeast(0L).toInt(),
        contractFailStreak = ContractSystem.failStreak(s),
        contractFailStreakThreshold = c.contracts.failStreakThreshold,
        dailyLoginStreak = com.willio.jeanvilma.fishshopping.core.progression.DailyGoalsSystem.streak(s),
        dailyGoals = run {
            val DG = com.willio.jeanvilma.fishshopping.core.progression.DailyGoalsSystem
            DG.boardObjectives(c, s).map { o ->
                val progress = DG.progress(c, s, o)
                val complete = DG.isComplete(c, s, o)
                val claimed = DG.isClaimed(c, s, o)
                DailyGoalView(
                    objectiveId = o.id,
                    name = o.name,
                    description = o.description,
                    progress = progress,
                    target = o.goal.atLeast,
                    rewardCoins = DG.claimRewardCoins(c, s, o),
                    complete = complete,
                    claimed = claimed,
                    claimEnabled = complete && !claimed,
                )
            }
        },
        economyUnlocked = EconomySystem.unlocked(c, s),
        economyLockedReason = EconomySystem.missingRequirement(c, s)?.let { "Requires: $it" },
        maintenanceCoinsPerStation = if (EconomySystem.unlocked(c, s)) {
            EconomySystem.maintenanceCoinsPerStation(c, s, harbor)
        } else 0,
        bagFishSpoilActive = EconomySystem.unlocked(c, s) && c.economy.bagFishSpoilUnits > 0,
        prestigeUnlocked = PrestigeSystem.boardUnlocked(c, s),
        prestigeLockedReason = PrestigeSystem.missingBoardRequirement(c, s)?.let { "Requires: $it" },
        harborRating = PrestigeSystem.harborRating(c, s),
        reputationScorePermille = ReputationSystem.scorePermille(c, s),
        reputationBand = ReputationSystem.band(c, s),
        reputationLabel = ReputationSystem.bandLabel(c, s),
        activeRivalIds = RivalMarketSystem.activeRivals(c, s, s.harborId).map { it.id },
        rivalPressureActive = RivalMarketSystem.isPressuring(c, s, s.harborId),
        prestige = c.prestige.milestones.map { m ->
            val completed = m.id in s.completedPrestige
            val locked = !completed && !PrestigeSystem.requirementsMet(s, m)
            val progress = s.stat(m.goal.stat).coerceAtMost(m.goal.atLeast)
            PrestigeView(
                id = m.id,
                name = m.name,
                description = m.description,
                status = when {
                    completed -> "completed"
                    locked -> "locked"
                    else -> "active"
                },
                progress = if (completed) m.goal.atLeast else progress,
                goalAtLeast = m.goal.atLeast,
                rewardCoins = m.reward.coins,
                cosmetic = m.reward.cosmetic,
                catchSpeedPermille = m.reward.catchSpeedPermille,
                priceBonusPermille = m.reward.priceBonusPermille,
                reason = if (locked) PrestigeSystem.missingRequirement(c, s, m)?.let { "Requires: $it" } else null,
            )
        },
        endgameUnlocked = EndgameSystem.boardUnlocked(c, s),
        endgameLockedReason = EndgameSystem.missingBoardRequirement(c, s)?.let { "Requires: $it" },
        beatenRivalCount = s.beatenRivalIds.size,
        endgameMarkCount = s.endgameMarks.size,
        endgameMarks = s.endgameMarks.toList(),
        endgameTiers = c.endgame.tiers.map { t ->
            val unlocked = t.id in s.unlockedEndgameTiers
            EndgameTierView(
                id = t.id,
                name = t.name,
                description = t.description,
                status = when {
                    unlocked -> "unlocked"
                    EndgameSystem.tierRequirementsMet(s, t) -> "ready"
                    else -> "locked"
                },
                requiresPrestigeCount = t.requiresPrestigeCount,
                requiresRivalBeats = t.requiresRivalBeats,
                requiresChallenges = t.requiresChallenges,
                requiresMarks = t.requiresMarks,
                catchSpeedPermille = t.catchSpeedPermille,
                priceBonusPermille = t.priceBonusPermille,
                coins = t.coins,
            )
        },
        endgameChallenges = c.endgame.challenges.map { ch ->
            val completed = ch.id in s.completedEndgameChallenges
            val progress = s.stat(ch.stat).coerceAtMost(ch.atLeast)
            EndgameChallengeView(
                id = ch.id,
                name = ch.name,
                description = ch.description,
                status = if (completed) "completed" else "active",
                progress = if (completed) ch.atLeast else progress,
                goalAtLeast = ch.atLeast,
                rewardCoins = ch.rewardCoins,
                grantsMark = ch.grantsMark,
            )
        },
        achievements = c.achievements.entries.map { a ->
            val unlocked = a.id in s.unlockedAchievements
            val progress = s.stat(a.goal.stat).coerceAtMost(a.goal.atLeast)
            AchievementView(
                id = a.id,
                name = a.name,
                description = a.description,
                category = a.category,
                status = if (unlocked) "unlocked" else "active",
                progress = if (unlocked) a.goal.atLeast else progress,
                goalAtLeast = a.goal.atLeast,
                rewardCoins = a.rewardCoins,
            )
        },
        unlockedAchievementsCount = s.unlockedAchievements.size,
        unlockedCosmetics = s.unlockedCosmetics.toList(),
        decorOffers = c.decor.items.map { d ->
            val owned = d.id in s.ownedDecor
            val miss = com.willio.jeanvilma.fishshopping.core.world.DecorSystem.missingRequirement(c, s, d)
            DecorOfferView(
                id = d.id,
                name = d.name,
                description = d.description,
                cost = d.cost,
                patienceBonusTicks = d.patienceBonusTicks,
                requiresCosmetic = d.requiresCosmetic,
                status = when {
                    owned -> "owned"
                    miss != null -> "locked"
                    else -> "available"
                },
                reason = when {
                    owned -> null
                    miss != null -> "Requires: $miss"
                    s.coins < d.cost -> "Need ${d.cost - s.coins} more coins"
                    else -> null
                },
                canAfford = !owned && miss == null && s.coins >= d.cost,
            )
        },
        cosmeticIapOffers = com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem.CATALOG.map { sku ->
            CosmeticIapOfferView(
                id = sku.id,
                sku = sku.sku,
                grantsCosmetic = sku.grantsCosmetic,
                title = sku.title,
                description = sku.description,
                status = if (sku.grantsCosmetic in s.unlockedCosmetics) "owned" else "available",
            )
        },
        decorPatienceBonusTicks = com.willio.jeanvilma.fishshopping.core.world.DecorSystem.patienceBonusTicks(c, s),
        trophies = s.trophies.entries.map { (id, rec) ->
            TrophyEntryView(
                speciesId = id,
                name = c.itemName(id),
                sizePermille = rec.sizePermille,
                valueCoins = rec.valueCoins,
                tick = rec.tick,
            )
        },
        trophySets = c.trophies.sets.map { set ->
            val mounted = set.species.count { it in s.trophies }
            TrophySetView(
                id = set.id,
                name = set.name,
                description = set.description,
                mounted = mounted,
                total = set.species.size,
                completed = mounted >= set.species.size,
            )
        },
        transferAnchors = buildTransferAnchors(),
        warehouse = com.willio.jeanvilma.fishshopping.core.inventory.Warehouse.build(c, s, harbor),
        speciesBook = com.willio.jeanvilma.fishshopping.core.inventory.SpeciesBook.build(c, s),
        businessDashboard = BusinessDashboard.build(c, s, automationIssueViews, topSpeciesViews, harbor),
    )
}

