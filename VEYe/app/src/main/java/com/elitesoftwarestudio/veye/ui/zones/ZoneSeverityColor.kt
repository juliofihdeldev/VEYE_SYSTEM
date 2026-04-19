package com.elitesoftwarestudio.veye.ui.zones

import androidx.compose.ui.graphics.Color
import com.elitesoftwarestudio.veye.ui.theme.severityAccent
import com.elitesoftwarestudio.veye.ui.theme.severityFromZoneRezon

/**
 * Zone severity bar color resolved from the central [severityFromZoneRezon] mapping so
 * the colour ladder is identical across cards, pins and lists.
 */
fun zoneSeverityBarColor(rezon: String?): Color =
    severityAccent(severityFromZoneRezon(rezon))
