package com.willio.jeanvilma.fishshopping.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.SoundPool
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import com.willio.jeanvilma.fishshopping.core.audio.MusicPack
import kotlin.math.abs

/**
 * Phase 17 levels + Phase 19 authored SFX (SoundPool) + Phase 20 harbor/shop
 * music beds (MediaPlayer loops). Mute gates music+SFX; SFX duck dips the bed;
 * focus LOSS silences, TRANSIENT_CAN_DUCK ducks. Safe to call from the sim thread.
 */
class AudioBus(context: Context) {
    private val app = context.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private val audioManager = app.getSystemService(AudioManager::class.java)
    @Volatile private var muted = false
    @Volatile private var musicVolume = 0.7f
    @Volatile private var sfxVolume = 1f
    @Volatile private var hapticsEnabled = true
    @Volatile private var activeVoices = 0
    @Volatile private var focusHeld = false
    /** 1 = full, 0 = silence (LOSS), duck factor for TRANSIENT_CAN_DUCK. */
    @Volatile private var focusScale = 1f
    @Volatile private var sfxDucking = false
    @Volatile private var currentBed = MusicPack.DEFAULT_BED
    private var focusRequest: AudioFocusRequest? = null

    private var musicPlayer: MediaPlayer? = null
    private var soundPool: SoundPool? = null
    private val soundIds = mutableMapOf<SfxCue, Int>()
    private val streamDurationsMs = mutableMapOf<SfxCue, Long>()

    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        when (change) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                focusScale = MusicPack.focusMusicScale("gain")
                main.post {
                    if (effectiveMusicBase() > 0f) ensureMusic()
                    refreshMusicVolume()
                }
            }
            AudioManager.AUDIOFOCUS_LOSS,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
            -> {
                focusScale = MusicPack.focusMusicScale("loss")
                main.post {
                    refreshMusicVolume()
                    if (focusScale <= 0f) stopMusic()
                }
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                focusScale = MusicPack.focusMusicScale("duck")
                main.post { refreshMusicVolume() }
            }
        }
    }

    fun applyLevels(
        muted: Boolean = this.muted,
        musicVolume: Float = this.musicVolume,
        sfxVolume: Float = this.sfxVolume,
        hapticsEnabled: Boolean = this.hapticsEnabled,
    ) {
        this.muted = muted
        this.musicVolume = clampVolume(musicVolume)
        this.sfxVolume = clampVolume(sfxVolume)
        this.hapticsEnabled = hapticsEnabled
        main.post {
            if (effectiveMusicBase() > 0f) ensureMusic() else stopMusic()
            refreshMusicVolume()
        }
    }

    fun setMuted(muted: Boolean) = applyLevels(muted = muted)

    fun setMusicVolume(volume: Float) = applyLevels(musicVolume = volume)

    fun setSfxVolume(volume: Float) = applyLevels(sfxVolume = volume)

    fun setHapticsEnabled(enabled: Boolean) {
        hapticsEnabled = enabled
    }

    /** Phase 20: switch harbor ↔ shop bed. */
    fun setMusicBed(bedId: String) {
        val bed = if (bedId == "shop") "shop" else "harbor"
        main.post {
            if (currentBed == bed && musicPlayer != null) return@post
            currentBed = bed
            if (effectiveMusicBase() <= 0f) return@post
            stopMusic()
            ensureMusic()
        }
    }

    fun syncMusicBedFromPanels(
        stationOpen: Boolean,
        festivalActive: Boolean = false,
        stormActive: Boolean = false,
    ) {
        setMusicBed(MusicPack.bedForContext(stationOpen, festivalActive, stormActive))
    }

    fun currentMusicBed(): String = currentBed

    fun isSilencedByFocusLoss(): Boolean = focusScale <= 0f

    fun isSfxDucking(): Boolean = sfxDucking

    fun requestFocus(): Boolean {
        val mgr = audioManager ?: return true
        if (focusHeld) return focusScale > 0f
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()
        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(attrs)
            .setOnAudioFocusChangeListener(focusListener, main)
            .setWillPauseWhenDucked(false)
            .build()
        focusRequest = request
        val result = mgr.requestAudioFocus(request)
        focusHeld = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        focusScale = if (focusHeld) 1f else 0f
        if (focusHeld && effectiveMusicBase() > 0f) {
            main.post { ensureMusic() }
        }
        main.post { ensureSoundPool() }
        return focusHeld
    }

    fun abandonFocus() {
        val mgr = audioManager ?: return
        val request = focusRequest ?: return
        mgr.abandonAudioFocusRequest(request)
        focusRequest = null
        focusHeld = false
        focusScale = 1f
        main.post { stopMusic() }
    }

    fun play(cue: SfxCue) {
        val sfxGain = effectiveSfx()
        main.post {
            if (sfxGain > 0f) {
                val needed = VOICE_COST
                if (!canSpawnVoices(activeVoices, needed)) return@post
                ensureSoundPool()
                val pool = soundPool ?: return@post
                val soundId = soundIds[cue] ?: return@post
                beginSfxDuck()
                activeVoices += needed
                pool.play(soundId, sfxGain, sfxGain, 1, 0, 1f)
                val dur = streamDurationsMs[cue] ?: 220L
                main.postDelayed({
                    activeVoices = (activeVoices - needed).coerceAtLeast(0)
                }, dur + 20L)
            }
            if (cue.wantsHaptic()) pulseHaptic(cue)
            if (effectiveMusicBase() > 0f) ensureMusic()
        }
    }

    private fun beginSfxDuck() {
        sfxDucking = true
        refreshMusicVolume()
        main.removeCallbacks(endDuckRunnable)
        main.postDelayed(endDuckRunnable, MusicPack.SFX_DUCK_RECOVERY_MS.toLong())
    }

    private val endDuckRunnable = Runnable {
        sfxDucking = false
        refreshMusicVolume()
    }

    private fun ensureSoundPool() {
        if (soundPool != null) return
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val pool = SoundPool.Builder()
            .setMaxStreams(MAX_SFX_VOICES)
            .setAudioAttributes(attrs)
            .build()
        for (cue in SfxCue.entries) {
            val resId = app.resources.getIdentifier(cue.androidRawName(), "raw", app.packageName)
            if (resId == 0) continue
            val soundId = pool.load(app, resId, 1)
            soundIds[cue] = soundId
            streamDurationsMs[cue] = estimatedDurationMs(cue)
        }
        soundPool = pool
    }

    private fun estimatedDurationMs(cue: SfxCue): Long = when (cue) {
        SfxCue.CATCH -> 180L
        SfxCue.MACHINE_DONE -> 200L
        SfxCue.SALE -> 220L
        SfxCue.UI -> 90L
        SfxCue.ABANDON -> 260L
        SfxCue.UPGRADE -> 280L
        SfxCue.RUSH -> 340L
        SfxCue.ACHIEVEMENT -> 320L
        SfxCue.FESTIVAL -> 300L
        SfxCue.CONTRACT_DONE -> 240L
        SfxCue.CONTRACT_FAIL -> 280L
        SfxCue.GOAL_CLAIM -> 140L
        SfxCue.MASTERY_UP -> 300L
        SfxCue.QUEST_DONE -> 340L
    }

    private fun pulseHaptic(cue: SfxCue) {
        if (!hapticsEnabled) return
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

    private fun effectiveSfx(): Float =
        if (muted || focusScale <= 0f) 0f else sfxVolume.coerceIn(0f, 1f)

    /** Music gain before SFX duck (mute + settings + focus scale). */
    private fun effectiveMusicBase(): Float {
        if (muted) return 0f
        return musicVolume.coerceIn(0f, 1f) * focusScale
    }

    private fun ensureMusic() {
        if (musicPlayer != null) return
        val raw = MusicPack.androidRawName(currentBed)
        val resId = app.resources.getIdentifier(raw, "raw", app.packageName)
        if (resId == 0) return
        val player = MediaPlayer.create(app, resId) ?: return
        player.isLooping = true
        player.setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build(),
        )
        val vol = outputMusicVolume()
        player.setVolume(vol, vol)
        player.start()
        musicPlayer = player
    }

    private fun refreshMusicVolume() {
        val player = musicPlayer ?: return
        val vol = outputMusicVolume()
        player.setVolume(vol, vol)
        if (vol <= 0f && !player.isPlaying) return
        if (vol <= 0f && player.isPlaying) {
            // Keep looping but silent while ducked to 0 / muted mid-session.
            player.setVolume(0f, 0f)
        }
    }

    private fun outputMusicVolume(): Float {
        val base = effectiveMusicBase() * MusicPack.MASTER_MUSIC_SCALE
        return MusicPack.duckedMusicGain(base, sfxDucking).coerceIn(0f, 1f)
    }

    private fun stopMusic() {
        val player = musicPlayer ?: return
        musicPlayer = null
        runCatching {
            player.stop()
            player.release()
        }
    }

    companion object {
        const val MAX_SFX_VOICES = 6
        const val VOICE_COST = 1
        val VOLUME_STEPS = floatArrayOf(0f, 0.35f, 0.7f, 1f)

        fun clampVolume(v: Float): Float =
            VOLUME_STEPS.minByOrNull { abs(it - v) } ?: 1f

        fun canSpawnVoices(active: Int, needed: Int, max: Int = MAX_SFX_VOICES): Boolean {
            if (needed <= 0) return false
            return active + needed <= max
        }

        fun effectiveSfxGain(muted: Boolean, sfxVolume: Float): Float =
            if (muted) 0f else sfxVolume.coerceIn(0f, 1f)

        fun effectiveMusicGain(muted: Boolean, musicVolume: Float): Float =
            if (muted) 0f else musicVolume.coerceIn(0f, 1f)
    }
}
