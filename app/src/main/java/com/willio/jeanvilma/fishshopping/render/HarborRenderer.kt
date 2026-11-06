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
import kotlin.math.max
import kotlin.math.sin

/**
 * Owns the Filament engine and the harbor scene. Filament supplies rendering only;
 * all game rules live in game-core. This class reads [SimView] snapshots and writes
 * transforms; it never changes game state.
 *
 * Must be created, used and destroyed on the main thread.
 *
 * Item stacks, character locomotion, flying transfers, and water tint/bob are driven
 * from SimView / [FlyingTransferCue]s by the presenters in Presenters.kt, mirrored by
 * the web renderer. Phase 29 wires [QualityPreset] into shadows, MSAA, crowd/VFX budgets,
 * and soft frame-time auto-downgrade (20 Hz sim stays fixed).
 *
 * TODO(blueprint): occlusion fade, per-asset loading per harbor.
 */
class HarborRenderer(private val context: Context, private val sceneAsset: String) {

    companion object {
        init {
            Utils.init() // loads filament, gltfio and utils native libraries
        }

        private val FLY_SLOT = Regex("""^Fly_(\d+)_(fish|portion)$""")
        // Blockout TRS scales from generate_blockout.py
        private const val PLAYER_BODY_SX = 0.6f
        private const val PLAYER_BODY_SY = 1.6f
        private const val PLAYER_BODY_SZ = 0.6f
        private const val PLAYER_NOSE_SX = 0.25f
        private const val PLAYER_NOSE_SY = 0.18f
        private const val PLAYER_NOSE_SZ = 0.12f
        private const val CUSTOMER_BODY_SX = 0.55f
        private const val CUSTOMER_BODY_SY = 1.5f
        private const val CUSTOMER_BODY_SZ = 0.55f
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
    private var customerRoots = IntArray(0)
    private var customerBodies = IntArray(0)
    private var crowd = CustomerCrowd(0)
    private var playerSmooth = PlayerSmoother()
    /** Renderable entity of every pooled item slot, by node name. */
    private val stackSlots = HashMap<String, Int>()
    private var flyFish = IntArray(0)
    private var flyPortion = IntArray(0)
    private var flying = FlyingTransfers(FLYING_TRANSFER_POOL)
    private val pendingTransfers = ConcurrentLinkedQueue<FlyingTransferCue>()
    private var waterEntity = 0

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

        loadScene()
    }

    /** Queue sim-authoritative transfer arcs (drained on the next frame). */
    fun enqueueTransfers(cues: Collection<FlyingTransferCue>) {
        pendingTransfers.addAll(cues)
    }

