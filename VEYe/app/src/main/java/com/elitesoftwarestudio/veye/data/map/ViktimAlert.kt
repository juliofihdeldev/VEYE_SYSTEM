package com.elitesoftwarestudio.veye.data.map

/**
 * Full `Viktim` document for Alerts tab (RN `AlertsList` / `AlertCard` / `AlertDetails`).
 */
data class ViktimAlert(
    val id: String,
    val fullName: String?,
    val status: String?,
    val city: String?,
    val details: String?,
    val amount: String?,
    val imageSource: String?,
    val type: String?,
    val date: Any?,
    val latitude: Double?,
    val longitude: Double?,
) {
    fun toMapRow(): ViktimMapRow =
        ViktimMapRow(
            id = id,
            fullName = fullName,
            status = status,
            city = city,
            details = details,
            type = type,
            date = date,
            latitude = latitude,
            longitude = longitude,
        )
}

enum class AlertsListFilter {
    All,
    Kidnaping,
    Disparut,
    Released,
    Danger,
}
