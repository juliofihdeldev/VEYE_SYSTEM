package com.elitesoftwarestudio.veye.ui.alerts

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.ui.components.DetailErrorState

@Composable
fun AlertDetailNavScreen(
    onBack: () -> Unit,
    onNavigateToReport: () -> Unit,
    viewModel: AlertDetailNavViewModel = hiltViewModel(),
) {
    val alert by viewModel.alert.collectAsStateWithLifecycle()
    val loadFinished by viewModel.loadFinished.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()
    val session by viewModel.mapSession.collectAsStateWithLifecycle()

    BackHandler(enabled = true, onBack = onBack)

    when {
        // Show real content the moment we have any alert (cached or fresh).
        // A failed background refresh no longer turns this into a dead-end.
        alert != null -> {
            AlertDetailScreen(
                alert = alert,
                onDismiss = onBack,
                commentsRepository = viewModel.commentsRepository,
                mapSession = session,
                onReportFromAlert = { a ->
                    viewModel.stageReportPrefill(a)
                    onBack()
                    onNavigateToReport()
                },
            )
        }
        !loadFinished -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        else -> {
            val isNotFound = errorMessage == "not_found"
            DetailErrorState(
                title = stringResource(R.string.alert_detail_unavailable_title),
                message = stringResource(
                    if (isNotFound) {
                        R.string.alert_detail_not_found_message
                    } else {
                        R.string.alert_detail_load_failed_message
                    },
                ),
                rawError = errorMessage,
                onRetry = { viewModel.retry() },
                onBack = onBack,
            )
        }
    }
}
