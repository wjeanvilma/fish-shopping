package com.willio.jeanvilma.fishshopping.core.content

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/**
 * Data-driven balance knob dump for designers / CI (Phase 27).
 * Mirrors live [ContentPack] fields — changing content-pack.json is the only
 * way to retune; this export never invents new knobs in code.
 */
object BalanceExport {
    const val SCHEMA = "fish.balance.v1"

    fun build(content: ContentPack): JsonObject = buildJsonObject {
        put("schema", SCHEMA)
        put("contentVersion", content.contentVersion)
        put("ticksPerSecond", content.ticksPerSecond)
        put(
            "player",
            buildJsonObject {
                val p = content.player
                put("startCoins", p.startCoins)
                put("startCarryCapacityUnits", p.startCarryCapacityUnits)
                put("moveSpeedMmPerTick", p.moveSpeedMmPerTick)
                put("transferIntervalTicks", p.transferIntervalTicks)
                put("startCatchSpeedPermille", p.startCatchSpeedPermille)
                put("startFishRegenPermille", p.startFishRegenPermille)
                put("timingWindowStartPermille", p.timingWindowStartPermille)
                put("timingWindowEndPermille", p.timingWindowEndPermille)
            },
        )
        put(
            "offline",
            buildJsonObject {
                put("capHours", content.offline.capHours)
                put("summaryMinSeconds", content.offline.summaryMinSeconds)
            },
        )
        put(
            "economy",
            buildJsonObject {
                val e = content.economy
                put("requires", JsonArray(e.requires.map { JsonPrimitive(it) }))
                put("maintenancePeriodTicks", e.maintenancePeriodTicks)
                put("maintenanceCoinsPerStation", e.maintenanceCoinsPerStation)
                put("counterSpoilPeriodTicks", e.counterSpoilPeriodTicks)
                put("counterSpoilUnits", e.counterSpoilUnits)
                put("bagFishSpoilPeriodTicks", e.bagFishSpoilPeriodTicks)
                put("bagFishSpoilUnits", e.bagFishSpoilUnits)
            },
        )
        put(
            "routing",
            buildJsonObject {
                val r = content.routing
                put("urgencyWeight", r.urgencyWeight)
                put("distanceWeight", r.distanceWeight)
                put("demandWeight", r.demandWeight)
                put("supervisorDemandBoostPermille", r.supervisorDemandBoostPermille)
            },
        )
        put(
            "species",
            buildJsonArray {
                for (s in content.species) {
                    add(
                        buildJsonObject {
                            put("id", s.id)
                            put("catchTicks", s.catchTicks)
                            put("baseValue", s.baseValue)
                            put("rarityWeight", s.rarityWeight)
                            put("carryUnits", s.carryUnits)
                            val rare = s.rareUpgrade
                            if (rare != null) {
                                put(
                                    "rareUpgrade",
                                    buildJsonObject {
                                        put("to", rare.to)
                                        put("chancePermille", rare.chancePermille)
                                    },
                                )
                            } else {
                                put("rareUpgrade", JsonNull)
                            }
                        },
                    )
                }
            },
        )
        put(
            "products",
            buildJsonArray {
                for (p in content.products) {
                    add(
                        buildJsonObject {
                            put("id", p.id)
                            put("unitPrice", p.unitPrice)
                            put("carryUnits", p.carryUnits)
                        },
                    )
                }
            },
        )
        put(
            "recipes",
            buildJsonArray {
                for (r in content.recipes) {
                    add(
                        buildJsonObject {
                            put("id", r.id)
                            put("machine", r.machine)
                            put("durationTicks", r.durationTicks)
                            put(
                                "inputs",
                                buildJsonArray {
                                    r.inputs.forEach { iq ->
                                        add(buildJsonObject {
                                            put("item", iq.item); put("quantity", iq.quantity)
                                        })
                                    }
                                },
                            )
                            put(
                                "outputs",
                                buildJsonArray {
                                    r.outputs.forEach { iq ->
                                        add(buildJsonObject {
                                            put("item", iq.item); put("quantity", iq.quantity)
                                        })
                                    }
                                },
                            )
                        },
                    )
                }
            },
        )
        put(
            "customers",
            buildJsonArray {
                for (c in content.customers) {
                    add(
                        buildJsonObject {
                            put("id", c.id)
                            put("kind", c.kind.wire)
                            put("basketMin", c.basketMin)
                            put("basketMax", c.basketMax)
                            put("patienceTicks", c.patienceTicks)
                            put("spawnWeight", c.spawnWeight)
                            put("priceMultPermille", c.priceMultPermille)
                            put("unmetPriceMultPermille", c.unmetPriceMultPermille)
                            put("unmetPatienceDrainPermille", c.unmetPatienceDrainPermille)
                        },
                    )
                }
            },
        )
        put(
            "harborRushes",
            buildJsonArray {
                for (h in content.harbors) {
                    for (r in h.rushes) {
                        add(
                            buildJsonObject {
                                put("harborId", h.id)
                                put("id", r.id)
                                put("periodTicks", r.periodTicks)
                                put("startTick", r.startTick)
                                put("durationTicks", r.durationTicks)
                                put("spawnSpeedPermille", r.spawnSpeedPermille)
                                put("queueBonus", r.queueBonus)
                            },
                        )
                    }
                }
            },
        )
        put(
            "harbors",
            buildJsonArray {
                for (h in content.harbors) {
                    add(
                        buildJsonObject {
                            put("id", h.id)
                            put("customerSpawnTicks", h.customerSpawnTicks)
                            put("customerWalkMmPerTick", h.customerWalkMmPerTick)
                            put(
                                "fishingSpots",
                                buildJsonArray {
                                    for (s in h.fishingSpots) {
                                        add(
                                            buildJsonObject {
                                                put("zone", s.zone)
                                                put("stockMax", s.stockMax)
                                                put("regenTicks", s.regenTicks)
                                                put(
                                                    "regenCurvePermille",
                                                    JsonArray(s.regenCurvePermille.map { JsonPrimitive(it) }),
                                                )
                                            },
                                        )
                                    }
                                },
                            )
                            put(
                                "counters",
                                buildJsonArray {
                                    for (c in h.counters) {
                                        add(
                                            buildJsonObject {
                                                put("id", c.id)
                                                put("capacityUnits", c.capacityUnits)
                                                put("checkoutTicks", c.checkoutTicks)
                                                put("maxQueue", c.maxQueue)
                                            },
                                        )
                                    }
                                },
                            )
                        },
                    )
                }
            },
        )
        put(
            "workers",
            buildJsonArray {
                for (w in content.workers) {
                    add(
                        buildJsonObject {
                            put("id", w.id)
                            put("role", w.role.wire)
                            put("hireCost", w.hireCost)
                            put("maxHired", w.maxHired)
                            put("carryCapacityUnits", w.carryCapacityUnits)
                            put("moveSpeedMmPerTick", w.moveSpeedMmPerTick)
                            put("catchSpeedPermille", w.catchSpeedPermille)
                            put("transferIntervalTicks", w.transferIntervalTicks)
                            put("leaseTicks", w.leaseTicks)
                        },
                    )
                }
            },
        )
        put(
            "upgrades",
            buildJsonArray {
                for (u in content.upgrades) {
                    add(
                        buildJsonObject {
                            put("id", u.id)
                            put("cost", u.cost)
                            put("effect", effectJson(u.effect))
                        },
                    )
                }
            },
        )
        put(
            "contracts",
            buildJsonObject {
                val c = content.contracts
                put("boardSlots", c.boardSlots)
                put("maxActive", c.maxActive)
                put("refreshPeriodTicks", c.refreshPeriodTicks)
                put(
                    "templates",
                    buildJsonArray {
                        for (t in c.templates) {
                            add(
                                buildJsonObject {
                                    put("id", t.id)
                                    put("item", t.item)
                                    put("quantity", t.quantity)
                                    put("durationTicks", t.durationTicks)
                                    put("payout", t.payout)
                                    put("penalty", t.penalty)
                                },
                            )
                        }
                    },
                )
            },
        )
        put(
            "prestige",
            buildJsonObject {
                val p = content.prestige
                put("ratingThresholds", JsonArray(p.ratingThresholds.map { JsonPrimitive(it) }))
                put(
                    "milestones",
                    buildJsonArray {
                        for (m in p.milestones) {
                            add(
                                buildJsonObject {
                                    put("id", m.id)
                                    put("goalStat", m.goal.stat)
                                    put("goalAtLeast", m.goal.atLeast)
                                    put("rewardCoins", m.reward.coins)
                                    put("rewardCatchSpeedPermille", m.reward.catchSpeedPermille)
                                    put("rewardPriceBonusPermille", m.reward.priceBonusPermille)
                                },
                            )
                        }
                    },
                )
            },
        )
    }

