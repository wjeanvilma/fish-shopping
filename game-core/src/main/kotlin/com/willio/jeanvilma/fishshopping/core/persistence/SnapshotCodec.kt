package com.willio.jeanvilma.fishshopping.core.persistence

import com.willio.jeanvilma.fishshopping.core.content.ContentException
import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.content.Node
import com.willio.jeanvilma.fishshopping.core.inventory.Inventory
import com.willio.jeanvilma.fishshopping.core.progression.PrestigeSystem
import com.willio.jeanvilma.fishshopping.core.progression.UpgradeSystem
import com.willio.jeanvilma.fishshopping.core.sim.Batch
import com.willio.jeanvilma.fishshopping.core.sim.CounterState
import com.willio.jeanvilma.fishshopping.core.sim.CustomerState
import com.willio.jeanvilma.fishshopping.core.sim.FishingSpotState
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MachineState
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.ContractOffer
import com.willio.jeanvilma.fishshopping.core.sim.ContractState
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.WorkerState
import com.willio.jeanvilma.fishshopping.core.sim.WorkerTaskPhase
import com.willio.jeanvilma.fishshopping.core.world.HarborWorldStash
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.util.zip.CRC32

open class SnapshotException(message: String, cause: Throwable? = null) : Exception(message, cause)

/** The save was written by a newer app. Callers must keep the file untouched. */
class NewerSaveException(val schemaVersion: Int) :
    SnapshotException("Save schema $schemaVersion is newer than this app supports (${SimConstants.SCHEMA_VERSION}). Update the app; the save was not changed.")

/**
 * Serialises one consistent tick of canonical state.
 *
 * Envelope: { schemaVersion, contentVersion, checksum, state }. The checksum (CRC-32
 * of the compact state JSON) catches accidental corruption, not deliberate editing.
 * Capacities are not stored: they are rebuilt from content plus owned upgrades, so
 * a content update cannot leave a save with stale limits.
 */
data class DecodedSnapshot(
    val state: GameState,
    /** Wall-clock millis when this snapshot was written, or null for legacy saves. */
    val savedAtEpochMs: Long?,
)

object SnapshotCodec {

    /**
     * @param savedAtEpochMs when non-null, written into the envelope for offline catch-up.
     * Omitting it keeps fixture/parity encodes byte-identical to prior versions.
     */
    fun encode(content: ContentPack, s: GameState, savedAtEpochMs: Long? = null): String {
        val state = buildJsonObject {
            put("harborId", s.harborId)
            put("tick", s.tick)
            put("coins", s.coins)
            put("rngState", s.rng.state)
            put("nextSerial", s.nextSerial)
            put("tutorialIndex", s.tutorialIndex)
            put("customerSpawnProgress", s.customerSpawnProgress)
            put("player", buildJsonObject {
                val p = s.player
                put("x", p.x); put("z", p.z)
                put("facingX", p.facingX); put("facingZ", p.facingZ)
                put("zoneId", p.zoneId)
                put("transferCooldown", p.transferCooldown)
                put("fishingSpecies", p.fishingSpecies)
                put("fishingProgress", p.fishingProgress)
                put("fishingCatchTicks", p.fishingCatchTicks)
                put("reelAttemptedThisCast", p.reelAttemptedThisCast)
                put("preferredBaitId", p.preferredBaitId)
                put("activeBaitId", p.activeBaitId)
                put("bag", inv(p.bag))
            })
            put("fishingSpots", encodeFishingSpots(s.fishingSpots))
            put("machines", encodeMachines(s.machines))
            put("counters", encodeCounters(s.counters))
            put("customers", encodeCustomers(s.customers))
            put("workers", encodeWorkers(s.workers))
            put("contractBoardRefreshAt", s.contractBoardRefreshAt)
            put("contractOffers", buildJsonArray {
                s.contractOffers.forEach { o ->
                    add(buildJsonObject {
                        put("id", o.id); put("templateId", o.templateId); put("itemId", o.itemId)
                        put("quantity", o.quantity); put("durationTicks", o.durationTicks)
                        put("payout", o.payout); put("penalty", o.penalty)
                    })
                }
            })
            put("activeContracts", buildJsonArray {
                s.activeContracts.forEach { c ->
                    add(buildJsonObject {
                        put("id", c.id); put("templateId", c.templateId); put("itemId", c.itemId)
                        put("quantity", c.quantity); put("delivered", c.delivered)
                        put("deadlineTick", c.deadlineTick); put("payout", c.payout); put("penalty", c.penalty)
                    })
                }
            })
            put("ownedUpgrades", JsonArray(s.ownedUpgrades.map { JsonPrimitive(it) }))
            put("completedQuests", JsonArray(s.completedQuests.map { JsonPrimitive(it) }))
            put("completedPrestige", JsonArray(s.completedPrestige.map { JsonPrimitive(it) }))
            put("unlockedCosmetics", JsonArray(s.unlockedCosmetics.map { JsonPrimitive(it) }))
            put(
                "trophies",
                buildJsonObject {
                    for ((speciesId, rec) in s.trophies) {
                        put(
                            speciesId,
                            buildJsonObject {
                                put("sizePermille", rec.sizePermille)
                                put("valueCoins", rec.valueCoins)
                                put("tick", rec.tick)
                            },
                        )
                    }
                },
            )
            put("stats", JsonObject(s.stats.mapValues { JsonPrimitive(it.value) }))
            put("purchaseReceipts", JsonObject(s.purchaseReceipts.mapValues { receipt(it.value) }))
            put("ledger", JsonArray(s.ledger.map { receipt(it) }))
            put("harborStashes", buildJsonObject {
                for ((id, stash) in s.harborStashes) {
                    put(id, encodeStash(stash))
                }
            })
        }
        val envelope = buildJsonObject {
            put("schemaVersion", SimConstants.SCHEMA_VERSION)
            put("contentVersion", content.contentVersion)
            put("checksum", checksum(state))
            if (savedAtEpochMs != null) put("savedAtEpochMs", savedAtEpochMs)
            put("state", state)
        }
        return envelope.toString()
    }

