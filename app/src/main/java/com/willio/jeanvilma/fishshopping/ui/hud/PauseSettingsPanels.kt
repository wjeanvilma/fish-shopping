package com.willio.jeanvilma.fishshopping.ui.hud

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.ui.res.painterResource
import com.willio.jeanvilma.fishshopping.R
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.unit.IntSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.willio.jeanvilma.fishshopping.core.i18n.UiStrings
import com.willio.jeanvilma.fishshopping.ui.ComposeUiTags
import com.willio.jeanvilma.fishshopping.core.store.LicensesNotice
import com.willio.jeanvilma.fishshopping.core.store.StoreListing
import com.willio.jeanvilma.fishshopping.core.sim.ContextCard
import com.willio.jeanvilma.fishshopping.core.sim.DailyGoalView
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.ActiveContractView
import com.willio.jeanvilma.fishshopping.core.sim.BankView
import com.willio.jeanvilma.fishshopping.core.sim.BaitOfferView
import com.willio.jeanvilma.fishshopping.core.sim.ContractOfferView
import com.willio.jeanvilma.fishshopping.core.sim.CosmeticIapOfferView
import com.willio.jeanvilma.fishshopping.core.sim.DecorOfferView
import com.willio.jeanvilma.fishshopping.core.sim.HarborMapEntryView
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.PrestigeView
import com.willio.jeanvilma.fishshopping.core.sim.QuestView
import com.willio.jeanvilma.fishshopping.core.sim.SeasonalEventBannerView
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.core.sim.CosmeticPresentation
import com.willio.jeanvilma.fishshopping.core.sim.TutorialFriction
import com.willio.jeanvilma.fishshopping.core.sim.StaffHireView
import com.willio.jeanvilma.fishshopping.core.sim.WorkerView
import com.willio.jeanvilma.fishshopping.core.sim.StationView
import com.willio.jeanvilma.fishshopping.core.sim.TrophySetView
import com.willio.jeanvilma.fishshopping.core.sim.UpgradeView
import com.willio.jeanvilma.fishshopping.core.sim.BusinessDashboardView
import com.willio.jeanvilma.fishshopping.core.sim.SpeciesBookView
import com.willio.jeanvilma.fishshopping.core.sim.WarehouseView
import com.willio.jeanvilma.fishshopping.core.persistence.SyncSource
import com.willio.jeanvilma.fishshopping.game.CameraRig
import com.willio.jeanvilma.fishshopping.game.CloudConflictView
import com.willio.jeanvilma.fishshopping.game.GameUiState
import com.willio.jeanvilma.fishshopping.game.GameViewModel
import com.willio.jeanvilma.fishshopping.game.LocalRecoveryView
import com.willio.jeanvilma.fishshopping.game.SnapshotChoiceRow
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import com.willio.jeanvilma.fishshopping.persistence.JoystickSide
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import com.willio.jeanvilma.fishshopping.render.HarborView
import com.willio.jeanvilma.fishshopping.ui.ControlQa
import kotlinx.coroutines.delay

@Composable
internal fun PausePanel(onResume: () -> Unit, onSettings: () -> Unit, onTitle: () -> Unit) {
    Surface(
        Modifier
            .testTag(ComposeUiTags.PAUSE_ROOT)
            .widthIn(min = 280.dp)
            .then(rememberSheetClicks()),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                com.willio.jeanvilma.fishshopping.core.i18n.UiStrings.t("pause.title"),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Button(
                onClick = onResume,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .testTag(ComposeUiTags.PAUSE_RESUME),
            ) {
                Text(com.willio.jeanvilma.fishshopping.core.i18n.UiStrings.t("pause.resume"))
            }
            Button(
                onClick = onSettings,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .testTag(ComposeUiTags.PAUSE_SETTINGS),
            ) {
                Text(com.willio.jeanvilma.fishshopping.core.i18n.UiStrings.t("pause.settings"))
            }
            OutlinedButton(
                onClick = onTitle,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .testTag(ComposeUiTags.PAUSE_TITLE),
            ) {
                Text(com.willio.jeanvilma.fishshopping.core.i18n.UiStrings.t("pause.titleScreen"))
            }
        }
    }
}