    fun encode(content: ContentPack): String = build(content).toString()

    private fun effectJson(e: UpgradeEffect): JsonObject = when (e) {
        is UpgradeEffect.CarryCapacity -> buildJsonObject {
            put("kind", "carry_capacity"); put("capacityUnits", e.capacityUnits)
        }
        is UpgradeEffect.RecipeDuration -> buildJsonObject {
            put("kind", "recipe_duration"); put("machine", e.machine)
            put("recipe", e.recipe); put("durationTicks", e.durationTicks)
        }
        is UpgradeEffect.CatchSpeed -> buildJsonObject {
            put("kind", "catch_speed"); put("speedPermille", e.speedPermille)
        }
        is UpgradeEffect.FishRegen -> buildJsonObject {
            put("kind", "fish_regen"); put("speedPermille", e.speedPermille)
        }
        is UpgradeEffect.UnlockFishingSpot -> buildJsonObject {
            put("kind", "unlock_fishing_spot"); put("zone", e.zone)
        }
        is UpgradeEffect.WorkerMoveSpeed -> buildJsonObject {
            put("kind", "worker_move_speed"); put("speedPermille", e.speedPermille)
        }
        is UpgradeEffect.WorkerCarry -> buildJsonObject {
            put("kind", "worker_carry"); put("capacityUnits", e.capacityUnits)
        }
        is UpgradeEffect.WorkerCatchSpeed -> buildJsonObject {
            put("kind", "worker_catch_speed"); put("speedPermille", e.speedPermille)
        }
        is UpgradeEffect.WorkerWage -> buildJsonObject {
            put("kind", "worker_wage"); put("coinsPerWorkerPerHour", e.coinsPerWorkerPerHour)
        }
        is UpgradeEffect.MaintenanceDiscount -> buildJsonObject {
            put("kind", "maintenance_discount"); put("coinsOffPerStation", e.coinsOffPerStation)
        }
        is UpgradeEffect.BagSpoilResist -> buildJsonObject {
            put("kind", "bag_spoil_resist"); put("periodMultPermille", e.periodMultPermille)
        }
    }
}
