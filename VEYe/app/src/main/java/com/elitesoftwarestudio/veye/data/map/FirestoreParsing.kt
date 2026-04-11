package com.elitesoftwarestudio.veye.data.map

import com.google.firebase.firestore.DocumentSnapshot

internal fun Any?.asDouble(): Double? = when (this) {
    is Number -> this.toDouble().takeIf { it.isFinite() }
    is String -> this.toDoubleOrNull()
    else -> null
}

internal fun DocumentSnapshot.parseDangerZone(): DangerZone =
    DangerZone(
        id = id,
        name = getString("name"),
        latitude = get("latitude").asDouble(),
        longitude = get("longitude").asDouble(),
        rezon = getString("rezon"),
        date = get("date"),
        incidentType = getString("incidentType"),
        tag = getString("tag"),
    )

internal fun DocumentSnapshot.parseViktimMapRow(): ViktimMapRow =
    ViktimMapRow(
        id = id,
        fullName = getString("fullName"),
        status = getString("status"),
        city = getString("city"),
        details = getString("details"),
        type = getString("type"),
        date = get("date"),
        latitude = get("latitude").asDouble(),
        longitude = get("longitude").asDouble(),
    )

internal fun DocumentSnapshot.parseViktimAlert(): ViktimAlert =
    ViktimAlert(
        id = id,
        fullName = getString("fullName"),
        status = getString("status"),
        city = getString("city"),
        details = getString("details"),
        amount = formatAmountField(get("amount")),
        imageSource = getString("imageSource"),
        type = getString("type"),
        date = get("date"),
        latitude = get("latitude").asDouble(),
        longitude = get("longitude").asDouble(),
    )

private fun formatAmountField(raw: Any?): String? {
    if (raw == null) return null
    if (raw is String) return raw.ifBlank { null }
    if (raw is Number) return raw.toLong().toString()
    return raw.toString().ifBlank { null }
}
