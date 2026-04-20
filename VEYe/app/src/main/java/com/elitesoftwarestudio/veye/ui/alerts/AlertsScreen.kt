package com.elitesoftwarestudio.veye.ui.alerts

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.map.AlertsListFilter
import com.elitesoftwarestudio.veye.data.map.ViktimAlert
import com.elitesoftwarestudio.veye.ui.components.FilterPillItem
import com.elitesoftwarestudio.veye.ui.components.FilterPillRow
import com.elitesoftwarestudio.veye.ui.components.ScreenHeader
import com.elitesoftwarestudio.veye.ui.components.StatTileEntry
import com.elitesoftwarestudio.veye.ui.components.StatTileRow
import com.elitesoftwarestudio.veye.ui.theme.SeverityKind
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing
import com.elitesoftwarestudio.veye.ui.theme.severityAccent
import com.elitesoftwarestudio.veye.ui.theme.severityFromAlertType

@Composable
fun AlertsScreen(
    modifier: Modifier = Modifier,
    viewModel: AlertsViewModel = hiltViewModel(),
    onNavigateToReport: () -> Unit = {},
) {
    val context = LocalContext.current
    val session by viewModel.mapSession.collectAsStateWithLifecycle()
    val alerts by viewModel.alerts.collectAsStateWithLifecycle()
    val filter by viewModel.filter.collectAsStateWithLifecycle()
    val loading by viewModel.loading.collectAsStateWithLifecycle()

    var selectedAlert by remember { mutableStateOf<ViktimAlert?>(null) }

    LaunchedEffect(Unit) {
        viewModel.refreshUserLocation()
    }

    val severityCounts = remember(alerts) {
        alerts
            .groupingBy { severityFromAlertType(it.type, it.status) }
            .eachCount()
    }

    val filterItems =
        remember(filter, alerts.size) {
            listOf(
                FilterPillItem(
                    key = AlertsListFilter.All.name,
                    label = stringResource_(context, R.string.alerts_filter_all),
                    count = if (filter == AlertsListFilter.All) alerts.size else null,
                ),
                FilterPillItem(
                    key = AlertsListFilter.Kidnaping.name,
                    label = stringResource_(context, R.string.alerts_filter_kidnapped),
                    selectedContainer = severityAccent(SeverityKind.Kidnapping),
                ),
                FilterPillItem(
                    key = AlertsListFilter.Disparut.name,
                    label = stringResource_(context, R.string.alerts_filter_missing),
                    selectedContainer = severityAccent(SeverityKind.Missing),
                ),
                FilterPillItem(
                    key = AlertsListFilter.Released.name,
                    label = stringResource_(context, R.string.alerts_filter_released),
                    selectedContainer = severityAccent(SeverityKind.Released),
                ),
                FilterPillItem(
                    key = AlertsListFilter.Danger.name,
                    label = stringResource_(context, R.string.alerts_filter_shooting),
                    selectedContainer = severityAccent(SeverityKind.Shooting),
                ),
            )
        }

    Column(
        modifier = modifier.fillMaxSize(),
    ) {
        ScreenHeader(
            title = stringResource(R.string.tab_alerts),
            subtitle = stringResource(R.string.alerts_subtitle_simple, alerts.size),
        )

        StatTileRow(
            items =
                listOf(
                    StatTileEntry(
                        kind = SeverityKind.Kidnapping,
                        count = severityCounts[SeverityKind.Kidnapping] ?: 0,
                    ),
                    StatTileEntry(
                        kind = SeverityKind.Missing,
                        count = severityCounts[SeverityKind.Missing] ?: 0,
                    ),
                    StatTileEntry(
                        kind = SeverityKind.Released,
                        count = severityCounts[SeverityKind.Released] ?: 0,
                    ),
                ),
            modifier =
                Modifier.padding(
                    start = VEyeSpacing.md,
                    end = VEyeSpacing.md,
                    top = VEyeSpacing.xs,
                    bottom = VEyeSpacing.sm,
                ),
        )

        FilterPillRow(
            items = filterItems,
            selectedKey = filter.name,
            onSelect = { key ->
                runCatching { AlertsListFilter.valueOf(key) }
                    .getOrNull()
                    ?.let(viewModel::setFilter)
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = VEyeSpacing.sm),
        )

        Box(
            modifier =
                Modifier
                    .weight(1f)
                    .fillMaxWidth(),
        ) {
            when {
                loading && alerts.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize().padding(48.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator()
                            Text(
                                text = stringResource(R.string.common_loading),
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 12.dp),
                            )
                        }
                    }
                }
                alerts.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize().padding(40.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = stringResource(R.string.alerts_no_alerts_found),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                else -> {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding =
                            PaddingValues(
                                start = VEyeSpacing.md,
                                end = VEyeSpacing.md,
                                top = VEyeSpacing.xs,
                                bottom = VEyeSpacing.lg,
                            ),
                        verticalArrangement = Arrangement.spacedBy(VEyeSpacing.sm),
                    ) {
                        items(
                            items = alerts,
                            key = { it.id },
                        ) { item ->
                            AlertListCard(
                                alert = item,
                                userLat = session.latitude,
                                userLon = session.longitude,
                                onOpenDetail = { selectedAlert = item },
                            )
                        }
                        item { Spacer(Modifier.height(VEyeSpacing.xl)) }
                    }
                }
            }
        }
    }

    AlertDetailScreen(
        alert = selectedAlert,
        onDismiss = { selectedAlert = null },
        commentsRepository = viewModel.commentsRepository,
        mapSession = session,
        onReportFromAlert = { alert ->
            viewModel.stageReportPrefill(alert)
            selectedAlert = null
            onNavigateToReport()
        },
    )
}

private fun stringResource_(
    context: android.content.Context,
    @androidx.annotation.StringRes id: Int,
): String = context.getString(id)
