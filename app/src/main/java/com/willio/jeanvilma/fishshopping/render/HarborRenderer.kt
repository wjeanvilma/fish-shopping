package com.willio.jeanvilma.fishshopping.render

import android.content.Context
import android.view.Surface
import android.view.SurfaceView
import com.google.android.filament.Camera
import com.google.android.filament.Engine
import com.google.android.filament.EntityManager
import com.google.android.filament.IndirectLight
import com.google.android.filament.LightManager
import com.google.android.filament.Renderer
import com.google.android.filament.Scene
import com.google.android.filament.Skybox
import com.google.android.filament.SwapChain
import com.google.android.filament.View
import com.google.android.filament.Viewport
import com.google.android.filament.android.DisplayHelper
import com.google.android.filament.android.UiHelper
import com.google.android.filament.gltfio.AssetLoader
import com.google.android.filament.gltfio.FilamentAsset
import com.google.android.filament.gltfio.ResourceLoader
import com.google.android.filament.gltfio.UbershaderProvider
import com.google.android.filament.utils.Utils
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.game.CameraRig
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import java.nio.ByteBuffer
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.sin

/**
 * Owns the Filament engine and the harbor scene. Filament supplies rendering only;
 * all game rules live in game-core. This class reads [SimView] snapshots and writes
 * transforms; it never changes game state.
 *
 * Must be created, used and destroyed on the main thread.
 *
 * Item stacks, character locomotion clips, flying transfers, and water tint/bob are driven
 * from SimView / [FlyingTransferCue]s by the presenters in Presenters.kt, mirrored by
 * the web renderer. Phase 26 device-matrix budgets (Android 30 FPS) drive soft
 * auto-downgrade + a 2-harbor LRU so travel does not thrash Filament assets. Phase 31
 * swaps harbor GLBs without recreating Filament and distance-fades Zone_* pads.
 * Phase 15 stylized characters use authored mesh extents (body/rod scale 1) plus
 * PlayerRod / Worker_* sockets. Phase 16 adds Footprint_* operate pulses and
 * VfxBurst_* pay/celebrate/machine_done cues.
 */
class HarborRenderer(private val context: Context) {

    companion object {
        init {
            Utils.init() // loads filament, gltfio and utils native libraries
        }

        private val FLY_SLOT = Regex("""^Fly_(\d+)_(fish|portion)$""")
        private val BURST_SLOT = Regex("""^VfxBurst_(\d+)$""")
        // Phase 15 character modules bake extents; presenters only tweak T/R (scale = 1).
        private const val BODY_SX = 1f
        private const val BODY_SY = 1f
        private const val BODY_SZ = 1f
        private const val PLAYER_NOSE_SX = 0.18f
        private const val PLAYER_NOSE_SY = 0.12f
        private const val PLAYER_NOSE_SZ = 0.12f
        private const val WATER_SX = 80f
        private const val WATER_SY = 0.1f
        private const val WATER_SZ = 80f
        private const val WATER_REST_X = -20.0
        private const val WATER_REST_Y = -0.65
        private const val WATER_REST_Z = 0.0
    }

    private val engine: Engine = Engine.create()
    private val renderer: Renderer = engine.createRenderer()
    private val scene: Scene = engine.createScene()
    private val cameraEntity = EntityManager.get().create()
    private val camera: Camera = engine.createCamera(cameraEntity)
    private val view: View = engine.createView()
    private val sun = EntityManager.get().create()
    private val skybox: Skybox
    private val indirectLight: IndirectLight

    private val materialProvider = UbershaderProvider(engine)
    private val assetLoader = AssetLoader(engine, materialProvider, EntityManager.get())
    private val resourceLoader = ResourceLoader(engine)
    private var asset: FilamentAsset? = null
    private var playerEntity = 0
    private var playerBodyEntity = 0
    private var playerNoseEntity = 0
    private var playerRodEntity = 0
    private var customerRoots = IntArray(0)
    private var customerBodies = IntArray(0)
    private var workerRoots = IntArray(0)
    private var workerBodies = IntArray(0)
    private var crowd = CustomerCrowd(0)
    private var workerCrowd = WorkerCrowd(0)
    private var playerSmooth = PlayerSmoother()
    /** Renderable entity of every pooled item slot, by node name. */
    private val stackSlots = HashMap<String, Int>()
    private var flyFish = IntArray(0)
    private var flyPortion = IntArray(0)
    private var burstEntities = IntArray(0)
    private var flying = FlyingTransfers(FLYING_TRANSFER_POOL)
    private var worldBursts = WorldBursts(VFX_BURST_POOL)
    private val pendingTransfers = ConcurrentLinkedQueue<FlyingTransferCue>()
    private val pendingBursts = ConcurrentLinkedQueue<WorldBurstCue>()
    private val footprints = HashMap<String, Int>()
    private var waterEntity = 0
    /** Zone pads for Phase 31 distance occlusion (entity + ground x/z meters). */
    private var fadeZones = emptyList<FadeZone>()
    private var loadedAssetPath: String? = null
    /** Phase 26: warm harbors for travel (access-ordered LRU). */
    private val harborCache = LinkedHashMap<String, HarborCacheEntry>(4, 0.75f, true)

