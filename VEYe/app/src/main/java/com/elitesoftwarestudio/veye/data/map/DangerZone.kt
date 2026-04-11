package com.elitesoftwarestudio.veye.data.map

data class DangerZone(
    val id: String,
    val name: String?,
    val latitude: Double?,
    val longitude: Double?,
    val rezon: String?,
    override val date: Any?,
    val incidentType: String?,
    val tag: String?,
) : MapTimedRow
