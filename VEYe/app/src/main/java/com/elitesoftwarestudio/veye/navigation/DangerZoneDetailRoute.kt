package com.elitesoftwarestudio.veye.navigation

import android.net.Uri

object DangerZoneDetailRoute {
    const val ROUTE = "danger_zone_detail/{zoneId}"

    fun create(zoneId: String): String = "danger_zone_detail/${Uri.encode(zoneId)}"
}