    private val uiHelper = UiHelper(UiHelper.ContextErrorPolicy.DONT_CHECK)
    private var displayHelper: DisplayHelper? = null
    private var swapChain: SwapChain? = null
    private var surfaceView: SurfaceView? = null

    private var lastFrameNanos = 0L
    private var elapsed = 0.0
    private var requestedQuality = QualityPreset.MEDIUM
    private var sessionQuality = QualityPreset.MEDIUM
    private var appliedQuality: QualityPreset? = null
    private val frameTiming = FrameTiming()

    private data class FadeZone(val entity: Int, val x: Double, val z: Double)

    /** Snapshot of a loaded harbor so travel can rebind without re-parsing the GLB. */
    private data class HarborCacheEntry(
        val assetPath: String,
        val asset: FilamentAsset,
        val playerEntity: Int,
        val playerBodyEntity: Int,
        val playerNoseEntity: Int,
        val playerRodEntity: Int,
        val waterEntity: Int,
        val customerRoots: IntArray,
        val customerBodies: IntArray,
        val workerRoots: IntArray,
        val workerBodies: IntArray,
        val stackSlots: HashMap<String, Int>,
        val footprints: HashMap<String, Int>,
        val flyFish: IntArray,
        val flyPortion: IntArray,
        val burstEntities: IntArray,
        val fadeZones: List<FadeZone>,
    )

    init {
        view.scene = scene
        view.camera = camera
        camera.setExposure(16f, 1f / 125f, 100f)

        skybox = Skybox.Builder().color(0.62f, 0.83f, 0.92f, 1f).build(engine)
        scene.skybox = skybox
        // Flat ambient light (one SH band) so shaded sides are not black.
        indirectLight = IndirectLight.Builder()
            .irradiance(1, floatArrayOf(0.85f, 0.9f, 1.0f))
            .intensity(28_000f)
            .build(engine)
        scene.indirectLight = indirectLight

        LightManager.Builder(LightManager.Type.SUN)
            .color(1.0f, 0.97f, 0.9f)
            .intensity(95_000f)
            .direction(0.35f, -1.0f, 0.55f)
            .castShadows(true)
            .build(engine, sun)
        scene.addEntity(sun)
    }

    /** Queue sim-authoritative transfer arcs (drained on the next frame). */
    fun enqueueTransfers(cues: Collection<FlyingTransferCue>) {
        pendingTransfers.addAll(cues)
    }

    /** Queue Phase 16 world bursts (drained on the next frame). */
    fun enqueueBursts(cues: Collection<WorldBurstCue>) {
        pendingBursts.addAll(cues)
    }

    /**
     * Phase 26/31: load or swap the harbor GLB without recreating the Filament engine.
     * Keeps up to [FrameTiming.HARBOR_CACHE_LIMIT] warm assets so sustained travel
     * does not thrash allocate/destroy (leak / hitch source on mid-tier Android).
     */
    @Synchronized
    fun ensureHarbor(assetPath: String) {
        if (assetPath == loadedAssetPath && asset != null) return
        stashCurrentHarbor()
        val cached = harborCache.remove(assetPath)
        trimHarborCache()
        if (cached != null) {
            bindCachedHarbor(cached)
            return
        }
        loadScene(assetPath)
        loadedAssetPath = assetPath
    }

    /** Visible for tests — warm harbors currently retained. */
    fun harborCacheSize(): Int = harborCache.size

