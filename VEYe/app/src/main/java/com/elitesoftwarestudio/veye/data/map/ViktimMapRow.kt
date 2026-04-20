package com.elitesoftwarestudio.veye.data.map

data class ViktimMapRow(
    val id: String,
    val fullName: String?,
    val status: String?,
    val city: String?,
    val details: String?,
    val type: String?,
    val date: Any?,
    val latitude: Double?,
    val longitude: Double?,
)
