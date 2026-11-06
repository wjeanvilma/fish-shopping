package com.willio.jeanvilma.fishshopping.core.content

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.longOrNull

class ContentException(message: String) : Exception(message)

/**
 * Parses and validates a content pack. Decoding is explicit (no reflection or
 * compiler plugin) so every error names the exact JSON path, matching what the
 * web client's JSON Schema validation reports.
 */
object ContentLoader {

    fun load(jsonText: String): ContentPack {
        val root = try {
            Json.parseToJsonElement(jsonText)
        } catch (e: Exception) {
            throw ContentException("Content pack is not valid JSON: ${e.message}")
        }
        val pack = parse(Node(root, "$"))
        val problems = ContentValidator.validate(pack)
        if (problems.isNotEmpty()) {
            throw ContentException("Content pack failed validation:\n" + problems.joinToString("\n") { " - $it" })
        }
        return pack
    }

    private fun parse(r: Node) = ContentPack(
        contentVersion = r["contentVersion"].string(),
        ticksPerSecond = r["ticksPerSecond"].int(min = 1),
        player = r["player"].let {
            PlayerDef(
                startCoins = it["startCoins"].long(min = 0),
                startCarryCapacityUnits = it["startCarryCapacityUnits"].int(min = 1),
                moveSpeedMmPerTick = it["moveSpeedMmPerTick"].int(min = 1),
                transferIntervalTicks = it["transferIntervalTicks"].int(min = 1),
                startCatchSpeedPermille = it["startCatchSpeedPermille"].int(min = 1),
                startFishRegenPermille = it["startFishRegenPermille"].int(min = 1),
                timingWindowStartPermille = it["timingWindowStartPermille"].int(min = 0, max = 1000),
                timingWindowEndPermille = it["timingWindowEndPermille"].int(min = 0, max = 1000),
                timingPerfectStartPermille = it["timingPerfectStartPermille"].int(min = 0, max = 1000),
                timingPerfectEndPermille = it["timingPerfectEndPermille"].int(min = 0, max = 1000),
                timingGoodBonusPermille = it["timingGoodBonusPermille"].int(min = 1),
                timingPerfectBonusPermille = it["timingPerfectBonusPermille"].int(min = 1),
            )
        },
        species = r["species"].list { s ->
            SpeciesDef(
                id = s["id"].string(), name = s["name"].string(),
                carryUnits = s["carryUnits"].int(min = 1), catchTicks = s["catchTicks"].int(min = 1),
                baseValue = s["baseValue"].long(min = 0), rarityWeight = s["rarityWeight"].int(min = 1),
                asset = s.optional("asset")?.string(),
                rareUpgrade = s.optional("rareUpgrade")?.let { ru ->
                    RareUpgradeDef(ru["to"].string(), ru["chancePermille"].int(min = 1, max = 1000))
                },
                spoilTier = s.optional("spoilTier")?.int(min = 1, max = 3) ?: 2,
            )
        },
        products = r["products"].list { p ->
            ProductDef(
                id = p["id"].string(), name = p["name"].string(),
                carryUnits = p["carryUnits"].int(min = 1), unitPrice = p["unitPrice"].long(min = 0),
                asset = p.optional("asset")?.string(),
                spoilTier = p.optional("spoilTier")?.int(min = 1, max = 3) ?: 2,
            )
        },
        bait = r["bait"].list { b ->
            BaitDef(
                id = b["id"].string(),
                name = b["name"].string(),
                description = b["description"].string(),
                carryUnits = b["carryUnits"].int(min = 1),
                packQuantity = b["packQuantity"].int(min = 1),
                cost = b["cost"].long(min = 0),
                rareSpeciesWeightMultPermille = b["rareSpeciesWeightMultPermille"].int(min = 1),
                rareChanceBonusPermille = b["rareChanceBonusPermille"].int(min = 0, max = 1000),
                requires = b["requires"].list { it.string() },
            )
        },
        recipes = r["recipes"].list { rc ->
            RecipeDef(
                id = rc["id"].string(), machine = rc["machine"].string(),
                inputs = rc["inputs"].list(::itemQuantity), outputs = rc["outputs"].list(::itemQuantity),
                durationTicks = rc["durationTicks"].int(min = 1),
            )
        },
        machines = r["machines"].list { m ->
            MachineDef(
                id = m["id"].string(), name = m["name"].string(),
                recipes = m["recipes"].list { it.string() },
                inputCapacityUnits = m["inputCapacityUnits"].int(min = 1),
                outputCapacityUnits = m["outputCapacityUnits"].int(min = 1),
            )
        },
        upgrades = r["upgrades"].list { u ->
            UpgradeDef(
                id = u["id"].string(), name = u["name"].string(), description = u["description"].string(),
                cost = u["cost"].long(min = 0), requires = u["requires"].list { it.string() },
                effect = upgradeEffect(u["effect"]),
            )
        },
        quests = r["quests"].list { q ->
            QuestDef(
                id = q["id"].string(),
                name = q["name"].string(),
                description = q["description"].string(),
                requires = q["requires"].list { it.string() },
                goal = statGoal(q["goal"]),
                reward = q["reward"].let { rw ->
                    QuestReward(
                        coins = rw["coins"].long(min = 0),
                        unlockUpgrades = rw["unlockUpgrades"].list { it.string() },
                    )
                },
            )
        },
        workers = r["workers"].list { w ->
            WorkerDef(
                id = w["id"].string(),
                name = w["name"].string(),
                role = WorkerRoleKind.fromWire(w["role"].string())
                    ?: w.fail("unknown worker role '${w["role"].string()}'"),
                hireCost = w["hireCost"].long(min = 0),
                maxHired = w["maxHired"].int(min = 1),
                carryCapacityUnits = w["carryCapacityUnits"].int(min = 1),
                moveSpeedMmPerTick = w["moveSpeedMmPerTick"].int(min = 1),
                catchSpeedPermille = w["catchSpeedPermille"].int(min = 1),
                transferIntervalTicks = w["transferIntervalTicks"].int(min = 1),
                leaseTicks = w["leaseTicks"].int(min = 1),
                requires = w["requires"].list { it.string() },
            )
        },
        routing = r["routing"].let { rt ->
            RoutingDef(
                urgencyWeight = rt["urgencyWeight"].int(min = 0),
                distanceWeight = rt["distanceWeight"].int(min = 0),
                demandWeight = rt["demandWeight"].int(min = 0),
                supervisorDemandBoostPermille = rt["supervisorDemandBoostPermille"].int(min = 1),
            )
        },
        offline = r["offline"].let { o ->
            OfflineDef(
                capHours = o["capHours"].int(min = 1),
                summaryMinSeconds = o["summaryMinSeconds"].int(min = 0),
            )
        },
        economy = r["economy"].let { e ->
            EconomyDef(
                requires = e["requires"].list { it.string() },
                maintenancePeriodTicks = e["maintenancePeriodTicks"].int(min = 1),
                maintenanceCoinsPerStation = e["maintenanceCoinsPerStation"].int(min = 0),
                counterSpoilPeriodTicks = e["counterSpoilPeriodTicks"].int(min = 1),
                counterSpoilUnits = e["counterSpoilUnits"].int(min = 0),
                bagFishSpoilPeriodTicks = e["bagFishSpoilPeriodTicks"].int(min = 1),
                bagFishSpoilUnits = e["bagFishSpoilUnits"].int(min = 0),
                scarcityPriceCurvePermille = e["scarcityPriceCurvePermille"].list { it.int(min = 1) },
            )
        },
        ecology = r["ecology"].let { e ->
            EcologyDef(
                dayLengthTicks = e["dayLengthTicks"].int(min = 1),
                parts = e["parts"].list { p ->
                    DayPartDef(
                        id = p["id"].string(),
                        name = p["name"].string(),
                        endPermille = p["endPermille"].int(min = 1, max = 1000),
                        regenMultPermille = p["regenMultPermille"].int(min = 1),
                        catchSpeedMultPermille = p["catchSpeedMultPermille"].int(min = 1),
                    )
                },
            )
        },
        trophies = r["trophies"].let { t ->
            TrophiesDef(
                sizeMinPermille = t["sizeMinPermille"].int(min = 1),
                sizeMaxPermille = t["sizeMaxPermille"].int(min = 1),
                sets = t["sets"].list { s ->
                    TrophySetDef(
                        id = s["id"].string(),
                        name = s["name"].string(),
                        description = s["description"].string(),
                        species = s["species"].list { it.string() },
                        completeStat = s["completeStat"].string(),
                    )
                },
            )
        },
        prestige = r["prestige"].let { p ->
            PrestigeDef(
                requires = p["requires"].list { it.string() },
                ratingThresholds = p["ratingThresholds"].list { it.long(min = 0) },
                ratingPriceMultPermille = p["ratingPriceMultPermille"].list { it.int(min = 1) },
                milestones = p["milestones"].list { m ->
                    PrestigeMilestoneDef(
                        id = m["id"].string(),
                        name = m["name"].string(),
                        description = m["description"].string(),
                        requires = m["requires"].list { it.string() },
                        goal = statGoal(m["goal"]),
                        reward = m["reward"].let { rw ->
                            PrestigeRewardDef(
                                coins = rw["coins"].long(min = 0),
                                catchSpeedPermille = rw["catchSpeedPermille"].int(min = 0),
                                priceBonusPermille = rw["priceBonusPermille"].int(min = 0),
                                cosmetic = rw.optional("cosmetic")?.string(),
                            )
                        },
                    )
                },
            )
        },
        reputation = r["reputation"].let { rep ->
            ReputationDef(
                minSample = rep["minSample"].int(min = 1),
                neutralScorePermille = rep["neutralScorePermille"].int(min = 1),
                scoreBandThresholdsPermille = rep["scoreBandThresholdsPermille"].list { it.int(min = 0, max = 1000) },
                kindSpawnMultPermille = rep["kindSpawnMultPermille"].list { it.stringIntMap() },
                unmetPreferencePenaltyPermille = rep["unmetPreferencePenaltyPermille"].int(min = 0),
                coachingLostRatioPermille = rep["coachingLostRatioPermille"].int(min = 0, max = 1000),
                coachingPraiseScorePermille = rep["coachingPraiseScorePermille"].int(min = 1),
            )
        },
        contracts = r["contracts"].let { c ->
            ContractsDef(
                boardSlots = c["boardSlots"].int(min = 1),
                maxActive = c["maxActive"].int(min = 1),
                refreshPeriodTicks = c["refreshPeriodTicks"].int(min = 1),
                requires = c["requires"].list { it.string() },
                templates = c["templates"].list { t ->
                    val kindText = t.optional("kind")?.string() ?: "standard"
                    val kind = ContractKind.fromWire(kindText)
                        ?: t.fail("unknown contract kind '$kindText'")
                    ContractTemplateDef(
                        id = t["id"].string(),
                        name = t["name"].string(),
                        description = t["description"].string(),
                        item = t["item"].string(),
                        quantity = t["quantity"].int(min = 1),
                        durationTicks = t["durationTicks"].int(min = 1),
                        payout = t["payout"].long(min = 0),
                        penalty = t["penalty"].long(min = 0),
                        weight = t["weight"].int(min = 1),
                        kind = kind,
                        payoutEscalatePermille = t.optional("payoutEscalatePermille")?.int(min = 1) ?: 1000,
                        penaltyEscalatePermille = t.optional("penaltyEscalatePermille")?.int(min = 1) ?: 1000,
                        maxStreak = t.optional("maxStreak")?.int(min = 1) ?: 1,
                        failCooldownTicks = t.optional("failCooldownTicks")?.int(min = 1) ?: 1,
                    )
                },
            )
        },
        customers = r["customers"].list { c ->
            val kindText = c["kind"].string()
            val kind = CustomerKind.fromWire(kindText) ?: c["kind"].fail("unknown customer kind '$kindText'")
            CustomerDef(
                id = c["id"].string(), name = c["name"].string(), kind = kind,
                basketMin = c["basketMin"].int(min = 1), basketMax = c["basketMax"].int(min = 1),
                patienceTicks = c["patienceTicks"].int(min = 1), spawnWeight = c["spawnWeight"].int(min = 1),
                priceMultPermille = c["priceMultPermille"].int(min = 1),
                preferredProducts = c["preferredProducts"].list { pw ->
                    ProductWeight(pw["item"].string(), pw["weight"].int(min = 1))
                },
                unmetPriceMultPermille = c["unmetPriceMultPermille"].int(min = 1, max = 1000),
                unmetPatienceDrainPermille = c["unmetPatienceDrainPermille"].int(min = 1),
                dayPartSpawnMultPermille = c.optional("dayPartSpawnMultPermille")?.stringIntMap() ?: emptyMap(),
            )
        },
        tutorial = r["tutorial"].list { t ->
            val a = t["advanceOn"]
            val trigger = when (val kind = a["kind"].string()) {
                "enter_zone" -> TutorialTrigger.EnterZone(a["zone"].string())
                "stat" -> TutorialTrigger.Stat(statGoal(a))
                else -> a.fail("unknown tutorial trigger kind '$kind'")
            }
            TutorialStepDef(t["id"].string(), t["text"].string(), trigger)
        },
        harbors = r["harbors"].list(::harbor),
    )