    private fun snapshotCurrentHarbor(path: String): HarborCacheEntry {
        val a = asset ?: error("no asset to snapshot")
        return HarborCacheEntry(
            assetPath = path,
            asset = a,
            playerEntity = playerEntity,
            playerBodyEntity = playerBodyEntity,
            playerNoseEntity = playerNoseEntity,
            playerRodEntity = playerRodEntity,
            waterEntity = waterEntity,
            customerRoots = customerRoots,
            customerBodies = customerBodies,
            workerRoots = workerRoots,
            workerBodies = workerBodies,
            stackSlots = HashMap(stackSlots),
            footprints = HashMap(footprints),
            flyFish = flyFish,
            flyPortion = flyPortion,
            burstEntities = burstEntities,
            fadeZones = fadeZones,
        )
    }

    private fun stashCurrentHarbor() {
        val path = loadedAssetPath ?: return
        val a = asset ?: return
        scene.removeEntities(a.entities)
        harborCache[path] = snapshotCurrentHarbor(path)
        clearBoundHarborFields(destroyAsset = false)
    }

    private fun bindCachedHarbor(entry: HarborCacheEntry) {
        scene.addEntities(entry.asset.entities)
        asset = entry.asset
        playerEntity = entry.playerEntity
        playerBodyEntity = entry.playerBodyEntity
        playerNoseEntity = entry.playerNoseEntity
        playerRodEntity = entry.playerRodEntity
        waterEntity = entry.waterEntity
        customerRoots = entry.customerRoots
        customerBodies = entry.customerBodies
        workerRoots = entry.workerRoots
        workerBodies = entry.workerBodies
        stackSlots.clear()
        stackSlots.putAll(entry.stackSlots)
        footprints.clear()
        footprints.putAll(entry.footprints)
        flyFish = entry.flyFish
        flyPortion = entry.flyPortion
        burstEntities = entry.burstEntities
        fadeZones = entry.fadeZones
        crowd = CustomerCrowd(customerRoots.size)
        crowd.setDrawCap(crowdDrawCapForQuality(FrameTiming.toPresenterQuality(sessionQuality), customerRoots.size))
        workerCrowd = WorkerCrowd(workerRoots.size)
        playerSmooth = PlayerSmoother()
        flying = FlyingTransfers(max(FLYING_TRANSFER_POOL, flyFish.size))
        flying.setBudget(
            minOf(flying.poolSize, flyingTransferPoolForQuality(FrameTiming.toPresenterQuality(sessionQuality))),
        )
        worldBursts = WorldBursts(max(VFX_BURST_POOL, burstEntities.size))
        worldBursts.setBudget(
            minOf(worldBursts.poolSize, worldBurstPoolForQuality(FrameTiming.toPresenterQuality(sessionQuality))),
        )
        pendingTransfers.clear()
        pendingBursts.clear()
        stackSlots.values.forEach { setVisible(it, false) }
        flyFish.forEach { setVisible(it, false) }
        flyPortion.forEach { setVisible(it, false) }
        burstEntities.forEach { setVisible(it, false) }
        customerBodies.forEach { setVisible(it, false) }
        workerRoots.forEach { setVisible(it, false) }
        loadedAssetPath = entry.assetPath
    }

    private fun trimHarborCache() {
        while (harborCache.size > FrameTiming.HARBOR_CACHE_LIMIT) {
            val eldest = harborCache.entries.firstOrNull() ?: break
            harborCache.remove(eldest.key)
            destroyCachedHarbor(eldest.value)
        }
    }

    private fun destroyCachedHarbor(entry: HarborCacheEntry) {
        assetLoader.destroyAsset(entry.asset)
    }

    private fun clearBoundHarborFields(destroyAsset: Boolean) {
        if (destroyAsset) {
            asset?.let {
                scene.removeEntities(it.entities)
                assetLoader.destroyAsset(it)
            }
        }
        asset = null
        playerEntity = 0
        playerBodyEntity = 0
        playerNoseEntity = 0
        playerRodEntity = 0
        waterEntity = 0
        customerRoots = IntArray(0)
        customerBodies = IntArray(0)
        workerRoots = IntArray(0)
        workerBodies = IntArray(0)
        crowd = CustomerCrowd(0)
        workerCrowd = WorkerCrowd(0)
        playerSmooth = PlayerSmoother()
        stackSlots.clear()
        footprints.clear()
        flyFish = IntArray(0)
        flyPortion = IntArray(0)
        burstEntities = IntArray(0)
        flying = FlyingTransfers(FLYING_TRANSFER_POOL)
        flying.setBudget(flyingTransferPoolForQuality(FrameTiming.toPresenterQuality(sessionQuality)))
        worldBursts = WorldBursts(VFX_BURST_POOL)
        worldBursts.setBudget(worldBurstPoolForQuality(FrameTiming.toPresenterQuality(sessionQuality)))
        fadeZones = emptyList()
        pendingTransfers.clear()
        pendingBursts.clear()
        loadedAssetPath = null
    }

