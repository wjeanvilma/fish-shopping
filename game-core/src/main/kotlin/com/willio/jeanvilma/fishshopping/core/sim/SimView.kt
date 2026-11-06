package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.content.ZoneKind
import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.customers.ReputationSystem
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
import com.willio.jeanvilma.fishshopping.core.contracts.ContractSystem
import com.willio.jeanvilma.fishshopping.core.economy.EconomySystem
import com.willio.jeanvilma.fishshopping.core.progression.PrestigeSystem
import com.willio.jeanvilma.fishshopping.core.progression.ProgressionSystem
import com.willio.jeanvilma.fishshopping.core.progression.UpgradeSystem
import com.willio.jeanvilma.fishshopping.core.workers.WorkerSystem
import com.willio.jeanvilma.fishshopping.core.world.HarborTravelSystem

/**
 * Immutable presentation snapshot built on the simulation thread and handed to
 * the HUD and renderer. Nothing here can mutate game state.
 */
data class SimView(
    val tick: Long,
    val coins: Long,
    val harborId: String,
    val harborName: String,
    /** GLB under models/ for the active harbor blockout. */
    val blockoutAsset: String,
    val harbors: List<HarborMapEntryView>,
    val player: PlayerView,
    val bag: List<ItemCount>,
    val bagUsedUnits: Int,
    val bagCapacityUnits: Int,
    val fishingProgress: Float?,
    /** True while casting and progress is inside the Good or Perfect reel window. */
    val fishingTimingWindow: Boolean,
    /** Current reel tier while casting: perfect / good / null outside the window. */
    val fishingTimingTier: String?,
    /** True while casting and the player can still attempt Reel. */
    val fishingCanReel: Boolean,
    /** True when standing on an unlocked fishing spot with zero stock. */
    val fishingSpotEmpty: Boolean,
    /** Progress toward the next restocked fish when the current spot is regenerating. */
    val fishingRegenProgress: Float?,
    /** Current harbor day-part id (dawn/day/dusk/night). */
    val dayPartId: String,
    val dayPartName: String,
    /** True when tide chart is owned (night regen eases + dawn/dusk cast bonus). */
    val tideChartOwned: Boolean,
    /** Preferred bait id for new casts (null = auto). */
    val preferredBaitId: String?,
    /** Active cast bait id, if any. */
    val activeBaitId: String?,
    /** Bait for sale while standing in a kiosk (empty elsewhere). */
    val baitOffers: List<BaitOfferView>,
    val context: ContextCard?,
    val stations: List<StationView>,
    val counters: List<CounterView>,
    val customersWaiting: Int,
    /** Every customer in the harbor, walking or queued, in queue order per counter. */
    val customers: List<CustomerView>,
    /** Where customers enter and leave (renderers walk departing customers back here). */
    val customerEntryXMm: Int,
    val customerEntryZMm: Int,
    /**
     * Approach waypoints between entry and the queue (presentation leave path uses
     * these in reverse). Empty when the approach is a straight line.
     */
    val customerPathWaypoints: List<PathPointView>,
    val tutorialText: String?,
    /** Phase 30 HUD objective: tutorial, active quest, or empty-state tip. */
    val objective: ObjectiveView?,
    val upgrades: List<UpgradeView>,
    /** Non-null while a harbor rush window is active. */
    val rush: RushBannerView?,
    /** True while a hired supervisor is posted (boosts haul demand scoring). */
    val supervisorOnDuty: Boolean,
    /** Coins charged per hired worker each simulated hour (0 = unpaid). */
    val workerWagePerWorkerPerHour: Int,
    val workers: List<WorkerView>,
    val staff: List<StaffHireView>,
    val quests: List<QuestView>,
    val contractsUnlocked: Boolean,
    val contractsLockedReason: String?,
    val contractOffers: List<ContractOfferView>,
    val activeContracts: List<ActiveContractView>,
    val contractRefreshTicksLeft: Int,
    /** Soft sinks unlocked (maintenance + spoilage). */
    val economyUnlocked: Boolean,
    val economyLockedReason: String?,
    /** Effective coins charged per station each maintenance cycle (0 if none/locked). */
    val maintenanceCoinsPerStation: Int,
    /** True while bag fish spoilage is active. */
    val bagFishSpoilActive: Boolean,
    val prestigeUnlocked: Boolean,
    val prestigeLockedReason: String?,
    /** Harbor rating stars 0..5 from lifetime revenue. */
    val harborRating: Int,
    /** Service reputation score permille from served vs abandoned (Phase 13). */
    val reputationScorePermille: Int,
    /** Reputation band index (0 = poor … higher = better). */
    val reputationBand: Int,
    /** Short band label for the HUD strip. */
    val reputationLabel: String,
    val prestige: List<PrestigeView>,
    val unlockedCosmetics: List<String>,
    /** Museum personal bests (sorted by species id). */
    val trophies: List<TrophyEntryView>,
    /** Curated gallery progress for the Goals panel. */
    val trophySets: List<TrophySetView>,
    /**
     * World anchors for inventory ids used by flying-transfer VFX
     * ([GameEvent.ItemsTransferred] from/to). Presentation only.
     */
    val transferAnchors: List<TransferAnchorView>,
)

