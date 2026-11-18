package com.willio.jeanvilma.fishshopping.render

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.view.PixelCopy
import android.view.SurfaceView
import com.google.android.filament.Camera
import java.lang.ref.WeakReference
import kotlin.math.cos
import kotlin.math.sin

/**
 * Cozy art pass 5 — photo mode plumbing for the Filament harbor view.
 *
 *  - [photoCam] switches the renderer from the follow camera to an orbit camera.
 *  - [timeOverride] lets the photo "time of day" slider relight the scene (presentation only).
 *  - [capture] copies the SurfaceView pixels (PixelCopy; the HUD is not part of the surface),
 *    saves a PNG to Pictures/FishShopping and returns its content Uri for sharing.
 */
object HarborCapture {
    data class PhotoCam(val yaw: Double = 0.0, val pitch: Double = 0.55, val dist: Double = 9.0)

    @Volatile var photoCam: PhotoCam? = null
    @Volatile var timeOverride: Int? = null

    private var surface: WeakReference<SurfaceView>? = null

    fun attach(view: SurfaceView) {
        surface = WeakReference(view)
    }

    fun setPhotoMode(on: Boolean) {
        photoCam = if (on) PhotoCam() else null
        if (!on) timeOverride = null
    }

    fun orbit(dYaw: Double, dPitch: Double, dDist: Double) {
        val c = photoCam ?: return
        photoCam = c.copy(
            yaw = c.yaw + dYaw,
            pitch = (c.pitch + dPitch).coerceIn(0.08, 1.35),
            dist = (c.dist + dDist).coerceIn(3.0, 26.0),
        )
    }

    /** Applies the orbit camera when photo mode is on; returns false to keep the follow camera. */
    fun orbitCamera(camera: Camera, x: Double, z: Double): Boolean {
        val c = photoCam ?: return false
        val flat = cos(c.pitch) * c.dist
        camera.lookAt(
            x - sin(c.yaw) * flat, 1.0 + sin(c.pitch) * c.dist, z - cos(c.yaw) * flat,
            x, 1.0, z,
            0.0, 1.0, 0.0,
        )
        return true
    }

    /** Capture the harbor surface; [done] receives the saved image Uri, or null on failure. */
    fun capture(context: Context, harborName: String, done: (Uri?) -> Unit) {
        val view = surface?.get()
        if (view == null || view.width <= 0 || view.height <= 0) {
            done(null)
            return
        }
        val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        val main = Handler(Looper.getMainLooper())
        try {
            PixelCopy.request(view, bitmap, { result ->
                if (result != PixelCopy.SUCCESS) {
                    done(null)
                } else {
                    done(save(context, bitmap, harborName))
                }
            }, main)
        } catch (_: Throwable) {
            done(null)
        }
    }

    private fun save(context: Context, bitmap: Bitmap, harborName: String): Uri? {
        // Scoped MediaStore writes need no storage permission from Android 10; older devices skip saving.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
        val slug = harborName.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')
        val name = "fish-shopping-$slug-${System.currentTimeMillis()}.png"
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, name)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/FishShopping")
        }
        return try {
            val resolver = context.contentResolver
            val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: return null
            resolver.openOutputStream(uri)?.use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            uri
        } catch (_: Throwable) {
            null
        }
    }

    /** System share sheet for a captured photo. */
    fun share(context: Context, uri: Uri, harborName: String) {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_TEXT, "My harbor: $harborName")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(send, "Share harbor photo").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
}