@Composable
internal fun SettingsPanel(
    settings: GameSettings,
    cloudAvailable: Boolean,
    saveStatus: com.willio.jeanvilma.fishshopping.persistence.SaveStatusView,
    achievements: List<com.willio.jeanvilma.fishshopping.core.sim.AchievementView>,
    unlockedAchievementsCount: Int,
    onMuted: (Boolean) -> Unit,
    onMusicVolume: (Float) -> Unit,
    onSfxVolume: (Float) -> Unit,
    onHaptics: (Boolean) -> Unit,
    onQuality: (QualityPreset) -> Unit,
    onJoystickSide: (JoystickSide) -> Unit,
    onJoystickScale: (Float) -> Unit,
    onTapToMove: (Boolean) -> Unit,
    onCloudSync: (Boolean) -> Unit,
    onAnalyticsConsent: (Boolean) -> Unit,
    onDailyGoalReminders: (Boolean) -> Unit,
    onBalanceStrip: (Boolean) -> Unit,
    onReducedMotion: (Boolean) -> Unit,
    onCaptions: (Boolean) -> Unit,
    onHudTextScale: (Float) -> Unit,
    onShapeCues: (Boolean) -> Unit,
    onTimingAssist: (Boolean) -> Unit,
    onAccessibilityPreset: () -> Unit,
    onLocale: (String) -> Unit,
    onThemePreference: (com.willio.jeanvilma.fishshopping.persistence.ThemePreference) -> Unit,
    telemetryRates: com.willio.jeanvilma.fishshopping.core.sim.TelemetryRatesView,
    analyticsAlertActive: Boolean,
    onExportTelemetry: () -> String?,
    onExportBalance: () -> String?,
    onExportAnalyticsDashboard: () -> String,
    onClose: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var exportNote by remember { mutableStateOf<String?>(null) }
    var showLicenses by remember { mutableStateOf(false) }
    var showAchievements by remember { mutableStateOf(false) }
    if (showAchievements) {
        AchievementsPanel(
            achievements = achievements,
            unlockedCount = unlockedAchievementsCount,
            onClose = { showAchievements = false },
        )
        return
    }
    if (showLicenses) {
        LicensesPanel(onClose = { showLicenses = false })
        return
    }
    Surface(
        Modifier
            .managementSheet(maxWidth = 400.dp, maxHeight = 520.dp)
            .a11yPane("settings.title")
            .then(rememberSheetClicks()),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    com.willio.jeanvilma.fishshopping.core.i18n.UiStrings.t("settings.title"),
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(com.willio.jeanvilma.fishshopping.core.i18n.UiStrings.t("settings.close"))
                }
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.semantics {
                    contentDescription = UiStrings.t("a11y.languageGroup")
                },
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        UiStrings.t("settings.language"),
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        UiStrings.t("settings.languageHint"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (loc in listOf("en", "es", "pt")) {
                    val labelKey = when (loc) {
                        "es" -> "settings.languageEs"
                        "pt" -> "settings.languagePt"
                        else -> "settings.languageEn"
                    }
                    if (settings.locale == loc) {
                        Button(onClick = { onLocale(loc) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(UiStrings.t(labelKey))
                        }
                    } else {
                        OutlinedButton(onClick = { onLocale(loc) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(UiStrings.t(labelKey))
                        }
                    }
                }
            }
            Column(
                modifier = Modifier.semantics {
                    contentDescription = UiStrings.t("a11y.themeGroup")
                },
            ) {
                Text(UiStrings.t("settings.theme"), fontWeight = FontWeight.SemiBold)
                Text(
                    UiStrings.t("settings.themeHint"),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    for (pref in listOf(
                        com.willio.jeanvilma.fishshopping.persistence.ThemePreference.SYSTEM,
                        com.willio.jeanvilma.fishshopping.persistence.ThemePreference.LIGHT,
                        com.willio.jeanvilma.fishshopping.persistence.ThemePreference.DARK,
                    )) {
                        val labelKey = when (pref) {
                            com.willio.jeanvilma.fishshopping.persistence.ThemePreference.LIGHT -> "settings.themeLight"
                            com.willio.jeanvilma.fishshopping.persistence.ThemePreference.DARK -> "settings.themeDark"
                            else -> "settings.themeSystem"
                        }
                        if (settings.themePreference == pref) {
                            Button(onClick = { onThemePreference(pref) }, modifier = Modifier.heightIn(min = 48.dp)) {
                                Text(UiStrings.t(labelKey))
                            }
                        } else {
                            OutlinedButton(onClick = { onThemePreference(pref) }, modifier = Modifier.heightIn(min = 48.dp)) {
                                Text(UiStrings.t(labelKey))
                            }
                        }
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        com.willio.jeanvilma.fishshopping.core.i18n.UiStrings.t("settings.mute"),
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(UiStrings.t("settings.muteHint"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.muted, onCheckedChange = onMuted)
            }
            Text(UiStrings.t("settings.music"))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GameSettings.VOLUME_OPTIONS.forEach { step ->
                    val label = when (step) {
                        0f -> "Off"
                        0.35f -> "Low"
                        0.7f -> "Med"
                        else -> "High"
                    }
                    val selected = settings.musicVolume == step
                    if (selected) {
                        Button(onClick = { onMusicVolume(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    } else {
                        OutlinedButton(onClick = { onMusicVolume(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    }
                }
            }
            Text(UiStrings.t("settings.sfx"))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GameSettings.VOLUME_OPTIONS.forEach { step ->
                    val label = when (step) {
                        0f -> "Off"
                        0.35f -> "Low"
                        0.7f -> "Med"
                        else -> "High"
                    }
                    val selected = settings.sfxVolume == step
                    if (selected) {
                        Button(onClick = { onSfxVolume(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    } else {
                        OutlinedButton(onClick = { onSfxVolume(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(UiStrings.t("settings.haptics"), fontWeight = FontWeight.SemiBold)
                    Text(UiStrings.t("settings.hapticsHint"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.hapticsEnabled, onCheckedChange = onHaptics)
            }
            Text(UiStrings.t("settings.quality"))
            Text(UiStrings.t("settings.qualityHint"),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                QualityPreset.entries.forEach { preset ->
                    val label = when (preset) {
                        QualityPreset.LOW -> "Low"
                        QualityPreset.MEDIUM -> "Medium"
                        QualityPreset.HIGH -> "High"
                    }
                    val selected = settings.quality == preset
                    if (selected) {
                        Button(
                            onClick = { onQuality(preset) },
                            modifier = Modifier.heightIn(min = 48.dp),
                        ) { Text(label) }
                    } else {
                        OutlinedButton(
                            onClick = { onQuality(preset) },
                            modifier = Modifier.heightIn(min = 48.dp),
                        ) { Text(label) }
                    }
                }
            }
            Text(UiStrings.t("settings.joystickSide"))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                JoystickSide.entries.forEach { side ->
                    val label = if (side == JoystickSide.LEFT) "Left" else "Right"
                    val selected = settings.joystickSide == side
                    if (selected) {
                        Button(onClick = { onJoystickSide(side) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    } else {
                        OutlinedButton(onClick = { onJoystickSide(side) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    }
                }
            }
            Text(UiStrings.t("settings.joystickSize"))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GameSettings.SCALE_OPTIONS.forEach { scale ->
                    val label = when (scale) {
                        0.75f -> "S"
                        1.25f -> "L"
                        else -> "M"
                    }
                    val selected = settings.joystickScale == scale
                    if (selected) {
                        Button(onClick = { onJoystickScale(scale) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    } else {
                        OutlinedButton(onClick = { onJoystickScale(scale) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(UiStrings.t("settings.tapToMove"), fontWeight = FontWeight.SemiBold)
                    Text(UiStrings.t("settings.tapToMoveHint"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.tapToMove, onCheckedChange = onTapToMove)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        if (saveStatus.cloudPendingUpload) "Cloud sync · pending" else "Cloud sync",
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        buildString {
                            append(
                                if (cloudAvailable) {
                                    "Optional anonymous link. Newest checksummed save wins; local play works with this off."
                                } else {
                                    "Optional. Add fish.firebase.* to local.properties (see local.properties.example). Local saves still work offline."
                                },
                            )
                            if (saveStatus.cloudPendingUpload) {
                                append(" Pending upload will retry when online.")
                            }
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.cloudSyncEnabled, onCheckedChange = onCloudSync)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        if (settings.analyticsConsent && analyticsAlertActive) {
                            "Analytics · alert"
                        } else {
                            "Analytics"
                        },
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        buildString {
                            append(
                                "Privacy-safe events only (tutorial, first sale, harbors, offline, save recovery, frame timing, sessions). Never includes account ids, bag contents, or full saves.",
                            )
                            if (settings.analyticsConsent && analyticsAlertActive) {
                                append(" Stability alert: crash-free session rate below 99%.")
                            }
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.analyticsConsent, onCheckedChange = onAnalyticsConsent)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        UiStrings.t("settings.dailyReminders"),
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        UiStrings.t("settings.dailyRemindersHint"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(
                    checked = settings.dailyGoalRemindersEnabled,
                    onCheckedChange = { enabled ->
                        if (enabled) {
                            com.willio.jeanvilma.fishshopping.push.DailyGoalReminderNotifier.ensureChannel(context)
                            if (android.os.Build.VERSION.SDK_INT >= 33) {
                                val act = context as? android.app.Activity
                                if (act != null &&
                                    androidx.core.content.ContextCompat.checkSelfPermission(
                                        act,
                                        android.Manifest.permission.POST_NOTIFICATIONS,
                                    ) != android.content.pm.PackageManager.PERMISSION_GRANTED
                                ) {
                                    androidx.core.app.ActivityCompat.requestPermissions(
                                        act,
                                        arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                                        1818,
                                    )
                                }
                            }
                        }
                        onDailyGoalReminders(enabled)
                    },
                )
            }
            OutlinedButton(
                onClick = onAccessibilityPreset,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) {
                Text(UiStrings.t("settings.a11yPreset"))
            }
            Text(UiStrings.t("settings.a11yHint"),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(UiStrings.t("settings.reducedMotion"), fontWeight = FontWeight.SemiBold)
                    Text(UiStrings.t("settings.reducedMotionHint"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.reducedMotion, onCheckedChange = onReducedMotion)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(UiStrings.t("settings.captions"), fontWeight = FontWeight.SemiBold)
                    Text(UiStrings.t("settings.captionsHint"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.captionsEnabled, onCheckedChange = onCaptions)
            }
            Text(UiStrings.t("settings.hudTextSize"))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GameSettings.HUD_TEXT_SCALE_OPTIONS.forEach { step ->
                    val label = when (step) {
                        1.15f -> "Med"
                        1.3f -> "Large"
                        else -> "Default"
                    }
                    val selected = settings.hudTextScale == step
                    if (selected) {
                        Button(onClick = { onHudTextScale(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    } else {
                        OutlinedButton(onClick = { onHudTextScale(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(UiStrings.t("settings.shapeCues"), fontWeight = FontWeight.SemiBold)
                    Text(UiStrings.t("settings.shapeCuesHint"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.shapeCues, onCheckedChange = onShapeCues)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(UiStrings.t("settings.timingMeter"), fontWeight = FontWeight.SemiBold)
                    Text(UiStrings.t("settings.timingMeterHint"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.timingAssist, onCheckedChange = onTimingAssist)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(UiStrings.t("settings.balanceStrip"), fontWeight = FontWeight.SemiBold)
                    Text(UiStrings.t("settings.balanceStripHint"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.showBalanceStrip, onCheckedChange = onBalanceStrip)
            }
            Text(UiStrings.t("settings.saveStatus"), fontWeight = FontWeight.SemiBold)
            Text(
                buildString {
                    append(if (saveStatus.persistent) "Local slots: latest + previous backup." else "Memory-only (storage unavailable).")
                    append(" ")
                    append(saveStatus.lastSavedLabel)
                    append(
                        when {
                            !saveStatus.cloudEnabled -> " · Cloud off"
                            !saveStatus.cloudAvailable -> " · Cloud on, keys missing"
                            saveStatus.cloudLinked && saveStatus.cloudPendingUpload ->
                                " · Cloud linked · pending upload"
                            saveStatus.cloudLinked -> " · Cloud linked"
                            else -> " · Cloud on, linking…"
                        },
                    )
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            Text(UiStrings.t("settings.controls"), fontWeight = FontWeight.SemiBold)
            Text(
                ControlQa.controlsHelpLine(),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            Text(UiStrings.t("settings.telemetry"), fontWeight = FontWeight.SemiBold)
            Text(UiStrings.t("settings.telemetryHint"),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            Text(
                buildString {
                    append("Abandon ${telemetryRates.abandonPermille / 10}%")
                    append(" · Wage ${telemetryRates.wageRatioPermille / 10}%")
                    val top = telemetryRates.topSpecies.firstOrNull()
                    if (top != null) append(" · Top ${top.name} ${top.sharePermille / 10}%")
                    else append(" · No catches yet")
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.secondary,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        val json = onExportTelemetry()
                        exportNote = if (json != null) {
                            copyTextToClipboard(context, "Fish Shopping telemetry", json)
                            "Play stats copied"
                        } else {
                            "Start a harbor to export play stats"
                        }
                    },
                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                ) { Text(UiStrings.t("settings.copyStats")) }
                OutlinedButton(
                    onClick = {
                        val json = onExportBalance()
                        exportNote = if (json != null) {
                            copyTextToClipboard(context, "Fish Shopping balance", json)
                            "Balance knobs copied"
                        } else {
                            "Balance export unavailable"
                        }
                    },
                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                ) { Text(UiStrings.t("settings.copyBalance")) }
            }
            OutlinedButton(
                onClick = {
                    val json = onExportAnalyticsDashboard()
                    copyTextToClipboard(context, "Fish Shopping analytics dashboard", json)
                    exportNote = "Analytics dashboard copied"
                },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) { Text(UiStrings.t("settings.copyAnalytics")) }
            exportNote?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary) }
            Text(UiStrings.t("settings.progress"), fontWeight = FontWeight.SemiBold)
            Button(
                onClick = { showAchievements = true },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) {
                Text(buildString { append("Achievements ("); append((unlockedAchievementsCount).toString()); append("/"); append((achievements.size).toString()); append(")") })
            }
            Text(UiStrings.t("settings.legal"), fontWeight = FontWeight.SemiBold)
            Text(
                StoreListing.SHORT_DESCRIPTION,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            Text(
                com.willio.jeanvilma.fishshopping.core.store.SupportRunbook.RESTORE_HELP_LINE,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { openHttpUrl(context, StoreListing.PRIVACY_POLICY_URL) },
                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                ) { Text(UiStrings.t("landing.ctaPrivacy")) }
                OutlinedButton(
                    onClick = {
                        openHttpUrl(
                            context,
                            com.willio.jeanvilma.fishshopping.core.store.SupportRunbook.SUPPORT_RESTORE_URL,
                        )
                    },
                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                ) {
                    Text(com.willio.jeanvilma.fishshopping.core.store.SupportRunbook.SETTINGS_SUPPORT_LABEL)
                }
            }
            OutlinedButton(
                onClick = { showLicenses = true },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) { Text(UiStrings.t("settings.licenses")) }
        }
    }
}

@Composable
internal fun AchievementsPanel(
    achievements: List<com.willio.jeanvilma.fishshopping.core.sim.AchievementView>,
    unlockedCount: Int,
    onClose: () -> Unit,
) {
    Surface(
        Modifier
            .managementSheet(maxWidth = 400.dp, maxHeight = 520.dp)
            .a11yPane("achievements.title")
            .then(rememberSheetClicks()),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    UiStrings.t("achievements.title"),
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f).semantics { heading() },
                )
                Text(
                    UiStrings.t(
                        "achievements.count",
                        mapOf("unlocked" to unlockedCount, "total" to achievements.size),
                    ),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(end = 8.dp),
                )
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(UiStrings.t("common.back"))
                }
            }
            Text(UiStrings.t("achievements.lifetimeHint"),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            LazyColumn(
                modifier = Modifier.weight(1f, fill = false).heightIn(max = 360.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(achievements, key = { it.id }) { a ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(a.name, fontWeight = FontWeight.SemiBold)
                            Text(
                                a.category,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                            )
                            Text(
                                a.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            )
                            if (a.rewardCoins > 0) {
                                Text(UiStrings.t("achievements.rewardCoins", mapOf("amount" to a.rewardCoins)),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                            if (a.status == "active") {
                                LinearProgressIndicator(
                                    progress = {
                                        if (a.goalAtLeast <= 0L) 0f
                                        else (a.progress.toFloat() / a.goalAtLeast.toFloat()).coerceIn(0f, 1f)
                                    },
                                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                )
                            }
                        }
                        Text(
                            if (a.status == "unlocked") "Done" else "${a.progress}/${a.goalAtLeast}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (a.status == "unlocked") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }
        }
    }
}

@Composable
internal fun LicensesPanel(onClose: () -> Unit) {
    Surface(
        Modifier
            .managementSheet(maxWidth = 400.dp, maxHeight = 520.dp)
            .then(rememberSheetClicks())
            .a11yPane("panels.licenses"),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    UiStrings.t("panels.licenses"),
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text(UiStrings.t("common.close")) }
            }
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 420.dp)
                    .semantics { contentDescription = UiStrings.t("a11y.licensesSection") },
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item {
                    Text(
                        UiStrings.t("settings.licensesIntro"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
                    )
                }
                item {
                    Text(UiStrings.t("settings.firstPartyAssets"), fontWeight = FontWeight.SemiBold)
                    Text(UiStrings.t("settings.licenseRef"),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                items(LicensesNotice.OSS_NOTICES, key = { it.id }) { notice ->
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(notice.headline(), fontWeight = FontWeight.SemiBold)
                        Text(notice.notice, style = MaterialTheme.typography.bodySmall)
                        Text(
                            notice.url,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }
        }
    }
}
