package com.elitesoftwarestudio.veye.ui.util

import android.content.res.Configuration

/** Stable key for Compose when app locale changes (minSdk 26). */
fun Configuration.localeKey(): String =
    locales.get(0)?.toLanguageTag().orEmpty()
