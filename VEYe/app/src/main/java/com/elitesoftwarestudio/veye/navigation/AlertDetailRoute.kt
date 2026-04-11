package com.elitesoftwarestudio.veye.navigation

import android.net.Uri

object AlertDetailRoute {
    const val ROUTE = "alert_detail/{alertId}"

    fun create(alertId: String): String = "alert_detail/${Uri.encode(alertId)}"
}