    /** Destroy every warm harbor (used on renderer teardown). */
    private fun unloadHarbor() {
        for ((_, entry) in harborCache) {
            if (entry.asset !== asset) assetLoader.destroyAsset(entry.asset)
        }
        harborCache.clear()
        clearBoundHarborFields(destroyAsset = true)
    }

    private fun loadScene(assetPath: String) {
        val bytes = context.assets.open(assetPath).use { it.readBytes() }
        val buffer = ByteBuffer.allocateDirect(bytes.size).put(bytes).also { it.flip() }
        val loaded = assetLoader.createAsset(buffer) ?: error("Could not parse $assetPath")
        resourceLoader.loadResources(loaded)
        loaded.releaseSourceData()
        scene.addEntities(loaded.entities)
        asset = loaded

        playerEntity = loaded.getFirstEntityByName("Player")
        playerBodyEntity = loaded.getFirstEntityByName("PlayerBody")
        playerNoseEntity = loaded.getFirstEntityByName("PlayerNose")
        playerRodEntity = loaded.getFirstEntityByName("PlayerRod")
        waterEntity = loaded.getFirstEntityByName("Water")
        customerRoots = generateSequence(0) { it + 1 }
            .map { loaded.getFirstEntityByName("Customer_$it") }
            .takeWhile { it != 0 }
            .toList().toIntArray()
        customerBodies = IntArray(customerRoots.size) { loaded.getFirstEntityByName("CustomerBody_$it") }
        workerRoots = generateSequence(0) { it + 1 }
            .map { loaded.getFirstEntityByName("Worker_$it") }
            .takeWhile { it != 0 }
            .toList().toIntArray()
        workerBodies = IntArray(workerRoots.size) { loaded.getFirstEntityByName("WorkerBody_$it") }
        crowd = CustomerCrowd(customerRoots.size)
        crowd.setDrawCap(crowdDrawCapForQuality(FrameTiming.toPresenterQuality(sessionQuality), customerRoots.size))
        workerCrowd = WorkerCrowd(workerRoots.size)
        playerSmooth = PlayerSmoother()

        stackSlots.clear()
        footprints.clear()
        val fish = HashMap<Int, Int>()
        val portion = HashMap<Int, Int>()
        val bursts = HashMap<Int, Int>()
        val zones = ArrayList<FadeZone>()
        val tm = engine.transformManager
        for (e in loaded.entities) {
            val name = loaded.getName(e) ?: continue
            if (isStackSlotName(name)) stackSlots[name] = e
            if (name.startsWith("Footprint_")) footprints[name] = e
            if (isOcclusionFadeName(name)) {
                val ti = tm.getInstance(e)
                if (ti != 0) {
                    val m = FloatArray(16)
                    tm.getTransform(ti, m)
                    zones += FadeZone(e, m[12].toDouble(), m[14].toDouble())
                }
            }
            FLY_SLOT.matchEntire(name)?.let { m ->
                val idx = m.groupValues[1].toInt()
                when (m.groupValues[2]) {
                    "fish" -> fish[idx] = e
                    "portion" -> portion[idx] = e
                }
            }
            BURST_SLOT.matchEntire(name)?.let { m ->
                bursts[m.groupValues[1].toInt()] = e
            }
        }
        fadeZones = zones
        val flyCount = max(FLYING_TRANSFER_POOL, max(fish.keys.maxOrNull() ?: -1, portion.keys.maxOrNull() ?: -1) + 1)
        flyFish = IntArray(flyCount) { fish[it] ?: 0 }
        flyPortion = IntArray(flyCount) { portion[it] ?: 0 }
        flying = FlyingTransfers(flyCount)
        flying.setBudget(
            minOf(flyCount, flyingTransferPoolForQuality(FrameTiming.toPresenterQuality(sessionQuality))),
        )
        val burstCount = max(VFX_BURST_POOL, (bursts.keys.maxOrNull() ?: -1) + 1)
        burstEntities = IntArray(burstCount) { bursts[it] ?: 0 }
        worldBursts = WorldBursts(burstCount)
        worldBursts.setBudget(
            minOf(burstCount, worldBurstPoolForQuality(FrameTiming.toPresenterQuality(sessionQuality))),
        )
        stackSlots.values.forEach { setVisible(it, false) }
        flyFish.forEach { setVisible(it, false) }
        flyPortion.forEach { setVisible(it, false) }
        burstEntities.forEach { setVisible(it, false) }
        customerBodies.forEach { setVisible(it, false) }
        workerRoots.forEach { setVisible(it, false) }
    }