/** Inventory id → ground position for bag ↔ pad ↔ counter arcs. */
data class TransferAnchorView(val inventoryId: String, val xMm: Int, val zMm: Int)

/**
 * Presentation-only customer position: interpolated along the canonical walk, then the
 * customer's current queue slot (which moves forward as people ahead are served).
 */
data class CustomerView(
    val id: String,
    val counterId: String,
    val queueIndex: Int,
    val xMm: Float,
    val zMm: Float,
    val arrived: Boolean,
    val wants: Int,
    val reserved: Int,
    val typeId: String,
    val typeName: String,
    /** standard | premium | bulk */
    val kind: String,
    val preferredProductId: String?,
    val preferredProductName: String?,
    val preferenceMet: Boolean,
)

data class PlayerView(val xMm: Int, val zMm: Int, val facingX: Int, val facingZ: Int, val zoneId: String?)
data class ItemCount(val itemId: String, val name: String, val count: Int)
data class ContextCard(
    val title: String,
    val lines: List<String>,
    val progress: Float?,
    /** When set, HUD can cycle this station's preferred recipe. */
    val stationId: String? = null,
    /** Auto, or the locked recipe label. */
    val recipeModeLabel: String? = null,
)

data class BaitOfferView(
    val id: String,
    val name: String,
    val description: String,
    val cost: Long,
    val packQuantity: Int,
    val ownedCount: Int,
    val purchasable: Boolean,
    val reason: String?,
    val preferred: Boolean,
)
data class StationView(
    val stationId: String,
    val status: MachineStatus,
    val inputCount: Int,
    val outputCount: Int,
    val progress: Float?,
    val statusText: String,
    val preferredRecipeId: String?,
    val nextRecipeId: String?,
)
data class CounterView(val counterId: String, val stock: Int, val capacityUnits: Int, val queue: Int)

data class UpgradeView(
    val id: String,
    val name: String,
    val description: String,
    val cost: Long,
    val owned: Boolean,
    val purchasable: Boolean,
    val reason: String?,
)

data class RushBannerView(
    val rushId: String,
    val name: String,
    val ticksRemaining: Int,
)

data class PathPointView(val xMm: Int, val zMm: Int)

data class WorkerView(
    val id: String,
    val roleId: String,
    val roleName: String,
    val roleKind: String,
    val xMm: Int,
    val zMm: Int,
    val bagUsedUnits: Int,
    val bagCapacityUnits: Int,
    val phase: String,
)

