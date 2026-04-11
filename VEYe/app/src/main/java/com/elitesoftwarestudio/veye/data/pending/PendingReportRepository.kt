package com.elitesoftwarestudio.veye.data.pending

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

enum class PendingReportStatus {
    Sending,
    Success,
    Error,
}

data class PendingReport(
    val id: String,
    val rezon: String,
    val name: String,
    val status: PendingReportStatus,
    val createdAt: Long,
)

/**
 * In-memory queue (RN `PendingReportContext`). Call from Report flow when implemented.
 * Success rows auto-remove after 3s like RN.
 */
@Singleton
class PendingReportRepository @Inject constructor() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val _pendingReports = MutableStateFlow<List<PendingReport>>(emptyList())
    val pendingReports: StateFlow<List<PendingReport>> = _pendingReports.asStateFlow()

    private var counter = 0

    fun addPendingReport(rezon: String, name: String): String {
        val id = "pending-${System.currentTimeMillis()}-${++counter}"
        val row =
            PendingReport(
                id = id,
                rezon = rezon,
                name = name,
                status = PendingReportStatus.Sending,
                createdAt = System.currentTimeMillis(),
            )
        _pendingReports.update { listOf(row) + it }
        return id
    }

    fun updateReportStatus(id: String, status: PendingReportStatus) {
        _pendingReports.update { list -> list.map { if (it.id == id) it.copy(status = status) else it } }
        if (status == PendingReportStatus.Success) {
            scope.launch {
                delay(3_000)
                removePendingReport(id)
            }
        }
    }

    fun removePendingReport(id: String) {
        _pendingReports.update { list -> list.filter { it.id != id } }
    }
}
