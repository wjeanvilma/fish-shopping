package com.willio.jeanvilma.fishshopping.core.push

/**
 * Finish 3.0 Phase 18 — pure local daily-goal reminder schedule math.
 * Timezone is an injected offset (minutes east of UTC) so web/Android/tests stay deterministic.
 */
object LocalPushSchedule {
    const val DEFAULT_LOCAL_HOUR = 18
    const val DEFAULT_LOCAL_MINUTE = 0
    const val MS_PER_MINUTE = 60_000L
    const val MS_PER_HOUR = 3_600_000L
    const val MS_PER_DAY = 86_400_000L

    data class Policy(
        val defaultLocalHour: Int = DEFAULT_LOCAL_HOUR,
        val defaultLocalMinute: Int = DEFAULT_LOCAL_MINUTE,
        val requiresUnclaimedGoals: Boolean = true,
        val optInDefault: Boolean = false,
        val channelId: String = "daily_goals",
        val notificationId: Int = 1801,
        val requestCode: Int = 1801,
        val titleKey: String = "push.dailyGoalTitle",
        val bodyKey: String = "push.dailyGoalBody",
        val webStorageLastDayKey: String = "fish-shopping-daily-reminder-last-day",
    )

    /** Local civil day id (days since Unix epoch in the given offset). */
    fun localDayId(epochMs: Long, offsetMinutes: Int): Int {
        val local = epochMs + offsetMinutes.toLong() * MS_PER_MINUTE
        return (local / MS_PER_DAY).toInt()
    }

    /**
     * Next fire at [hour]:[minute] local. If that instant is still ahead today, use today;
     * otherwise tomorrow.
     */
    fun nextFireEpochMs(
        nowMs: Long,
        hour: Int = DEFAULT_LOCAL_HOUR,
        minute: Int = DEFAULT_LOCAL_MINUTE,
        offsetMinutes: Int = 0,
    ): Long {
        require(hour in 0..23) { "hour out of range" }
        require(minute in 0..59) { "minute out of range" }
        val localNow = nowMs + offsetMinutes.toLong() * MS_PER_MINUTE
        val dayStart = (localNow / MS_PER_DAY) * MS_PER_DAY
        val candidateLocal = dayStart + hour.toLong() * MS_PER_HOUR + minute.toLong() * MS_PER_MINUTE
        val fireLocal = if (candidateLocal > localNow) candidateLocal else candidateLocal + MS_PER_DAY
        return fireLocal - offsetMinutes.toLong() * MS_PER_MINUTE
    }

    /** True when an opt-in reminder should present a notification for this local day. */
    fun shouldDeliver(
        enabled: Boolean,
        unclaimedCount: Int,
        lastShownDayId: Int,
        todayDayId: Int,
        requiresUnclaimedGoals: Boolean = true,
    ): Boolean {
        if (!enabled) return false
        if (requiresUnclaimedGoals && unclaimedCount <= 0) return false
        if (lastShownDayId == todayDayId) return false
        return true
    }
}