    fun attachTo(surface: SurfaceView) {
        surfaceView = surface
        displayHelper = DisplayHelper(surface.context)
        uiHelper.renderCallback = object : UiHelper.RendererCallback {
            override fun onNativeWindowChanged(nativeSurface: Surface) {
                swapChain?.let { engine.destroySwapChain(it) }
                swapChain = engine.createSwapChain(nativeSurface)
                surfaceView?.display?.let { displayHelper?.attach(renderer, it) }
            }

            override fun onDetachedFromSurface() {
                displayHelper?.detach()
                swapChain?.let {
                    engine.destroySwapChain(it)
                    engine.flushAndWait() // required before the surface is released
                }
                swapChain = null
            }

            override fun onResized(width: Int, height: Int) {
                view.viewport = Viewport(0, 0, width, height)
                camera.setProjection(CameraRig.FOV_DEGREES, width.toDouble() / height.coerceAtLeast(1), 0.1, 300.0, Camera.Fov.VERTICAL)
            }
        }
        uiHelper.attachTo(surface)
    }

    /** Called once per display frame from a Choreographer callback. */
    fun render(
        frameTimeNanos: Long,
        sim: SimView?,
        quality: QualityPreset = QualityPreset.MEDIUM,
        reducedMotion: Boolean = false,
    ) {
        if (quality != requestedQuality) {
            requestedQuality = quality
            sessionQuality = quality
            frameTiming.reset()
            appliedQuality = null
        }
        applyQuality(sessionQuality)
        if (sim != null) updateScene(frameTimeNanos, sim, reducedMotion)
        val chain = swapChain ?: return
        if (!uiHelper.isReadyToRender) return
        if (renderer.beginFrame(chain, frameTimeNanos)) {
            renderer.render(view)
            renderer.endFrame()
        }
    }

    /** Effective quality after session soft-downgrade (presentation-only). */
    fun effectiveQuality(): QualityPreset = sessionQuality

    /**
     * Phase 26 quality → Filament cost: shadows + MSAA + crowd/VFX budgets.
     * low: no shadows / no MSAA; medium: shadows; high: shadows + 4x MSAA.
     */
    private fun applyQuality(quality: QualityPreset) {
        if (quality == appliedQuality) return
        appliedQuality = quality
        val shadowsOn = quality != QualityPreset.LOW
        view.isShadowingEnabled = shadowsOn
        val lm = engine.lightManager
        val sunInst = lm.getInstance(sun)
        if (sunInst != 0) lm.setShadowCaster(sunInst, shadowsOn)
        val msaa = View.MultiSampleAntiAliasingOptions()
        msaa.enabled = quality == QualityPreset.HIGH
        msaa.sampleCount = 4
        view.multiSampleAntiAliasingOptions = msaa
        val pq = FrameTiming.toPresenterQuality(quality)
        crowd.setDrawCap(crowdDrawCapForQuality(pq, customerRoots.size))
        flying.setBudget(minOf(flying.poolSize, flyingTransferPoolForQuality(pq)))
        worldBursts.setBudget(minOf(worldBursts.poolSize, worldBurstPoolForQuality(pq)))
    }

