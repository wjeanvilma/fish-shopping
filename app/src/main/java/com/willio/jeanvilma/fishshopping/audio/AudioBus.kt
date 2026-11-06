package com.willio.jeanvilma.fishshopping.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import kotlin.math.PI
import kotlin.math.sin

/**
 * Procedural PCM stingers + catch/sale haptics. Mute is presentation-only and
 * mirrors the Settings "Mute" toggle. Safe to call from the sim thread — work
 * is posted to the main looper.
 */
class AudioBus(context: Context) {
    private val app = context.applicationContext
    private val main = Handler(Looper.getMainLooper())
    @Volatile
    private var muted = false

    private data class Tone(val freq: Double, val durMs: Int, val gain: Double = 0.22, val delayMs: Int = 0)

    private val cues: Map<SfxCue, List<Tone>> = mapOf(
        SfxCue.CATCH to listOf(
            Tone(520.0, 60, 0.28),
            Tone(780.0, 90, 0.24, delayMs = 50),
        ),
        SfxCue.MACHINE_DONE to listOf(
            Tone(340.0, 50, 0.18),
            Tone(340.0, 50, 0.18, delayMs = 80),
        ),
        SfxCue.SALE to listOf(
            Tone(880.0, 50, 0.26),
            Tone(1320.0, 120, 0.2, delayMs = 40),
        ),
        SfxCue.ABANDON to listOf(
            Tone(420.0, 100, 0.16),
            Tone(260.0, 160, 0.14, delayMs = 80),
        ),
        SfxCue.UPGRADE to listOf(
            Tone(523.0, 70, 0.22),
            Tone(659.0, 70, 0.22, delayMs = 60),
            Tone(784.0, 120, 0.24, delayMs = 120),
        ),
        SfxCue.RUSH to listOf(
            Tone(392.0, 100, 0.2),
            Tone(494.0, 100, 0.2, delayMs = 80),
            Tone(587.0, 180, 0.22, delayMs = 160),
        ),
    )

    fun setMuted(muted: Boolean) {
        this.muted = muted
    }

    fun play(cue: SfxCue) {
        if (muted) return
        val tones = cues[cue] ?: return
        main.post {
            if (muted) return@post
            for (tone in tones) {
                main.postDelayed({ if (!muted) playTone(tone) }, tone.delayMs.toLong())
            }
            if (cue.wantsHaptic()) pulseHaptic(cue)
        }
    }

    private fun pulseHaptic(cue: SfxCue) {
        val vibrator = vibrator() ?: return
        val ms = if (cue == SfxCue.SALE) 35L else 28L
        if (Build.VERSION.SDK_INT >= 26) {
            vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(ms)
        }
    }

    private fun vibrator(): Vibrator? {
        return if (Build.VERSION.SDK_INT >= 31) {
            val mgr = app.getSystemService(VibratorManager::class.java) ?: return null
            mgr.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            app.getSystemService(Vibrator::class.java)
        }
    }

    private fun playTone(tone: Tone) {
        val sampleRate = 22_050
        val samples = (sampleRate * tone.durMs / 1000.0).toInt().coerceAtLeast(1)
        val buf = ShortArray(samples)
        val twoPiF = 2.0 * PI * tone.freq / sampleRate
        for (i in 0 until samples) {
            val env = when {
                i < samples / 10 -> i.toDouble() / (samples / 10.0)
                else -> 1.0 - (i - samples / 10.0) / (samples * 0.9)
            }.coerceIn(0.0, 1.0)
            buf[i] = (sin(twoPiF * i) * tone.gain * env * Short.MAX_VALUE).toInt()
                .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
                .toShort()
        }
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build(),
            )
            .setBufferSizeInBytes(buf.size * 2)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()
        track.write(buf, 0, buf.size)
        track.play()
        main.postDelayed({
            runCatching {
                track.stop()
                track.release()
            }
        }, tone.durMs + 40L)
    }
}
