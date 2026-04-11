package com.elitesoftwarestudio.veye.ui.alerts

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.R

@Composable
fun AlertDetailNavScreen(
    onBack: () -> Unit,
    onNavigateToReport: () -> Unit,
    viewModel: AlertDetailNavViewModel = hiltViewModel(),
) {
    val alert by viewModel.alert.collectAsStateWithLifecycle()
    val loadFinished by viewModel.loadFinished.collectAsStateWithLifecycle()
    val session by viewModel.mapSession.collectAsStateWithLifecycle()

    BackHandler(enabled = alert == null || !loadFinished, onBack = onBack)

    when {
        !loadFinished -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        alert == null -> {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = stringResource(R.string.map_no_detail),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(24.dp),
                )
            }
        }
        else -> {
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
    }
}