    private fun updateScene(frameTimeNanos: Long, sim: SimView, reducedMotion: Boolean) {
        val dt = if (lastFrameNanos == 0L) 0.0 else ((frameTimeNanos - lastFrameNanos) / 1e9).coerceIn(0.0, 0.25)
        lastFrameNanos = frameTimeNanos
        elapsed += dt
        if (dt > 0.0 && frameTiming.sample(dt, FrameTiming.targetMs(sessionQuality))) {
            val next = FrameTiming.downgrade(sessionQuality)
            if (next != sessionQuality) {
                sessionQuality = next
                appliedQuality = null
                applyQuality(next)
            }
        }
        if (dt > 0.0) {
            com.willio.jeanvilma.fishshopping.analytics.AnalyticsBus.shared
                .onFrameSample(frameTiming.emaFrameMs, sessionQuality)
        }

        val pose = playerSmooth.update(
            sim.player, dt, reducedMotion,
            bagUsedUnits = sim.bagUsedUnits,
            fishingProgress = sim.fishingProgress,
        )
        val tm = engine.transformManager
        if (playerEntity != 0) {
            tm.setTransform(tm.getInstance(playerEntity), yawTranslation(pose.yaw, pose.x, 0.0, pose.z))
        }
        if (playerBodyEntity != 0) {
            tm.setTransform(
                tm.getInstance(playerBodyEntity),
                localBody(
                    PLAYER_BODY_REST_Y + pose.bobY,
                    pose.leanRad + pose.swayRad * 0.35,
                    pose.swayRad,
                    BODY_SX, BODY_SY, BODY_SZ,
                ),
            )
        }
        if (playerNoseEntity != 0) {
            tm.setTransform(
                tm.getInstance(playerNoseEntity),
                localNose(
                    PLAYER_NOSE_REST_Y + pose.bobY * 0.4, PLAYER_NOSE_REST_Z, -pose.swayRad * 0.5,
                    PLAYER_NOSE_SX, PLAYER_NOSE_SY, PLAYER_NOSE_SZ,
                ),
            )
        }
        if (playerRodEntity != 0) {
            val tip = if (pose.clip == LocomotionClip.CAST) -0.55 - 0.9 * pose.cast01 else -0.15
            setVisible(playerRodEntity, true)
            tm.setTransform(
                tm.getInstance(playerRodEntity),
                localRod(
                    PLAYER_ROD_REST_X,
                    PLAYER_ROD_REST_Y + pose.bobY * 0.2,
                    PLAYER_ROD_REST_Z,
                    tip,
                    pose.swayRad * 0.25,
                ),
            )
        }

        val shown = visibleStackSlots(sim)
        for ((name, entity) in stackSlots) setVisible(entity, name in shown)

        crowd.update(sim, dt).forEachIndexed { i, member ->
            setVisible(customerBodies[i], member != null)
            if (member != null) {
                tm.setTransform(tm.getInstance(customerRoots[i]), yawTranslation(member.yaw, member.x, 0.0, member.z))
                val body = customerBodies[i]
                if (body != 0) {
                    tm.setTransform(
                        tm.getInstance(body),
                        localBody(
                            CUSTOMER_BODY_REST_Y + member.bobY,
                            member.leanRad + member.swayRad * 0.35,
                            member.swayRad,
                            BODY_SX, BODY_SY, BODY_SZ,
                        ),
                    )
                }
            }
        }
        workerCrowd.update(sim, dt).forEachIndexed { i, member ->
            setVisible(workerRoots[i], member != null)
            setVisible(workerBodies[i], member != null)
            if (member != null) {
                tm.setTransform(tm.getInstance(workerRoots[i]), yawTranslation(member.yaw, member.x, 0.0, member.z))
                val body = workerBodies[i]
                if (body != 0) {
                    tm.setTransform(
                        tm.getInstance(body),
                        localBody(
                            WORKER_BODY_REST_Y + member.bobY,
                            member.leanRad + member.swayRad * 0.35,
                            member.swayRad,
                            BODY_SX, BODY_SY, BODY_SZ,
                        ),
                    )
                }
            }
        }

        if (reducedMotion) {
            while (pendingTransfers.poll() != null) Unit
            while (pendingBursts.poll() != null) Unit
            flying.clear()
            worldBursts.clear()
            for (i in flyFish.indices) setVisible(flyFish[i], false)
            for (i in flyPortion.indices) setVisible(flyPortion[i], false)
            for (i in burstEntities.indices) setVisible(burstEntities[i], false)
        } else {
            while (true) {
                val cue = pendingTransfers.poll() ?: break
                flying.spawn(cue)
            }
            while (true) {
                val cue = pendingBursts.poll() ?: break
                worldBursts.spawn(cue)
            }
            flying.update(dt).forEachIndexed { i, flyPose ->
                setVisible(flyFish.getOrElse(i) { 0 }, false)
                setVisible(flyPortion.getOrElse(i) { 0 }, false)
                if (flyPose == null) return@forEachIndexed
                val entity = if (flyPose.kind == "fish") flyFish.getOrElse(i) { 0 } else flyPortion.getOrElse(i) { 0 }
                if (entity == 0) return@forEachIndexed
                setVisible(entity, true)
                tm.setTransform(
                    tm.getInstance(entity),
                    yawScaleTranslation(flyPose.yaw, flyPose.x, flyPose.y, flyPose.z, flyPose.scale.toFloat()),
                )
            }
            worldBursts.update(dt).forEachIndexed { i, burstPose ->
                val entity = burstEntities.getOrElse(i) { 0 }
                if (entity == 0) return@forEachIndexed
                setVisible(entity, burstPose != null)
                if (burstPose == null) return@forEachIndexed
                tm.setTransform(
                    tm.getInstance(entity),
                    scaleTranslation(burstPose.x, burstPose.y, burstPose.z, burstPose.scale.toFloat(), burstPose.scale.toFloat(), burstPose.scale.toFloat()),
                )
                val rm = engine.renderableManager
                val ri = rm.getInstance(entity)
                if (ri != 0) {
                    try {
                        val mi = rm.getMaterialInstanceAt(ri, 0)
                        val a = burstPose.opacity.toFloat().coerceIn(0f, 1f)
                        mi.setParameter("baseColorFactor", 0.96f, 0.88f, 0.35f, a)
                    } catch (_: Throwable) {
                        // Ubershader param names vary; transform still animates.
                    }
                }
            }
        }

        // Phase 16: operate pulse on Footprint_* while PROCESSING.
        val activePulses = if (reducedMotion) emptyMap() else {
            machineOperatePulses(sim, elapsed).associate { it.footprintName to it.pulse01 }
        }
        val rmFoot = engine.renderableManager
        for ((name, entity) in footprints) {
            val pulse = (activePulses[name] ?: 0.0).toFloat()
            val ri = rmFoot.getInstance(entity)
            if (ri == 0) continue
            try {
                val mi = rmFoot.getMaterialInstanceAt(ri, 0)
                val r = 0.55f + 0.40f * pulse
                val g = 0.50f + 0.35f * pulse
                val b = 0.35f + 0.15f * pulse
                mi.setParameter("baseColorFactor", r, g, b, 1f)
            } catch (_: Throwable) {
                // Ignore material name mismatches.
            }
        }

        if (waterEntity != 0) {
            val waterY = if (reducedMotion) WATER_REST_Y else WATER_REST_Y + sin(elapsed * 0.7) * 0.02
            tm.setTransform(
                tm.getInstance(waterEntity),
                scaleTranslation(WATER_REST_X, waterY, WATER_REST_Z, WATER_SX, WATER_SY, WATER_SZ),
            )
            // Soft colour pulse on the ubershader baseColorFactor (presentation-only water pass).
            val rm = engine.renderableManager
            val ri = rm.getInstance(waterEntity)
            if (ri != 0) {
                val mi = rm.getMaterialInstanceAt(ri, 0)
                val pulse = (0.5 + 0.5 * sin(elapsed * 1.1)).toFloat()
                val r = 0.12f + 0.10f * pulse
                val g = 0.40f + 0.15f * pulse
                val b = 0.55f + 0.20f * pulse
                try {
                    mi.setParameter("baseColorFactor", r, g, b, 0.92f)
                } catch (_: Throwable) {
                    // Parameter name differs across Filament ubershader versions; bob still runs.
                }
            }
        }

        // Phase 31: distance-fade Zone_* pads (hide when far from the player).
        for (z in fadeZones) {
            val d = hypot(z.x - pose.x, z.z - pose.z)
            setVisible(z.entity, occlusionOpacity(d) > 0.05)
        }

        camera.lookAt(
            pose.x, CameraRig.HEIGHT_M, pose.z - CameraRig.BACK_M,
            pose.x, 0.0, pose.z + CameraRig.LOOK_AHEAD_M,
            0.0, 1.0, 0.0,
        )
    }

