package com.elitesoftwarestudio.veye.ui.map

import com.elitesoftwarestudio.veye.data.map.DangerZone

/**
 * Parity with RN `dangerZoneMapIcon.ts` — `mapIcon` names and `colorForDangerMapIcon` hex values.
 */
enum class DangerMapPinIcon {
    Pistol,
    Car,
    Fire,
}

fun incidentSlugFromZone(zone: DangerZone): String {
    val raw = zone.incidentType ?: zone.tag
    if (!raw.isNullOrBlank()) {
        return raw.trim().lowercase().replace("\\s+".toRegex(), "_").replace("-", "_")
    }
    val m = Regex("^\\[([^]]+)]").find(zone.rezon ?: "")?.groupValues?.getOrNull(1)
    return (m ?: "other").lowercase().replace("\\s+".toRegex(), "_").replace("-", "_")
}

fun mapIconForIncidentSlug(slug: String): DangerMapPinIcon {
    val s = slug.lowercase()
    if (
        s == "road_block" ||
        s.contains("road_block") ||
        s.contains("traffic") ||
        s.contains("blockade")
    ) {
        return DangerMapPinIcon.Car
    }
    if (
        s == "shooting" ||
        s.contains("shoot") ||
        s == "kidnapping" ||
        s == "robbery" ||
        s == "gang_activity" ||
        s == "violence" ||
        s == "police_operation" ||
        s.contains("gun") ||
        s.contains("arm")
    ) {
        return DangerMapPinIcon.Pistol
    }
    if (s.contains("fire") || s.contains("arson") || s.contains("burn")) {
        return DangerMapPinIcon.Fire
    }
    return DangerMapPinIcon.Fire
}

fun dangerPinIconForZone(zone: DangerZone): DangerMapPinIcon =
    mapIconForIncidentSlug(incidentSlugFromZone(zone))

/** RN `colorForDangerMapIcon` (pistol → `COLORS.severityCritical` #C41E3A). */
fun pinFillColorArgb(icon: DangerMapPinIcon): Int =
    when (icon) {
        DangerMapPinIcon.Pistol -> 0xFFC41E3A.toInt()
        DangerMapPinIcon.Car -> 0xFFCA8A04.toInt()
        DangerMapPinIcon.Fire -> 0xFFEA580C.toInt()
    }
