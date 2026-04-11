package com.elitesoftwarestudio.veye.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Place
import androidx.compose.ui.graphics.vector.ImageVector
import com.elitesoftwarestudio.veye.R

enum class MainDestination(
    val route: String,
    @get:StringRes val labelRes: Int,
    val icon: ImageVector,
    val isReportFab: Boolean = false,
) {
    Map("map", R.string.tab_map, Icons.Outlined.Map),
    Alerts("alerts", R.string.tab_alerts, Icons.Outlined.Notifications),
    Report("report", R.string.tab_report, Icons.Filled.AddCircle, isReportFab = true),
    Zones("zones", R.string.tab_zones, Icons.Outlined.Place),
    Profile("profile", R.string.tab_profile, Icons.Outlined.Person),
}