    private fun loadScene() {
        val bytes = context.assets.open(sceneAsset).use { it.readBytes() }
        val buffer = ByteBuffer.allocateDirect(bytes.size).put(bytes).also { it.flip() }
        val loaded = assetLoader.createAsset(buffer) ?: error("Could not parse $sceneAsset")
        resourceLoader.loadResources(loaded)
        loaded.releaseSourceData()
        scene.addEntities(loaded.entities)
        asset = loaded

        playerEntity = loaded.getFirstEntityByName("Player")
        playerBodyEntity = loaded.getFirstEntityByName("PlayerBody")
        playerNoseEntity = loaded.getFirstEntityByName("PlayerNose")
        waterEntity = loaded.getFirstEntityByName("Water")
        customerRoots = generateSequence(0) { it + 1 }
            .map { loaded.getFirstEntityByName("Customer_$it") }
            .takeWhile { it != 0 }
            .toList().toIntArray()
        customerBodies = IntArray(customerRoots.size) { loaded.getFirstEntityByName("CustomerBody_$it") }
        crowd = CustomerCrowd(customerRoots.size)
        crowd.setDrawCap(crowdDrawCapForQuality(FrameTiming.toPresenterQuality(sessionQuality), customerRoots.size))
        playerSmooth = PlayerSmoother()

        stackSlots.clear()
        val fish = HashMap<Int, Int>()
        val portion = HashMap<Int, Int>()
        for (e in loaded.entities) {
            val name = loaded.getName(e) ?: continue
            if (isStackSlotName(name)) stackSlots[name] = e
            val m = FLY_SLOT.matchEntire(name) ?: continue
            val idx = m.groupValues[1].toInt()
            when (m.groupValues[2]) {
                "fish" -> fish[idx] = e
                "portion" -> portion[idx] = e
            }
        }
        val flyCount = max(FLYING_TRANSFER_POOL, max(fish.keys.maxOrNull() ?: -1, portion.keys.maxOrNull() ?: -1) + 1)
        flyFish = IntArray(flyCount) { fish[it] ?: 0 }
        flyPortion = IntArray(flyCount) { portion[it] ?: 0 }
        flying = FlyingTransfers(flyCount)
        flying.setBudget(
            minOf(flyCount, flyingTransferPoolForQuality(FrameTiming.toPresenterQuality(sessionQuality))),
        )
        stackSlots.values.forEach { setVisible(it, false) }
        flyFish.forEach { setVisible(it, false) }
        flyPortion.forEach { setVisible(it, false) }
        customerBodies.forEach { setVisible(it, false) }
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
    fun render(frameTimeNanos: Long, sim: SimView?, quality: QualityPreset = QualityPreset.MEDIUM) {
        if (quality != requestedQuality) {
            requestedQuality = quality
            sessionQuality = quality
            frameTiming.reset()
            appliedQuality = null
        }
        applyQuality(sessionQuality)
        if (sim != null) updateScene(frameTimeNanos, sim)
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
     * Phase 29 quality → Filament cost: shadows + MSAA + crowd/VFX budgets.
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
    }

    private fun updateScene(frameTimeNanos: Long, sim: SimView) {
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

        val pose = playerSmooth.update(sim.player, dt)
        val tm = engine.transformManager
        if (playerEntity != 0) {
            tm.setTransform(tm.getInstance(playerEntity), yawTranslation(pose.yaw, pose.x, 0.0, pose.z))
        }
        if (playerBodyEntity != 0) {
            tm.setTransform(
                tm.getInstance(playerBodyEntity),
                localBody(
                    PLAYER_BODY_REST_Y + pose.bobY, pose.swayRad,
                    PLAYER_BODY_SX, PLAYER_BODY_SY, PLAYER_BODY_SZ,
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
                            CUSTOMER_BODY_REST_Y + member.bobY, member.swayRad,
                            CUSTOMER_BODY_SX, CUSTOMER_BODY_SY, CUSTOMER_BODY_SZ,
                        ),
                    )
                }
            }
        }

        while (true) {
            val cue = pendingTransfers.poll() ?: break
            flying.spawn(cue)
        }
        flying.update(dt).forEachIndexed { i, flyPose ->
            setVisible(flyFish.getOrElse(i) { 0 }, false)
            setVisible(flyPortion.getOrElse(i) { 0 }, false)
            if (flyPose == null) return@forEachIndexed
            val entity = if (flyPose.kind == "fish") flyFish.getOrElse(i) { 0 } else flyPortion.getOrElse(i) { 0 }
            if (entity == 0) return@forEachIndexed
            setVisible(entity, true)
            tm.setTransform(tm.getInstance(entity), yawTranslation(0.0, flyPose.x, flyPose.y, flyPose.z))
        }

        if (waterEntity != 0) {
            val waterY = WATER_REST_Y + sin(elapsed * 0.7) * 0.02
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

    /** Local body: T(0,y,0) * Rz(sway) * S — preserves blockout scale. */
    private fun localBody(y: Double, sway: Double, sx: Float, sy: Float, sz: Float): FloatArray {
        val c = cos(sway).toFloat()
        val s = sin(sway).toFloat()
        return floatArrayOf(
            c * sx, s * sx, 0f, 0f,
            -s * sy, c * sy, 0f, 0f,
            0f, 0f, sz, 0f,
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

        asset?.let {
            scene.removeEntities(it.entities)
            assetLoader.destroyAsset(it)
        }
        asset = null
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