    private fun itemQuantity(n: Node) = ItemQuantity(n["item"].string(), n["quantity"].int(min = 1))

    private fun statGoal(n: Node) = StatGoal(n["stat"].string(), n["atLeast"].long(min = 0))

    private fun upgradeEffect(n: Node): UpgradeEffect = when (val kind = n["kind"].string()) {
        "carry_capacity" -> UpgradeEffect.CarryCapacity(n["capacityUnits"].int(min = 1))
        "recipe_duration" -> UpgradeEffect.RecipeDuration(
            n["machine"].string(), n["recipe"].string(), n["durationTicks"].int(min = 1),
        )
        "catch_speed" -> UpgradeEffect.CatchSpeed(n["speedPermille"].int(min = 1))
        "grant_bait" -> UpgradeEffect.GrantBait(
            bait = n["bait"].string(),
            quantity = n["quantity"].int(min = 1),
        )
        "timing_window" -> UpgradeEffect.TimingWindow(
            windowStartPermille = n["windowStartPermille"].int(min = 0, max = 1000),
            windowEndPermille = n["windowEndPermille"].int(min = 0, max = 1000),
            perfectStartPermille = n["perfectStartPermille"].int(min = 0, max = 1000),
            perfectEndPermille = n["perfectEndPermille"].int(min = 0, max = 1000),
        )
        "fish_regen" -> UpgradeEffect.FishRegen(n["speedPermille"].int(min = 1))
        "unlock_fishing_spot" -> UpgradeEffect.UnlockFishingSpot(n["zone"].string())
        "unlock_machine" -> UpgradeEffect.UnlockMachine(n["machine"].string())
        "worker_move_speed" -> UpgradeEffect.WorkerMoveSpeed(n["speedPermille"].int(min = 1))
        "worker_carry" -> UpgradeEffect.WorkerCarry(n["capacityUnits"].int(min = 1))
        "worker_catch_speed" -> UpgradeEffect.WorkerCatchSpeed(n["speedPermille"].int(min = 1))
        "worker_wage" -> UpgradeEffect.WorkerWage(n["coinsPerWorkerPerHour"].int(min = 1))
        "maintenance_discount" -> UpgradeEffect.MaintenanceDiscount(n["coinsOffPerStation"].int(min = 1))
        "bag_spoil_resist" -> UpgradeEffect.BagSpoilResist(n["periodMultPermille"].int(min = 1))
        "counter_spoil_resist" -> UpgradeEffect.CounterSpoilResist(n["periodMultPermille"].int(min = 1))
        else -> n.fail("unknown upgrade effect kind '$kind'")
    }

