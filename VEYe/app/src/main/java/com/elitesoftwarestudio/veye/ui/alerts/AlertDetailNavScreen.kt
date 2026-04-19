package com.elitesoftwarestudio.veye.ui.alerts

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ReportProblem
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.ui.components.PrimaryPillButton
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing

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
            AlertDetailErrorState(
                message = errorMessage,
                onRetry = { viewModel.retry() },
                onBack = onBack,
            )
        }
    }
}

@Composable
private fun AlertDetailErrorState(
    message: String?,
    onRetry: () -> Unit,
    onBack: () -> Unit,
) {
    val isNotFound = message == "not_found"
    val bodyRes =
        if (isNotFound) {
            R.string.alert_detail_not_found_message
        } else {
            R.string.alert_detail_load_failed_message
        }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .align(Alignment.TopStart)
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(VEyeSpacing.sm),
        ) {
            Icon(
                imageVector = Icons.Outlined.Close,
                contentDescription = stringResource(R.string.common_close),
                tint = MaterialTheme.colorScheme.onSurface,
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.Center)
                .padding(horizontal = VEyeSpacing.lg),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(96.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Outlined.ReportProblem,
                    contentDescription = null,
                    modifier = Modifier.size(40.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(Modifier.height(VEyeSpacing.lg))

            Text(
                text = stringResource(R.string.alert_detail_unavailable_title),
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(VEyeSpacing.sm))

            Text(
                text = stringResource(bodyRes),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(VEyeSpacing.xl))

            PrimaryPillButton(
                label = stringResource(R.string.common_retry),
                onClick = onRetry,
                trailingIcon = null,
            )

            Spacer(Modifier.height(VEyeSpacing.sm))

            OutlinedButton(
                onClick = onBack,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
            ) {
                Text(text = stringResource(R.string.common_go_back))
            }

            Spacer(Modifier.height(VEyeSpacing.lg))

            // Surface raw exception messages quietly for power users / QA without
            // overwhelming the friendly copy above.
            if (!isNotFound && !message.isNullOrBlank() && message != "generic") {
                Text(
                    text = message,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}