    /** Hides a renderable via its layer mask (cheap; keeps the entity in the scene). */
    private fun setVisible(entity: Int, visible: Boolean) {
        if (entity == 0) return
        val rm = engine.renderableManager
        val inst = rm.getInstance(entity)
        if (inst != 0) rm.setLayerMask(inst, 0xff, if (visible) 0xff else 0x00)
    }

    /** Column-major 4x4: rotation about +y by [yaw] (0 faces +z), then translation. */
    private fun yawTranslation(yaw: Double, x: Double, y: Double, z: Double): FloatArray {
        val c = cos(yaw).toFloat()
        val s = sin(yaw).toFloat()
        return floatArrayOf(
            c, 0f, -s, 0f,
            0f, 1f, 0f, 0f,
            s, 0f, c, 0f,
            x.toFloat(), y.toFloat(), z.toFloat(), 1f,
        )
    }

    /** Column-major 4x4: Ry(yaw) * uniform S, then translation (flying transfer spin/pulse). */
    private fun yawScaleTranslation(yaw: Double, x: Double, y: Double, z: Double, scale: Float): FloatArray {
        val c = cos(yaw).toFloat() * scale
        val s = sin(yaw).toFloat() * scale
        return floatArrayOf(
            c, 0f, -s, 0f,
            0f, scale, 0f, 0f,
            s, 0f, c, 0f,
            x.toFloat(), y.toFloat(), z.toFloat(), 1f,
        )
    }

