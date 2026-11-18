package com.willio.jeanvilma.fishshopping.render

import com.google.android.filament.Engine
import com.google.android.filament.IndirectLight
import com.google.android.filament.Skybox
import com.google.android.filament.View
import com.google.android.filament.gltfio.FilamentAsset
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import kotlin.math.cos
import kotlin.math.sin

/**
 * Cozy art pass 5 — Android side of the day/night + weather look and placed decor.
 * Mirrors web HarborScene: sun colour / intensity / direction, ambient intensity, sky, fog,
 * emissive lamp heads (LampGlow_*), and Decor_* nodes moved to their placements.
 * Presentation only; reads [SimView] and never writes sim state.
 */
internal class CozyAtmospherePass(
    private val engine: Engine,
    private val view: View,
    private val sun: Int,
    private val indirectLight: IndirectLight,
    private val skybox: Skybox,
) {
    private var lampGlowEntities = IntArray(0)
    private val decorEntities = HashMap<String, Int>()
    private val warm = Atmosphere.linear("#FFD98A")

    /** Re-scan lamp heads and decor nodes for the bound harbor asset. */
    fun rescan(asset: FilamentAsset) {
        val glows = ArrayList<Int>()
        decorEntities.clear()
        for (e in asset.entities) {
            val name = asset.getName(e) ?: continue
            if (name.startsWith("LampGlow_")) glows += e
            if (name.startsWith("Decor_")) decorEntities[name.removePrefix("Decor_")] = e
        }
        lampGlowEntities = glows.toIntArray()
    }

    fun apply(sim: SimView, reducedMotion: Boolean, ambientSky: FloatArray) {
        val atm = Atmosphere.frame(HarborCapture.timeOverride ?: sim.dayProgressPermille, sim.weatherId, reducedMotion)
        val lm = engine.lightManager
        val sunInst = lm.getInstance(sun)
        if (sunInst != 0) {
            val c = Atmosphere.linear(atm.sunHex)
            lm.setColor(sunInst, c[0], c[1], c[2])
            lm.setIntensity(sunInst, (95_000.0 * atm.sunIntensity / 2.9).toFloat())
            lm.setDirection(sunInst, atm.sunDir[0].toFloat(), atm.sunDir[1].toFloat(), atm.sunDir[2].toFloat())
        }
        indirectLight.intensity = (28_000.0 * atm.hemiIntensity / 1.3).toFloat()
        val sky = Atmosphere.linear(atm.skyHex)
        try {
            skybox.setColor(
                floatArrayOf(
                    sky[0] * 0.8f + ambientSky[0] * 0.2f,
                    sky[1] * 0.8f + ambientSky[1] * 0.2f,
                    sky[2] * 0.8f + ambientSky[2] * 0.2f,
                    1f,
                ),
            )
        } catch (_: Throwable) {
            // Older Filament builds may lack setColor.
        }
        try {
            val fog = View.FogOptions()
            fog.enabled = true
            fog.distance = atm.fogNear.toFloat()
            fog.density = (2.2 / (atm.fogFar - atm.fogNear).coerceAtLeast(4.0)).toFloat()
            fog.maximumOpacity = 0.85f
            fog.heightFalloff = 0.0f
            fog.color = Atmosphere.linear(atm.fogHex)
            view.fogOptions = fog
        } catch (_: Throwable) {
            // Fog is optional polish.
        }
        val rm = engine.renderableManager
        val glow = (0.15 + atm.lampGlow * 2.6).toFloat()
        for (e in lampGlowEntities) {
            val ri = rm.getInstance(e)
            if (ri == 0) continue
            try {
                rm.getMaterialInstanceAt(ri, 0).setParameter("emissiveFactor", warm[0] * glow, warm[1] * glow, warm[2] * glow)
            } catch (_: Throwable) {
                // Material without an emissive parameter: lamps stay lit by the sun only.
            }
        }
    }

    /** Park every Decor_* node below the world, then stand the placed ones at their spots. */
    fun syncDecor(sim: SimView) {
        if (decorEntities.isEmpty()) return
        val tm = engine.transformManager
        val placed = sim.decorPlacements.associateBy { it.decorId.substringAfter('.') }
        val m = FloatArray(16)
        for ((short, e) in decorEntities) {
            val ti = tm.getInstance(e)
            if (ti == 0) continue
            val p = placed[short]
            val yaw = (p?.rotationQuarter ?: 0) * (Math.PI / 2)
            val c = cos(yaw).toFloat()
            val sn = sin(yaw).toFloat()
            m.fill(0f)
            m[0] = c; m[2] = -sn; m[5] = 1f; m[8] = sn; m[10] = c; m[15] = 1f
            m[12] = (p?.xMm ?: 0) / 1000f
            m[13] = if (p == null) -20f else 0f
            m[14] = (p?.zMm ?: 0) / 1000f
            tm.setTransform(ti, m)
        }
    }
}
