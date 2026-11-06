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
import java.nio.ByteBuffer
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.sin

/**
 * Owns the Filament engine and the harbor scene. Filament supplies rendering only;
 * all game rules live in game-core. This class reads [SimView] snapshots and writes
 * transforms; it never changes game state.
 *
 * Must be created, used and destroyed on the main thread.
 *
 * Item stacks and walking customers are driven from SimView by [visibleStackSlots]
 * and [CustomerCrowd] (Presenters.kt), mirrored by the web renderer.
 *
 * TODO(blueprint): animated characters, water shader, flying transfer animation,
 * occlusion fade, quality presets, per-asset loading per harbor.
 */
class HarborRenderer(private val context: Context, private val sceneAsset: String) {

    companion object {
        init {
            Utils.init() // loads filament, gltfio and utils native libraries
        }

        private const val SMOOTHING_PER_SECOND = 18.0
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
    private var customerRoots = IntArray(0)
    private var customerBodies = IntArray(0)
    private var crowd = CustomerCrowd(0)
    /** Renderable entity of every pooled item slot, by node name. */
    private val stackSlots = HashMap<String, Int>()

    private val uiHelper = UiHelper(UiHelper.ContextErrorPolicy.DONT_CHECK)
    private var displayHelper: DisplayHelper? = null
    private var swapChain: SwapChain? = null
    private var surfaceView: SurfaceView? = null

    // Visual state, eased toward simulation positions (visuals interpolate; rules do not).
    private var visX = Double.NaN
    private var visZ = 0.0
    private var visYaw = 0.0
    private var lastFrameNanos = 0L

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

    private fun loadScene() {
        val bytes = context.assets.open(sceneAsset).use { it.readBytes() }
        val buffer = ByteBuffer.allocateDirect(bytes.size).put(bytes).also { it.flip() }
        val loaded = assetLoader.createAsset(buffer) ?: error("Could not parse $sceneAsset")
        resourceLoader.loadResources(loaded)
        loaded.releaseSourceData()
        scene.addEntities(loaded.entities)
        asset = loaded

        playerEntity = loaded.getFirstEntityByName("Player")
        customerRoots = generateSequence(0) { it + 1 }
            .map { loaded.getFirstEntityByName("Customer_$it") }
            .takeWhile { it != 0 }
            .toList().toIntArray()
        customerBodies = IntArray(customerRoots.size) { loaded.getFirstEntityByName("CustomerBody_$it") }
        crowd = CustomerCrowd(customerRoots.size)

        stackSlots.clear()
        for (e in loaded.entities) {
            val name = loaded.getName(e) ?: continue
            if (isStackSlotName(name)) stackSlots[name] = e
        }
        stackSlots.values.forEach { setVisible(it, false) }
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
    fun render(frameTimeNanos: Long, sim: SimView?) {
        if (sim != null) updateScene(frameTimeNanos, sim)
        val chain = swapChain ?: return
        if (!uiHelper.isReadyToRender) return
        if (renderer.beginFrame(chain, frameTimeNanos)) {
            renderer.render(view)
            renderer.endFrame()
        }
    }

    private fun updateScene(frameTimeNanos: Long, sim: SimView) {
        val dt = if (lastFrameNanos == 0L) 0.0 else ((frameTimeNanos - lastFrameNanos) / 1e9).coerceIn(0.0, 0.25)
        lastFrameNanos = frameTimeNanos

        val targetX = sim.player.xMm / 1000.0
        val targetZ = sim.player.zMm / 1000.0
        val targetYaw = atan2(sim.player.facingX.toDouble(), sim.player.facingZ.toDouble())
        if (visX.isNaN()) {
            visX = targetX; visZ = targetZ; visYaw = targetYaw
        } else {
            val k = 1.0 - exp(-SMOOTHING_PER_SECOND * dt)
            visX += (targetX - visX) * k
            visZ += (targetZ - visZ) * k
            var dYaw = targetYaw - visYaw
            while (dYaw > Math.PI) dYaw -= 2 * Math.PI
            while (dYaw < -Math.PI) dYaw += 2 * Math.PI
            visYaw += dYaw * k
        }

        if (playerEntity != 0) {
            val tm = engine.transformManager
            tm.setTransform(tm.getInstance(playerEntity), yawTranslation(visYaw, visX, 0.0, visZ))
        }

        val shown = visibleStackSlots(sim)
        for ((name, entity) in stackSlots) setVisible(entity, name in shown)

        val tm = engine.transformManager
        crowd.update(sim, dt).forEachIndexed { i, member ->
            setVisible(customerBodies[i], member != null)
            if (member != null) {
                tm.setTransform(tm.getInstance(customerRoots[i]), yawTranslation(member.yaw, member.x, 0.0, member.z))
            }
        }

        camera.lookAt(
            visX, CameraRig.HEIGHT_M, visZ - CameraRig.BACK_M,
            visX, 0.0, visZ + CameraRig.LOOK_AHEAD_M,
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