    /** Local body: T(0,y,0) * Rx(lean) * Rz(sway) * S — Phase 15 clip lean + walk sway. */
    private fun localBody(
        y: Double,
        lean: Double,
        sway: Double,
        sx: Float,
        sy: Float,
        sz: Float,
    ): FloatArray {
        val cl = cos(lean).toFloat()
        val sl = sin(lean).toFloat()
        val cz = cos(sway).toFloat()
        val szr = sin(sway).toFloat()
        // Column-major: Rx(lean) * Rz(sway) * S
        return floatArrayOf(
            cz * sx, cl * szr * sx, sl * szr * sx, 0f,
            -szr * sy, cl * cz * sy, sl * cz * sy, 0f,
            0f, -sl * sz, cl * sz, 0f,
            0f, y.toFloat(), 0f, 1f,
        )
    }

    /** Local nose: T(0,y,z) * Rz(sway) * S. */
    private fun localNose(y: Double, z: Double, sway: Double, sx: Float, sy: Float, sz: Float): FloatArray {
        val c = cos(sway).toFloat()
        val s = sin(sway).toFloat()
        return floatArrayOf(
            c * sx, s * sx, 0f, 0f,
            -s * sy, c * sy, 0f, 0f,
            0f, 0f, sz, 0f,
            0f, y.toFloat(), z.toFloat(), 1f,
        )
    }

    /** Local rod: T(x,y,z) * Rx(tip) * Rz(sway). */
    private fun localRod(x: Double, y: Double, z: Double, tip: Double, sway: Double): FloatArray {
        val cl = cos(tip).toFloat()
        val sl = sin(tip).toFloat()
        val cz = cos(sway).toFloat()
        val szr = sin(sway).toFloat()
        return floatArrayOf(
            cz, cl * szr, sl * szr, 0f,
            -szr, cl * cz, sl * cz, 0f,
            0f, -sl, cl, 0f,
            x.toFloat(), y.toFloat(), z.toFloat(), 1f,
        )
    }

    /** Uniform-axes scale then translation (for Water slab). */
    private fun scaleTranslation(x: Double, y: Double, z: Double, sx: Float, sy: Float, sz: Float): FloatArray {
        return floatArrayOf(
            sx, 0f, 0f, 0f,
            0f, sy, 0f, 0f,
            0f, 0f, sz, 0f,
            x.toFloat(), y.toFloat(), z.toFloat(), 1f,
        )
    }

    fun destroy() {
        uiHelper.detach()
        swapChain?.let { engine.destroySwapChain(it) }
        swapChain = null
        engine.flushAndWait()

        unloadHarbor()
        resourceLoader.destroy()
        assetLoader.destroy()
        materialProvider.destroyMaterials()
        materialProvider.destroy()

        engine.destroyEntity(sun)
        EntityManager.get().destroy(sun)
        engine.destroyIndirectLight(indirectLight)
        engine.destroySkybox(skybox)
        engine.destroyRenderer(renderer)
        engine.destroyView(view)
        engine.destroyScene(scene)
        engine.destroyCameraComponent(cameraEntity)
        EntityManager.get().destroy(cameraEntity)
        engine.destroy()
        surfaceView = null
    }
}