    private fun rect(n: Node) = RectMm(
        n["id"].string(), n["minX"].int(), n["minZ"].int(), n["maxX"].int(), n["maxZ"].int(),
    ).also { if (it.maxX <= it.minX || it.maxZ <= it.minZ) n.fail("rectangle has no area") }

    private fun harbor(h: Node) = HarborDef(
        id = h["id"].string(), name = h["name"].string(),
        requires = h.optional("requires")?.list { it.string() } ?: emptyList(),
        playerSpawn = point(h["playerSpawn"]),
        walkable = h["walkable"].list(::rect),
        obstacles = h["obstacles"].list(::rect),
        zones = h["zones"].list { z ->
            val kindText = z["kind"].string()
            val kind = ZoneKind.fromWire(kindText) ?: z["kind"].fail("unknown zone kind '$kindText'")
            ZoneDef(z["id"].string(), kind, rect(z))
        },
        fishingSpots = h["fishingSpots"].list { f ->
            FishingSpotDef(
                zone = f["zone"].string(),
                species = f["species"].list { it.string() },
                stockMax = f["stockMax"].int(min = 1),
                regenTicks = f["regenTicks"].int(min = 1),
                regenCurvePermille = f["regenCurvePermille"].list { it.int(min = 1) },
                dayPartRegenMultPermille = f.optional("dayPartRegenMultPermille")?.stringIntMap() ?: emptyMap(),
                requiresUpgrade = f.optional("requiresUpgrade")?.string(),
            )
        },
        stations = h["stations"].list { s ->
            StationDef(
                s["id"].string(),
                s["machine"].string(),
                s["inputZone"].string(),
                s["outputZone"].string(),
                requiresUpgrade = s.optional("requiresUpgrade")?.string(),
            )
        },
        counters = h["counters"].list { c ->
            CounterDef(
                c["id"].string(), c["products"].list { it.string() }, c["capacityUnits"].int(min = 1), c["zone"].string(),
                c["checkoutTicks"].int(min = 1), c["maxQueue"].int(min = 1),
                point(c["queueAnchor"]), point(c["queueStep"]),
            )
        },
        customerSpawnTicks = h["customerSpawnTicks"].int(min = 1),
        customerEntry = point(h["customerEntry"]),
        customerWalkMmPerTick = h["customerWalkMmPerTick"].int(min = 1),
        customerPathWaypoints = h["customerPathWaypoints"].list { point(it) },
        rushes = h["rushes"].list { r ->
            RushWindowDef(
                id = r["id"].string(),
                name = r["name"].string(),
                periodTicks = r["periodTicks"].int(min = 1),
                startTick = r["startTick"].int(min = 0),
                durationTicks = r["durationTicks"].int(min = 1),
                spawnSpeedPermille = r["spawnSpeedPermille"].int(min = 1),
                queueBonus = r["queueBonus"].int(min = 0, max = 16),
                priceMultPermille = r.optional("priceMultPermille")?.int(min = 1) ?: 1000,
            )
        },
    )

