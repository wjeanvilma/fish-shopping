package com.willio.jeanvilma.fishshopping.render

import android.view.Choreographer
import android.view.SurfaceView
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset

/**
 * Hosts the Filament surface under the Compose HUD. The SurfaceView sits behind the
 * window, so Compose content drawn afterwards appears on top of the 3D world.
 *
 * Phase 31: one [HarborRenderer] for the session; harbor GLBs swap via [HarborRenderer.ensureHarbor]
 * when [sceneAsset] changes (no Filament engine recreate on travel).
 */
@Composable
fun HarborView(
    viewProvider: () -> SimView?,
    transferProvider: () -> List<FlyingTransferCue> = { emptyList() },
    qualityProvider: () -> QualityPreset = { QualityPreset.MEDIUM },
    modifier: Modifier = Modifier,
    sceneAsset: String = "models/sunrise_pier_blockout.glb",
) {
    val context = LocalContext.current
    val currentProvider = rememberUpdatedState(viewProvider)
    val currentTransfers = rememberUpdatedState(transferProvider)
    val currentQuality = rememberUpdatedState(qualityProvider)
    val renderer = remember { HarborRenderer(context.applicationContext) }

    AndroidView(
        modifier = modifier,
        factory = { ctx -> SurfaceView(ctx).also { renderer.attachTo(it) } },
        update = { renderer.ensureHarbor(sceneAsset) },
    )

    DisposableEffect(sceneAsset) {
        renderer.ensureHarbor(sceneAsset)
        onDispose { }
    }

    DisposableEffect(renderer) {
        val choreographer = Choreographer.getInstance()
        val frameCallback = object : Choreographer.FrameCallback {
            override fun doFrame(frameTimeNanos: Long) {
                choreographer.postFrameCallback(this)
                renderer.enqueueTransfers(currentTransfers.value())
                renderer.render(frameTimeNanos, currentProvider.value(), currentQuality.value())
            }
        }
        choreographer.postFrameCallback(frameCallback)
        onDispose {
            choreographer.removeFrameCallback(frameCallback)
            renderer.destroy()
        }
    }
}