    fun decode(content: ContentPack, text: String): GameState = decodeEnvelope(content, text).state

    fun decodeEnvelope(content: ContentPack, text: String): DecodedSnapshot {
        val root = try {
            Json.parseToJsonElement(text)
        } catch (e: Exception) {
            throw SnapshotException("Save is not valid JSON", e)
        }
        try {
            val env = Node(root, "$")
            val version = env["schemaVersion"].int()
            if (version > SimConstants.SCHEMA_VERSION) {
                throw NewerSaveException(version)
            }
            if (version < 1) throw SnapshotException("Unsupported save schema $version")
            val stateEl = (root as JsonObject)["state"] as? JsonObject ?: throw SnapshotException("Missing state")
            if (env["checksum"].string() != checksum(stateEl)) throw SnapshotException("Checksum mismatch: save is corrupt")
            val savedAt = env.optional("savedAtEpochMs")?.long(min = 0)
            return DecodedSnapshot(readState(content, Node(stateEl, "$.state"), version), savedAt)
        } catch (e: ContentException) {
            throw SnapshotException("Malformed save: ${e.message}", e)
        }
    }

    /**
     * Migrations are applied while reading: [version] is the save's schema.
     *  - v1 -> v2: customers had no walking state; they were already queued (walk 0).
     *  - v2 -> v3: customers.reserved (int, single SKU) becomes reservedItems map.
     *  - v3 -> v4: player mid-cast fishingCatchTicks + reelAttemptedThisCast.
     *  - v4 -> v5: machines.preferredRecipeId (null = Auto).
     *  - v5 -> v6: customers.preferredProductId.
     *  - v6 -> v7: workers list.
     *  - v7 -> v8: contract board offers + active deliveries.
     *  - v8 -> v9: parked harbor worlds (harborStashes).
     *  - v9 -> v10: completedPrestige + unlockedCosmetics.
     *  - v10 -> v11: player preferredBaitId + activeBaitId.
     *  - v11 -> v12: trophies map (museum personal bests).
     */
    private fun readState(content: ContentPack, n: Node, version: Int): GameState {
        val harborId = n["harborId"].string()
        if (harborId !in content.harborsById) throw SnapshotException("Unknown harbor $harborId")
        val s = GameState.newGame(content, harborId, seed = 0)
        s.rng.state = n["rngState"].int()
        s.tick = n["tick"].long(min = 0)
        s.coins = n["coins"].long(min = 0).coerceAtMost(SimConstants.MAX_SAFE_INTEGER)
        s.nextSerial = n["nextSerial"].long(min = 1)
        s.tutorialIndex = n["tutorialIndex"].int(min = 0)
        s.customerSpawnProgress = n["customerSpawnProgress"].int(min = 0)

        n["player"].let { p ->
            s.player.x = p["x"].int(); s.player.z = p["z"].int()
            s.player.facingX = p["facingX"].int(); s.player.facingZ = p["facingZ"].int()
            s.player.zoneId = p.optional("zoneId")?.string()
            s.player.transferCooldown = p["transferCooldown"].int(min = 0)
            s.player.fishingSpecies = p.optional("fishingSpecies")?.string()?.takeIf { it in content.speciesById }
            s.player.fishingProgress = p["fishingProgress"].int(min = 0)
            if (version >= 4) {
                s.player.fishingCatchTicks = p["fishingCatchTicks"].int(min = 0)
                s.player.reelAttemptedThisCast = p["reelAttemptedThisCast"].bool()
            } else if (s.player.fishingSpecies != null) {
                val sp = content.speciesById.getValue(s.player.fishingSpecies!!)
                s.player.fishingCatchTicks = com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
                    .catchTicksFor(s.player.catchSpeedPermille, sp.catchTicks)
                s.player.reelAttemptedThisCast = false
            }
            if (version >= 11) {
                s.player.preferredBaitId = p.optional("preferredBaitId")?.string()?.takeIf { it in content.baitById }
                s.player.activeBaitId = p.optional("activeBaitId")?.string()?.takeIf { it in content.baitById }
            }
            readInv(p["bag"], s.player.bag)
        }
        n["fishingSpots"].list { it }.forEach { f ->
            val spot = s.fishingSpots.firstOrNull { it.zoneId == f["zoneId"].string() } ?: return@forEach
            spot.stock = f["stock"].int(min = 0)
            spot.regenProgress = f["regenProgress"].int(min = 0)
        }
        n["machines"].list { it }.forEach { mn ->
            val m = s.machines.firstOrNull { it.stationId == mn["stationId"].string() } ?: return@forEach
            m.paused = mn["paused"].bool()
            m.status = MachineStatus.entries.firstOrNull { it.name == mn["status"].string() } ?: MachineStatus.WAITING_FOR_INPUT
            if (version >= 5) {
                val pref = mn.optional("preferredRecipeId")?.string()
                val allowed = content.machinesById[m.machineId]?.recipes.orEmpty()
                m.preferredRecipeId = pref?.takeIf { it in allowed }
            }
            readInv(mn["input"], m.input)
            readInv(mn["output"], m.output)
            m.activeBatch = mn.optional("activeBatch")?.let { b ->
                Batch(
                    b["id"].string(), b["recipeId"].string(), b["durationTicks"].int(min = 1), b["remainingTicks"].int(min = 0),
                    b["consumed"].list { ItemQuantity(it["item"].string(), it["quantity"].int(min = 1)) },
                )
            }
        }
        n["counters"].list { it }.forEach { cn ->
            val c = s.counters.firstOrNull { it.counterId == cn["counterId"].string() } ?: return@forEach
            c.checkoutProgress = cn["checkoutProgress"].int(min = 0)
            readInv(cn["stock"], c.stock)
        }
        n["customers"].list { cn ->
            val walkTotal = if (version >= 2) cn["walkTicksTotal"].int(min = 0) else 0
            val counterId = cn["counterId"].string()
            val preferred = if (version >= 6) {
                cn.optional("preferredProductId")?.string()?.takeIf { it in content.productsById }
            } else null
            CustomerState(
                cn["id"].string(), cn["typeId"].string(), counterId,
                cn["wants"].int(min = 1), cn["patienceLeft"].int(), walkTotal,
                preferredProductId = preferred,
            ).also { cust ->
                if (version >= 3) {
                    (cn["reservedItems"].el as? JsonObject)?.forEach { (item, v) ->
                        val qty = Node(v, "${cn.path}.reservedItems.$item").int(min = 1)
                        cust.addReservation(item, qty)
                    }
                } else {
                    val reserved = cn["reserved"].int(min = 0)
                    if (reserved > 0) {
                        val product = content.harborsById.getValue(harborId).counters
                            .firstOrNull { it.id == counterId }?.products?.firstOrNull()
                        if (product != null) cust.addReservation(product, reserved)
                    }
                }
                cust.walkTicksLeft = if (version >= 2) cn["walkTicksLeft"].int(min = 0).coerceAtMost(walkTotal) else 0
            }
        }.forEach { s.customers += it }

        if (version >= 7) {
            for (wn in n["workers"].list { it }) {
                val roleId = wn["roleId"].string()
                val def = content.workersById[roleId] ?: continue
                val id = wn["id"].string()
                val w = WorkerState(
                    id, roleId, wn["x"].int(), wn["z"].int(),
                    Inventory("inv.$id.bag", def.carryCapacityUnits, content::carryUnits),
                )
                readInv(wn["bag"], w.bag)
                w.walkTicksTotal = wn["walkTicksTotal"].int(min = 0)
                w.walkTicksLeft = wn["walkTicksLeft"].int(min = 0).coerceAtMost(w.walkTicksTotal)
                w.walkFromX = wn["walkFromX"].int(); w.walkFromZ = wn["walkFromZ"].int()
                w.walkToX = wn["walkToX"].int(); w.walkToZ = wn["walkToZ"].int()
                w.transferCooldown = wn["transferCooldown"].int(min = 0)
                w.phase = WorkerTaskPhase.entries.firstOrNull { it.name == wn["phase"].string() }
                    ?: WorkerTaskPhase.NONE
                w.taskId = wn.optional("taskId")?.string()
                w.taskZoneId = wn.optional("taskZoneId")?.string()
                w.taskSourceInvId = wn.optional("taskSourceInvId")?.string()
                w.taskDestInvId = wn.optional("taskDestInvId")?.string()
                w.taskItemId = wn.optional("taskItemId")?.string()
                w.taskQuantity = wn["taskQuantity"].int(min = 0)
                w.leaseExpiresAt = wn["leaseExpiresAt"].long(min = 0)
                w.fishingSpecies = wn.optional("fishingSpecies")?.string()?.takeIf { it in content.speciesById }
                w.fishingProgress = wn["fishingProgress"].int(min = 0)
                w.fishingCatchTicks = wn["fishingCatchTicks"].int(min = 0)
                s.workers += w
            }
        }

        if (version >= 8) {
            s.contractBoardRefreshAt = n["contractBoardRefreshAt"].long(min = 0)
            for (on in n["contractOffers"].list { it }) {
                val templateId = on["templateId"].string()
                if (templateId !in content.contractTemplatesById) continue
                s.contractOffers += ContractOffer(
                    id = on["id"].string(),
                    templateId = templateId,
                    itemId = on["itemId"].string(),
                    quantity = on["quantity"].int(min = 1),
                    durationTicks = on["durationTicks"].int(min = 1),
                    payout = on["payout"].long(min = 0),
                    penalty = on["penalty"].long(min = 0),
                )
            }
            for (cn in n["activeContracts"].list { it }) {
                val templateId = cn["templateId"].string()
                if (templateId !in content.contractTemplatesById) continue
                val qty = cn["quantity"].int(min = 1)
                s.activeContracts += ContractState(
                    id = cn["id"].string(),
                    templateId = templateId,
                    itemId = cn["itemId"].string(),
                    quantity = qty,
                    delivered = cn["delivered"].int(min = 0).coerceAtMost(qty),
                    deadlineTick = cn["deadlineTick"].long(min = 0),
                    payout = cn["payout"].long(min = 0),
                    penalty = cn["penalty"].long(min = 0),
                )
            }
        }

        n["ownedUpgrades"].list { it.string() }.filter { it in content.upgradesById }.forEach { s.ownedUpgrades += it }
        n["completedQuests"].list { it.string() }.forEach { s.completedQuests += it }
        if (version >= 10) {
            n["completedPrestige"].list { it.string() }
                .filter { it in content.prestigeMilestonesById }
                .forEach { s.completedPrestige += it }
            n["unlockedCosmetics"].list { it.string() }.forEach { s.unlockedCosmetics += it }
            if (version >= 12) {
                (n.optional("trophies")?.el as? JsonObject)?.forEach { (speciesId, v) ->
                    if (speciesId !in content.speciesById) return@forEach
                    val rec = Node(v, "$.state.trophies.$speciesId")
                    s.trophies[speciesId] = com.willio.jeanvilma.fishshopping.core.sim.TrophyRecord(
                        sizePermille = rec["sizePermille"].int(min = 1),
                        valueCoins = rec["valueCoins"].long(min = 0),
                        tick = rec["tick"].long(min = 0),
                    )
                }
            }
        }
        (n["stats"].el as? JsonObject)?.forEach { (k, v) -> s.stats[k] = Node(v, "$.state.stats.$k").long() }
        if (version >= 12) {
            com.willio.jeanvilma.fishshopping.core.fishing.TrophySystem.rebuildSetStats(content, s)
        }
        (n["purchaseReceipts"].el as? JsonObject)?.forEach { (k, v) -> s.purchaseReceipts[k] = readReceipt(Node(v, "$.state.purchaseReceipts.$k")) }
        n["ledger"].list(::readReceipt).forEach { s.ledger.addLast(it) }

        if (version >= 9) {
            (n["harborStashes"].el as? JsonObject)?.forEach { (stashHarborId, el) ->
                if (stashHarborId !in content.harborsById || stashHarborId == harborId) return@forEach
                val stashNode = Node(el, "$.state.harborStashes.$stashHarborId")
                s.harborStashes[stashHarborId] = readStash(content, stashHarborId, stashNode, version)
            }
        }

        // Rebuild derived limits from content + owned upgrades / prestige (idempotent effects).
        s.ownedUpgrades.forEach { UpgradeSystem.applyEffect(s, content.upgradesById.getValue(it).effect) }
        s.completedPrestige.forEach { id ->
            PrestigeSystem.applyReward(s, content.prestigeMilestonesById.getValue(id))
        }
        return s
    }

