package com.elitesoftwarestudio.veye.ui.alerts

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import android.content.Intent
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.map.AlertsListFilter
import com.elitesoftwarestudio.veye.data.map.ViktimAlert

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

    Column(
        modifier =
            modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(top = 8.dp),
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = stringResource(R.string.missing_people_title),
                    style =
                        MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Black),
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(12.dp),
                )
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.error,
                    shadowElevation = 2.dp,
                    tonalElevation = 0.dp,
                ) {
                    Text(
                        text = "${alerts.size}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onError,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    )
                }
            }
            Row(
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                AlertsFilterChip(
                    label = stringResource(R.string.alerts_filter_all),
                    selected = filter == AlertsListFilter.All,
                    onClick = { viewModel.setFilter(AlertsListFilter.All) },
                )
                AlertsFilterChip(
                    label = stringResource(R.string.alerts_filter_kidnapped),
                    selected = filter == AlertsListFilter.Kidnaping,
                    selectedContainer = MaterialTheme.colorScheme.error,
                    selectedLabel = Color.White,
                    onClick = { viewModel.setFilter(AlertsListFilter.Kidnaping) },
                )
                AlertsFilterChip(
                    label = stringResource(R.string.alerts_filter_missing),
                    selected = filter == AlertsListFilter.Disparut,
                    selectedContainer = Color(0xFFFDE68A),
                    selectedLabel = Color(0xFF333333),
                    onClick = { viewModel.setFilter(AlertsListFilter.Disparut) },
                )
                AlertsFilterChip(
                    label = stringResource(R.string.alerts_filter_released),
                    selected = filter == AlertsListFilter.Released,
                    selectedContainer = Color(0xFF22C55E),
                    selectedLabel = Color.White,
                    onClick = { viewModel.setFilter(AlertsListFilter.Released) },
                )
                AlertsFilterChip(
                    label = stringResource(R.string.alerts_filter_shooting),
                    selected = filter == AlertsListFilter.Danger,
                    selectedContainer = Color(0xFFE85D04),
                    selectedLabel = Color.White,
                    onClick = { viewModel.setFilter(AlertsListFilter.Danger) },
                )
            }
        }

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
                        verticalArrangement = Arrangement.spacedBy(0.dp),
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
                                onShare = {
                                    val msg =
                                        context.getString(
                                            R.string.alert_details_share_message,
                                            item.fullName.orEmpty(),
                                            item.city.orEmpty(),
                                            item.details.orEmpty(),
                                        )
                                    val send =
                                        Intent(Intent.ACTION_SEND).apply {
                                            type = "text/plain"
                                            putExtra(Intent.EXTRA_TEXT, msg)
                                        }
                                    context.startActivity(Intent.createChooser(send, null))
                                },
                            )
                        }
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

@Composable
private fun AlertsFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    selectedContainer: Color = MaterialTheme.colorScheme.primary,
    selectedLabel: Color = MaterialTheme.colorScheme.onPrimary,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = {
            Text(
                text = label,
                color =
                    if (selected) {
                        selectedLabel
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
            )
        },
        colors =
            FilterChipDefaults.filterChipColors(
                selectedContainerColor = selectedContainer,
                selectedLabelColor = selectedLabel,
            ),
    )
}
