package com.elitesoftwarestudio.veye.data.map

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** PostgREST row for `public.zone_danger` (snake_case columns). */
@Serializable
internal data class ZoneDangerRow(
    val id: String,
    val name: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val rezon: String? = null,
    val date: String? = null,
    @SerialName("incident_type") val incidentType: String? = null,
    val tag: String? = null,
) {
    fun toDangerZone(): DangerZone =
        DangerZone(
            id = id,
            name = name,
            latitude = latitude,
            longitude = longitude,
            rezon = rezon,
            date = date,
            incidentType = incidentType,
            tag = tag,
        )
}

/** PostgREST row for `public.viktim` (snake_case columns). */
@Serializable
internal data class ViktimRow(
    val id: String,
    @SerialName("full_name") val fullName: String? = null,
    val status: String? = null,
    val city: String? = null,
    val details: String? = null,
    val amount: String? = null,
    @SerialName("image_source") val imageSource: String? = null,
    val type: String? = null,
    val date: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
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

    fun toAlert(): ViktimAlert =
        ViktimAlert(
            id = id,
            fullName = fullName,
            status = status,
            city = city,
            details = details,
            amount = amount?.ifBlank { null },
            imageSource = imageSource,
            type = type,
            date = date,
            latitude = latitude,
            longitude = longitude,
        )
}