    private fun point(n: Node) = PointMm(n["x"].int(), n["z"].int())
}

/** A JSON value plus the path used to reach it, for precise error messages. */
internal class Node(val el: JsonElement, val path: String) {
    fun fail(msg: String): Nothing = throw ContentException("$path: $msg")

    private fun obj(): JsonObject = el as? JsonObject ?: fail("expected an object")

    operator fun get(key: String): Node = Node(obj()[key] ?: fail("missing required field '$key'"), "$path.$key")

    fun optional(key: String): Node? = obj()[key]?.takeIf { it !is JsonNull }?.let { Node(it, "$path.$key") }

    fun string(): String {
        val p = el as? JsonPrimitive
        if (p == null || !p.isString) fail("expected a string")
        if (p.content.isBlank()) fail("must not be blank")
        return p.content
    }

    fun long(min: Long = Long.MIN_VALUE): Long {
        val p = el as? JsonPrimitive
        val v = if (p != null && !p.isString) p.longOrNull else null
        v ?: fail("expected an integer")
        if (v < min) fail("must be >= $min (was $v)")
        return v
    }

    fun int(min: Int = Int.MIN_VALUE, max: Int = Int.MAX_VALUE): Int {
        val p = el as? JsonPrimitive
        val v = if (p != null && !p.isString) p.intOrNull else null
        v ?: fail("expected a 32-bit integer")
        if (v < min) fail("must be >= $min (was $v)")
        if (v > max) fail("must be <= $max (was $v)")
        return v
    }

    fun bool(): Boolean {
        val p = el as? JsonPrimitive
        if (p == null || p.isString) fail("expected a boolean")
        return when (p.content) {
            "true" -> true
            "false" -> false
            else -> fail("expected a boolean")
        }
    }

    fun <T> list(f: (Node) -> T): List<T> {
        val a = el as? JsonArray ?: fail("expected an array")
        return a.mapIndexed { i, e -> f(Node(e, "$path[$i]")) }
    }

    fun stringIntMap(): Map<String, Int> {
        val o = obj()
        return o.entries.associate { (k, v) ->
            k to Node(v, "$path.$k").int(min = 1)
        }
    }
}