    private fun encodeFishingSpots(spots: List<FishingSpotState>) = buildJsonArray {
        spots.forEach { f ->
            add(buildJsonObject { put("zoneId", f.zoneId); put("stock", f.stock); put("regenProgress", f.regenProgress) })
        }
    }

    private fun encodeMachines(machines: List<MachineState>) = buildJsonArray {
        machines.forEach { m ->
            add(buildJsonObject {
                put("stationId", m.stationId)
                put("paused", m.paused)
                put("status", m.status.name)
                put("preferredRecipeId", m.preferredRecipeId)
                put("input", inv(m.input))
                put("output", inv(m.output))
                put("activeBatch", m.activeBatch?.let { b ->
                    buildJsonObject {
                        put("id", b.id); put("recipeId", b.recipeId)
                        put("durationTicks", b.durationTicks); put("remainingTicks", b.remainingTicks)
                        put("consumed", buildJsonArray {
                            b.consumed.forEach { add(buildJsonObject { put("item", it.item); put("quantity", it.quantity) }) }
                        })
                    }
                } ?: JsonNull)
            })
        }
    }

    private fun encodeCounters(counters: List<CounterState>) = buildJsonArray {
        counters.forEach { c ->
            add(buildJsonObject { put("counterId", c.counterId); put("checkoutProgress", c.checkoutProgress); put("stock", inv(c.stock)) })
        }
    }

