package com.elitesoftwarestudio.veye.data.report

import com.elitesoftwarestudio.veye.data.map.ViktimAlert
import javax.inject.Inject
import javax.inject.Singleton

/** Stages alert context when user opens Report from alert details (RN `relatedAlert`). */
@Singleton
class ReportPrefillRepository @Inject constructor() {
    @Volatile
    private var staged: ViktimAlert? = null

    fun stageFromAlert(alert: ViktimAlert) {
        staged = alert
    }

    fun consumeStagedAlert(): ViktimAlert? {
        val v = staged
        staged = null
        return v
    }
}