data class StaffHireView(
    val roleId: String,
    val name: String,
    val roleKind: String,
    val cost: Long,
    val hired: Int,
    val maxHired: Int,
    val purchasable: Boolean,
    val reason: String?,
)

/** completed | active | locked */
data class QuestView(
    val id: String,
    val name: String,
    val description: String,
    val status: String,
    val progress: Long,
    val goalAtLeast: Long,
    val rewardCoins: Long,
    val rewardUnlockNames: List<String>,
    val reason: String?,
)

data class ContractOfferView(
    val offerId: String,
    val templateId: String,
    val name: String,
    val description: String,
    val itemId: String,
    val itemName: String,
    val quantity: Int,
    val durationTicks: Int,
    val payout: Long,
    val penalty: Long,
    val acceptEnabled: Boolean,
    val reason: String?,
    /** Phase 14 standing order flag. */
    val standing: Boolean = false,
    /** Current standing streak shown on the board (0 for standard). */
    val standingStreak: Int = 0,
)

data class ActiveContractView(
    val contractId: String,
    val templateId: String,
    val name: String,
    val itemId: String,
    val itemName: String,
    val delivered: Int,
    val quantity: Int,
    val ticksRemaining: Int,
    val payout: Long,
    val penalty: Long,
    val bagAvailable: Int,
    val deliverEnabled: Boolean,
    /** Phase 14 standing order flag. */
    val standing: Boolean = false,
    /** Completions in the current standing run. */
    val standingStreak: Int = 0,
)

data class HarborMapEntryView(
    val harborId: String,
    val name: String,
    val blockoutAsset: String,
    val current: Boolean,
    val unlocked: Boolean,
    val travelEnabled: Boolean,
    val reason: String?,
)

/** completed | active | locked */
data class PrestigeView(
    val id: String,
    val name: String,
    val description: String,
    val status: String,
    val progress: Long,
    val goalAtLeast: Long,
    val rewardCoins: Long,
    val cosmetic: String?,
    val catchSpeedPermille: Int,
    val priceBonusPermille: Int,
    val reason: String?,
)

data class TrophyEntryView(
    val speciesId: String,
    val name: String,
    val sizePermille: Int,
    val valueCoins: Long,
    val tick: Long,
)

data class TrophySetView(
    val id: String,
    val name: String,
    val description: String,
    val mounted: Int,
    val total: Int,
    val completed: Boolean,
)

private fun Simulation.customerViews(): List<CustomerView> {
    return harbor.counters.flatMap { def ->
        state.customers.filter { it.counterId == def.id }.mapIndexed { index, c ->
            val slot = def.queueSlot(index)
            val path = CustomerSystem.approachPath(harbor, slot)
            val elapsed = (c.walkTicksTotal - c.walkTicksLeft).coerceAtLeast(0)
            val (x, z) = CustomerSystem.pointAlongPath(path, elapsed, c.walkTicksTotal)
            val type = content.customersById[c.typeId]
            val prefName = c.preferredProductId?.let { content.itemName(it) }
            CustomerView(
                c.id, def.id, index,
                x, z,
                c.arrived, c.wants, c.reserved,
                typeId = c.typeId,
                typeName = type?.name ?: c.typeId,
                kind = type?.kind?.wire ?: "standard",
                preferredProductId = c.preferredProductId,
                preferredProductName = prefName,
                preferenceMet = c.preferenceMet(),
            )
        }
    }
}