    private fun encodeCustomers(customers: List<CustomerState>) = buildJsonArray {
        customers.forEach { c ->
            add(buildJsonObject {
                put("id", c.id); put("typeId", c.typeId); put("counterId", c.counterId)
                put("wants", c.wants); put("patienceLeft", c.patienceLeft)
                put("reservedItems", JsonObject(c.reservedItems.mapValues { JsonPrimitive(it.value) }))
                put("walkTicksTotal", c.walkTicksTotal); put("walkTicksLeft", c.walkTicksLeft)
                put("preferredProductId", c.preferredProductId)
            })
        }
    }

    private fun encodeWorkers(workers: List<WorkerState>) = buildJsonArray {
        workers.forEach { w ->
            add(buildJsonObject {
                put("id", w.id); put("roleId", w.roleId)
                put("x", w.x); put("z", w.z)
                put("bag", inv(w.bag))
                put("walkTicksTotal", w.walkTicksTotal); put("walkTicksLeft", w.walkTicksLeft)
                put("walkFromX", w.walkFromX); put("walkFromZ", w.walkFromZ)
                put("walkToX", w.walkToX); put("walkToZ", w.walkToZ)
                put("transferCooldown", w.transferCooldown)
                put("phase", w.phase.name)
                put("taskId", w.taskId)
                put("taskZoneId", w.taskZoneId)
                put("taskSourceInvId", w.taskSourceInvId)
                put("taskDestInvId", w.taskDestInvId)
                put("taskItemId", w.taskItemId)
                put("taskQuantity", w.taskQuantity)
                put("leaseExpiresAt", w.leaseExpiresAt)
                put("fishingSpecies", w.fishingSpecies)
                put("fishingProgress", w.fishingProgress)
                put("fishingCatchTicks", w.fishingCatchTicks)
            })
        }
    }

