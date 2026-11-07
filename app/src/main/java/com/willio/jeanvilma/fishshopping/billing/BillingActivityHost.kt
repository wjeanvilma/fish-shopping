package com.willio.jeanvilma.fishshopping.billing

import android.app.Activity
import java.lang.ref.WeakReference

/** Holds the foreground Activity for Play Billing launchBillingFlow. */
object BillingActivityHost {
    @Volatile
    private var ref: WeakReference<Activity>? = null

    fun attach(activity: Activity) {
        ref = WeakReference(activity)
    }

    fun detach(activity: Activity) {
        if (ref?.get() === activity) {
            ref = null
        }
    }

    fun current(): Activity? = ref?.get()
}
