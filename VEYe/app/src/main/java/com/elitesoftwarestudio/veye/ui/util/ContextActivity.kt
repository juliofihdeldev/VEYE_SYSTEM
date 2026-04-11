package com.elitesoftwarestudio.veye.ui.util

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper

tailrec fun Context.findActivity(): Activity? {
    if (this is Activity) return this
    if (this is ContextWrapper) return baseContext.findActivity()
    return null
}