    private fun encodeStash(stash: HarborWorldStash) = buildJsonObject {
        put("fishingSpots", encodeFishingSpots(stash.fishingSpots))
        put("machines", encodeMachines(stash.machines))
        put("counters", encodeCounters(stash.counters))
        put("customers", encodeCustomers(stash.customers))
        put("workers", encodeWorkers(stash.workers))
        put("customerSpawnProgress", stash.customerSpawnProgress)
        put("playerX", stash.playerX)
        put("playerZ", stash.playerZ)
        put("playerFacingX", stash.playerFacingX)
        put("playerFacingZ", stash.playerFacingZ)
        put("playerZoneId", stash.playerZoneId)
    }

    private fun readStash(content: ContentPack, harborId: String, n: Node, version: Int): HarborWorldStash {
        val harbor = content.harborsById.getValue(harborId)
        val units = content::carryUnits
        val fishingSpots = harbor.fishingSpots.map { FishingSpotState(it.zone, it.stockMax) }.toMutableList()
        n["fishingSpots"].list { it }.forEach { f ->
            val spot = fishingSpots.firstOrNull { it.zoneId == f["zoneId"].string() } ?: return@forEach
            spot.stock = f["stock"].int(min = 0)
            spot.regenProgress = f["regenProgress"].int(min = 0)
        }
        val machines = harbor.stations.map { st ->
            val def = content.machinesById.getValue(st.machine)
            MachineState(
                st.id, st.machine,
                Inventory("inv.${st.id}.input", def.inputCapacityUnits, units),
                Inventory("inv.${st.id}.output", def.outputCapacityUnits, units),
            )
        }.toMutableList()
        n["machines"].list { it }.forEach { mn ->
            val m = machines.firstOrNull { it.stationId == mn["stationId"].string() } ?: return@forEach
            m.paused = mn["paused"].bool()
            m.status = MachineStatus.entries.firstOrNull { it.name == mn["status"].string() } ?: MachineStatus.WAITING_FOR_INPUT
            if (version >= 5) {
                val pref = mn.optional("preferredRecipeId")?.string()
                val allowed = content.machinesById[m.machineId]?.recipes.orEmpty()
                m.preferredRecipeId = pref?.takeIf { it in allowed }
            }
            readInv(mn["input"], m.input)
            readInv(mn["output"], m.output)
            m.activeBatch = mn.optional("activeBatch")?.let { b ->
                Batch(
                    b["id"].string(), b["recipeId"].string(), b["durationTicks"].int(min = 1), b["remainingTicks"].int(min = 0),
                    b["consumed"].list { ItemQuantity(it["item"].string(), it["quantity"].int(min = 1)) },
                )
            }
        }
        val counters = harbor.counters.map {
            CounterState(it.id, Inventory("inv.${it.id}", it.capacityUnits, units))
        }.toMutableList()
        n["counters"].list { it }.forEach { cn ->
            val c = counters.firstOrNull { it.counterId == cn["counterId"].string() } ?: return@forEach
            c.checkoutProgress = cn["checkoutProgress"].int(min = 0)
            readInv(cn["stock"], c.stock)
        }
        val customers = mutableListOf<CustomerState>()
        n["customers"].list { cn ->
            val walkTotal = cn["walkTicksTotal"].int(min = 0)
            val counterId = cn["counterId"].string()
            val preferred = cn.optional("preferredProductId")?.string()?.takeIf { it in content.productsById }
            CustomerState(
                cn["id"].string(), cn["typeId"].string(), counterId,
                cn["wants"].int(min = 1), cn["patienceLeft"].int(), walkTotal,
                preferredProductId = preferred,
            ).also { cust ->
                (cn["reservedItems"].el as? JsonObject)?.forEach { (item, v) ->
                    val qty = Node(v, "${cn.path}.reservedItems.$item").int(min = 1)
                    cust.addReservation(item, qty)
                }
                cust.walkTicksLeft = cn["walkTicksLeft"].int(min = 0).coerceAtMost(walkTotal)
            }
        }.forEach { customers += it }
        val workers = mutableListOf<WorkerState>()
        for (wn in n["workers"].list { it }) {
            val roleId = wn["roleId"].string()
            val def = content.workersById[roleId] ?: continue
            val id = wn["id"].string()
            val w = WorkerState(
                id, roleId, wn["x"].int(), wn["z"].int(),
                Inventory("inv.$id.bag", def.carryCapacityUnits, content::carryUnits),
            )
            readInv(wn["bag"], w.bag)
            w.walkTicksTotal = wn["walkTicksTotal"].int(min = 0)
            w.walkTicksLeft = wn["walkTicksLeft"].int(min = 0).coerceAtMost(w.walkTicksTotal)
            w.walkFromX = wn["walkFromX"].int(); w.walkFromZ = wn["walkFromZ"].int()
            w.walkToX = wn["walkToX"].int(); w.walkToZ = wn["walkToZ"].int()
            w.transferCooldown = wn["transferCooldown"].int(min = 0)
            w.phase = WorkerTaskPhase.entries.firstOrNull { it.name == wn["phase"].string() }
                ?: WorkerTaskPhase.NONE
            w.taskId = wn.optional("taskId")?.string()
            w.taskZoneId = wn.optional("taskZoneId")?.string()
            w.taskSourceInvId = wn.optional("taskSourceInvId")?.string()
            w.taskDestInvId = wn.optional("taskDestInvId")?.string()
            w.taskItemId = wn.optional("taskItemId")?.string()
            w.taskQuantity = wn["taskQuantity"].int(min = 0)
            w.leaseExpiresAt = wn["leaseExpiresAt"].long(min = 0)
            w.fishingSpecies = wn.optional("fishingSpecies")?.string()?.takeIf { it in content.speciesById }
            w.fishingProgress = wn["fishingProgress"].int(min = 0)
            w.fishingCatchTicks = wn["fishingCatchTicks"].int(min = 0)
            workers += w
        }
        return HarborWorldStash(
            fishingSpots = fishingSpots,
            machines = machines,
            counters = counters,
            customers = customers,
            workers = workers,
            customerSpawnProgress = n["customerSpawnProgress"].int(min = 0),
            playerX = n["playerX"].int(),
            playerZ = n["playerZ"].int(),
            playerFacingX = n["playerFacingX"].int(),
            playerFacingZ = n["playerFacingZ"].int(),
            playerZoneId = n.optional("playerZoneId")?.string(),
        )
    }

    private fun inv(i: Inventory) = buildJsonObject {
        put("quantities", JsonObject(i.contents().mapValues { JsonPrimitive(it.value) }))
        put("reserved", JsonObject(i.reservations().mapValues { JsonPrimitive(it.value) }))
    }

    private fun readInv(n: Node, into: Inventory) {
        fun map(key: String): Map<String, Int> =
            (n[key].el as? JsonObject)?.mapValues { (k, v) -> Node(v, "${n.path}.$key.$k").int(min = 0) } ?: emptyMap()
        into.restore(map("quantities"), map("reserved"))
    }

    private fun receipt(r: Receipt) = buildJsonObject {
        put("id", r.id); put("type", r.type); put("coinDelta", r.coinDelta); put("tick", r.tick); put("reference", r.reference)
    }

    private fun readReceipt(n: Node) =
        Receipt(n["id"].string(), n["type"].string(), n["coinDelta"].long(), n["tick"].long(), n["reference"].string())

    private fun checksum(state: JsonElement): String {
        val crc = CRC32()
        crc.update(state.toString().toByteArray(Charsets.UTF_8))
        return "%08x".format(crc.value)
    }
}
