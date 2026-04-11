package com.elitesoftwarestudio.veye.ui.zones

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.R
import com.elitesoftwarestudio.veye.data.pending.PendingReport
import com.elitesoftwarestudio.veye.data.pending.PendingReportStatus

private val SuccessGreen = Color(0xFF22C55E)
private val IgBlue = Color(0xFF0095F6)

/** RN `PendingReportCard` — accent bar shimmers while sending; close clears error rows. */
@Composable
fun PendingReportCard(
    report: PendingReport,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val barColor =
        when (report.status) {
            PendingReportStatus.Success -> SuccessGreen
            PendingReportStatus.Error -> MaterialTheme.colorScheme.error
            PendingReportStatus.Sending -> IgBlue
        }

    val (statusIcon, statusText) =
        when (report.status) {
            PendingReportStatus.Sending ->
                Icons.Outlined.Schedule to stringResource(R.string.pending_report_sending)
            PendingReportStatus.Success ->
                Icons.Filled.CheckCircle to stringResource(R.string.pending_report_success)
            PendingReportStatus.Error ->
                Icons.Outlined.ErrorOutline to stringResource(R.string.pending_report_error)
        }

    Card(
        modifier =
            modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 5.dp),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .height(IntrinsicSize.Min),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (report.status == PendingReportStatus.Sending) {
                ShimmerAccentBar(baseColor = barColor)
            } else {
                Box(
                    modifier =
                        Modifier
                            .width(4.dp)
                            .fillMaxHeight()
                            .background(barColor),
                )
            }
            Column(Modifier.padding(12.dp).weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 4.dp)) {
                    Icon(statusIcon, contentDescription = null, tint = barColor, modifier = Modifier.padding(end = 6.dp))
                    Text(
                        text = statusText,
                        style = MaterialTheme.typography.labelLarge,
                        color = barColor,
                        modifier = Modifier.weight(1f),
                    )
                    if (report.status != PendingReportStatus.Sending) {
                        IconButton(onClick = onDismiss) {
                            Icon(
                                Icons.Filled.Close,
                                contentDescription = stringResource(android.R.string.cancel),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                Text(
                    text = report.rezon,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                )
                if (report.status == PendingReportStatus.Sending) {
                    SendingProgressTrack()
                }
            }
        }
    }
}

@Composable
private fun ShimmerAccentBar(baseColor: Color) {
    val infinite = rememberInfiniteTransition(label = "pendingBar")
    val alpha by infinite.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec =
            infiniteRepeatable(
                animation = tween(900, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse,
            ),
        label = "barShimmer",
    )
    Box(
        modifier =
            Modifier
                .width(4.dp)
                .fillMaxHeight()
                .background(baseColor.copy(alpha = alpha)),
    )
}

@Composable
private fun SendingProgressTrack() {
    val infinite = rememberInfiniteTransition(label = "pendingTrack")
    val frac by infinite.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec =
            infiniteRepeatable(
                animation = tween(900, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse,
            ),
        label = "trackShimmer",
    )
    Box(
        modifier =
            Modifier
                .fillMaxWidth()
                .height(3.dp)
                .padding(top = 8.dp)
                .background(
                    MaterialTheme.colorScheme.outline.copy(alpha = 0.25f),
                    RoundedCornerShape(2.dp),
                ),
    ) {
        Box(
            modifier =
                Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(frac)
                    .background(IgBlue.copy(alpha = frac.coerceIn(0.35f, 1f)), RoundedCornerShape(2.dp)),
        )
    }
}