fun Simulation.view(): SimView {
    val s = state
    val c = content
    val p = s.player
    val zone = p.zoneId?.let { harbor.zonesById[it] }

    val stationViews = s.machines.map { m ->
        val stDef = harbor.stations.first { it.id == m.stationId }
        val unlocked = ProductionSystem.isUnlocked(stDef, s)
        val lockName = stDef.requiresUpgrade?.let { c.upgradesById[it]?.name ?: it } ?: "an upgrade"
        val status = if (unlocked) m.status else MachineStatus.LOCKED
        val batch = m.activeBatch
        val progress = if (unlocked) batch?.let { 1f - it.remainingTicks.toFloat() / it.durationTicks } else null
        StationView(
            m.stationId, status, m.input.usedUnits(), m.output.usedUnits(), progress,
            statusText = if (unlocked) ProductionSystem.statusText(m, c)
            else "Locked — buy $lockName",
            preferredRecipeId = m.preferredRecipeId,
            nextRecipeId = if (unlocked) {
                ProductionSystem.nextStartable(c, m)?.id ?: m.activeBatch?.recipeId
            } else null,
        )
    }

    val context: ContextCard? = when (zone?.kind) {
        ZoneKind.FISHING -> {
            val spotDef = harbor.fishingSpots.first { it.zone == zone.id }
            val spot = s.fishingSpots.first { it.zoneId == zone.id }
            val unlocked = FishingSystem.isUnlocked(spotDef, s)
            val full = p.bag.freeUnits() == 0
            val casting = p.fishingSpecies != null && p.fishingCatchTicks > 0
            val inWindow = casting && FishingSystem.inTimingWindow(
                p.fishingProgress, p.fishingCatchTicks,
                p.timingWindowStartPermille, p.timingWindowEndPermille,
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
            if (casting) lines += "Hooked: ${c.speciesById.getValue(p.fishingSpecies!!).name}"
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
                title = c.machinesById.getValue(m.machineId).name,
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
            val queued = s.customers.filter { it.counterId == def.id }
            val front = queued.firstOrNull { it.arrived }
            val label = def.products.joinToString(" / ") { c.productsById.getValue(it).name }
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
                "$label counter",
                lines,
                if (counter.checkoutProgress > 0) counter.checkoutProgress.toFloat() / def.checkoutTicks else null,
            )
        }
        ZoneKind.KIOSK -> {
            val preferred = p.preferredBaitId?.let { c.baitById[it]?.name } ?: "Auto"
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
                name = b.name,
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
        harborName = harbor.name,
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
            )
        },
        player = PlayerView(p.x, p.z, p.facingX, p.facingZ, p.zoneId),
        bag = p.bag.contents().map { (id, n) -> ItemCount(id, c.itemName(id), n) },
        bagUsedUnits = p.bag.usedUnits(),
        bagCapacityUnits = p.bag.capacityUnits,
        fishingProgress = p.fishingSpecies?.let {
            val dur = p.fishingCatchTicks.coerceAtLeast(1)
            p.fishingProgress.toFloat() / dur
        },
        fishingTimingWindow = p.fishingSpecies != null && p.fishingCatchTicks > 0 &&
            FishingSystem.inTimingWindow(
                p.fishingProgress, p.fishingCatchTicks,
                p.timingWindowStartPermille, p.timingWindowEndPermille,
            ),
        fishingTimingTier = run {
            if (p.fishingSpecies == null || p.fishingCatchTicks <= 0) return@run null
            when (FishingSystem.timingTierAt(p, p.fishingProgress, p.fishingCatchTicks)) {
                TimingTier.PERFECT -> "perfect"
                TimingTier.GOOD -> "good"
                TimingTier.MISS -> null
            }
        },
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
            UpgradeView(
                u.id, u.name, u.description, u.cost,
                owned = a is UpgradeSystem.Availability.Owned,
                purchasable = a is UpgradeSystem.Availability.Purchasable,
                reason = when (a) {
                    is UpgradeSystem.Availability.Locked -> a.reason
                    is UpgradeSystem.Availability.TooExpensive -> "Need ${a.missing} more coins"
                    else -> null
                },
            )
        },
        rush = CustomerSystem.activeRush(harbor, s.tick)?.let { r ->
            RushBannerView(r.id, r.name, CustomerSystem.ticksRemaining(r, s.tick))
        },
        supervisorOnDuty = WorkerSystem.supervisorOnDuty(c, s),
        workerWagePerWorkerPerHour = s.workerWagePerWorkerPerHour,
        workers = s.workers.map { w ->
            val def = c.workersById[w.roleId]
            WorkerView(
                w.id, w.roleId, def?.name ?: w.roleId, def?.role?.wire ?: "fisher",
                w.x, w.z, w.bag.usedUnits(), w.bag.capacityUnits, w.phase.name,
            )
        },
        staff = c.workers.map { def ->
            val a = WorkerSystem.availability(c, s, def)
            val hired = s.workers.count { it.roleId == def.id }
            StaffHireView(
                def.id, def.name, def.role.wire, def.hireCost, hired, def.maxHired,
                purchasable = a is WorkerSystem.WorkerHireAvailability.Purchasable,
                reason = when (a) {
                    is WorkerSystem.WorkerHireAvailability.Locked -> a.reason
                    is WorkerSystem.WorkerHireAvailability.TooExpensive -> "Need ${a.missing} more coins"
                    is WorkerSystem.WorkerHireAvailability.Maxed -> "Max hired"
                    else -> null
                },
            )
        },
        quests = c.quests.map { q ->
            val completed = q.id in s.completedQuests
            val locked = !completed && !ProgressionSystem.requirementsMet(s, q)
            val progress = s.stat(q.goal.stat).coerceAtMost(q.goal.atLeast)
            QuestView(
                id = q.id,
                name = q.name,
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
            )
        },
        activeContracts = s.activeContracts.map { job ->
            val t = c.contractTemplatesById[job.templateId]
            val bag = s.player.bag.available(job.itemId)
            val standing = t?.isStanding == true
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
            )
        },
        contractRefreshTicksLeft = if (s.contractBoardRefreshAt <= 0L) 0
        else (s.contractBoardRefreshAt - s.tick).coerceAtLeast(0L).toInt(),
        economyUnlocked = EconomySystem.unlocked(c, s),
        economyLockedReason = EconomySystem.missingRequirement(c, s)?.let { "Requires: $it" },
        maintenanceCoinsPerStation = if (EconomySystem.unlocked(c, s)) {
            EconomySystem.maintenanceCoinsPerStation(c, s)
        } else 0,
        bagFishSpoilActive = EconomySystem.unlocked(c, s) && c.economy.bagFishSpoilUnits > 0,
        prestigeUnlocked = PrestigeSystem.boardUnlocked(c, s),
        prestigeLockedReason = PrestigeSystem.missingBoardRequirement(c, s)?.let { "Requires: $it" },
        harborRating = PrestigeSystem.harborRating(c, s),
        reputationScorePermille = ReputationSystem.scorePermille(c, s),
        reputationBand = ReputationSystem.band(c, s),
        reputationLabel = ReputationSystem.bandLabel(c, s),
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
        unlockedCosmetics = s.unlockedCosmetics.toList(),
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
    )
}

private fun Simulation.buildTransferAnchors(): List<TransferAnchorView> {
    val s = state
    val h = harbor
    val out = ArrayList<TransferAnchorView>(4 + h.stations.size * 2 + h.counters.size + s.workers.size)
    out += TransferAnchorView("inv.player_bag", s.player.x, s.player.z)
    for (st in h.stations) {
        val input = h.zonesById.getValue(st.inputZone).rect
        val output = h.zonesById.getValue(st.outputZone).rect
        out += TransferAnchorView("inv.${st.id}.input", input.centerX, input.centerZ)
        out += TransferAnchorView("inv.${st.id}.output", output.centerX, output.centerZ)
    }
    for (c in h.counters) {
        val z = h.zonesById.getValue(c.zone).rect
        out += TransferAnchorView("inv.${c.id}", z.centerX, z.centerZ)
    }
    for (w in s.workers) {
        out += TransferAnchorView("inv.${w.id}.bag", w.x, w.z)
    }
    return out
}
