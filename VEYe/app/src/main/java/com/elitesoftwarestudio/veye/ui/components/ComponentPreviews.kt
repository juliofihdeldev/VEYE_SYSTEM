package com.elitesoftwarestudio.veye.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AltRoute
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Verified
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.ui.theme.SeverityKind
import com.elitesoftwarestudio.veye.ui.theme.VEYeTheme
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing
import com.elitesoftwarestudio.veye.ui.theme.severityAccent

/**
 * Single source of truth for design-system previews. Each component lives next to it,
 * but Android Studio's preview pane reads them all from this gallery so designers can
 * inspect every reusable widget side-by-side.
 *
 * Add a new @Preview here whenever you ship a new component into [com.elitesoftwarestudio.veye.ui.components].
 */
@Composable
private fun PreviewSurface(content: @Composable () -> Unit) {
    VEYeTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            Box(modifier = Modifier.padding(VEyeSpacing.md)) {
                content()
            }
        }
    }
}

@Preview(name = "SeverityBadge — gallery", showBackground = true, widthDp = 320)
@Composable
private fun PreviewSeverityBadgeGallery() {
    PreviewSurface {
        Column(verticalArrangement = Arrangement.spacedBy(VEyeSpacing.xs)) {
            SeverityKind.values().forEach { kind ->
                SeverityBadge(kind = kind)
            }
            Spacer(modifier = Modifier.height(VEyeSpacing.sm))
            SeverityBadge(kind = SeverityKind.Kidnapping, compact = true)
            MetaTag(label = "verified · 3 sources", leadingDot = severityAccent(SeverityKind.Released))
            MetaTag(label = "1.2 km")
        }
    }
}

@Preview(name = "FilterPill — row", showBackground = true, widthDp = 380)
@Composable
private fun PreviewFilterPillRow() {
    PreviewSurface {
        var selected = "all"
        FilterPillRow(
            items =
                listOf(
                    FilterPillItem(key = "all", label = "All", count = 14),
                    FilterPillItem(key = "near", label = "Near me"),
                    FilterPillItem(key = "24h", label = "Last 24 h"),
                    FilterPillItem(key = "high", label = "Highest"),
                ),
            selectedKey = selected,
            onSelect = { selected = it },
        )
    }
}

@Preview(name = "ScreenHeader", showBackground = true, widthDp = 380)
@Composable
private fun PreviewScreenHeader() {
    PreviewSurface {
        ScreenHeader(
            title = "Danger zones",
            subtitle = "14 active across Port-au-Prince · updated 2 min ago",
            applyStatusBarPadding = false,
        )
    }
}

@Preview(name = "StatTileRow", showBackground = true, widthDp = 380)
@Composable
private fun PreviewStatTileRow() {
    PreviewSurface {
        StatTileRow(
            items =
                listOf(
                    StatTileEntry(SeverityKind.Kidnapping, count = 4),
                    StatTileEntry(SeverityKind.DangerZone, count = 7),
                    StatTileEntry(SeverityKind.Missing, count = 3),
                ),
        )
    }
}

@Preview(name = "SeverityStripeCard — alert", showBackground = true, widthDp = 380)
@Composable
private fun PreviewSeverityStripeCardAlert() {
    PreviewSurface {
        SeverityStripeCard(
            kind = SeverityKind.Kidnapping,
            title = "Kidnapping reported · Delmas 32",
            subtitle = "Marie L., 24",
            body = "Witness saw a black SUV with masked men leaving the area at 3:42 pm.",
            timeLabel = "12 min",
            metrics =
                listOf(
                    SeverityCardMetric(Icons.Outlined.People, "8 witnesses"),
                    SeverityCardMetric(Icons.Outlined.Visibility, "1.2k views"),
                    SeverityCardMetric(Icons.Outlined.Verified, "Verified · 3"),
                ),
            onClick = {},
        )
    }
}

@Preview(name = "SeverityHero", showBackground = true, widthDp = 380)
@Composable
private fun PreviewSeverityHero() {
    PreviewSurface {
        SeverityHero(kind = SeverityKind.Kidnapping, statusLabel = "LIVE")
    }
}

@Preview(name = "ActionTriad", showBackground = true, widthDp = 380)
@Composable
private fun PreviewActionTriad() {
    PreviewSurface {
        ActionTriad(
            actions =
                listOf(
                    ActionButton("Share", Icons.Outlined.Share, onClick = {}, isPrimary = true),
                    ActionButton("Call 114", Icons.Outlined.Phone, onClick = {}),
                    ActionButton("Reroute", Icons.Outlined.AltRoute, onClick = {}),
                ),
        )
    }
}

@Preview(name = "ReportTypePair", showBackground = true, widthDp = 380)
@Composable
private fun PreviewReportTypePair() {
    PreviewSurface {
        ReportTypePair(
            primary =
                ReportTypeTileSpec(
                    kind = SeverityKind.Missing,
                    selected = true,
                    onClick = {},
                    description = "Missing or abducted person",
                ),
            secondary =
                ReportTypeTileSpec(
                    kind = SeverityKind.Info,
                    selected = false,
                    onClick = {},
                    title = "INFO",
                    description = "Tip, witness or update",
                ),
        )
    }
}

@Preview(name = "PinnedLocationCard", showBackground = true, widthDp = 380)
@Composable
private fun PreviewPinnedLocationCard() {
    PreviewSurface {
        PinnedLocationCard(
            locationLabel = "Champ de Mars, Port-au-Prince",
            accuracyLabel = "±18 m",
            mapPreview = {
                Box(
                    modifier =
                        Modifier
                            .fillMaxWidth()
                            .height(132.dp)
                            .background(MaterialTheme.colorScheme.surfaceContainerHighest),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "map preview",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            },
        )
    }
}

@Preview(name = "AnonymousToggleRow", showBackground = true, widthDp = 380)
@Composable
private fun PreviewAnonymousToggleRow() {
    PreviewSurface {
        AnonymousToggleRow(
            title = "Report anonymously",
            description = "Name hidden, position blurred to ±300 m.",
            checked = true,
            onCheckedChange = {},
        )
    }
}

@Preview(name = "PrimaryPillButton", showBackground = true, widthDp = 380)
@Composable
private fun PreviewPrimaryPillButton() {
    PreviewSurface {
        Column(verticalArrangement = Arrangement.spacedBy(VEyeSpacing.sm)) {
            PrimaryPillButton(label = "Continue", onClick = {})
            PrimaryPillButton(
                label = "Open map",
                onClick = {},
                leadingIcon = Icons.Outlined.Map,
                trailingIcon = null,
            )
            PrimaryPillButton(label = "Submit Report", onClick = {}, enabled = false)
        }
    }
}

@Preview(name = "CommentRow", showBackground = true, widthDp = 380)
@Composable
private fun PreviewCommentRow() {
    PreviewSurface {
        Column {
            CommentRow(
                authorName = "Patricia D.",
                timeLabel = "5 min",
                body = "I just walked past — police are already on the scene, traffic is blocked.",
                distanceLabel = "0.4 km",
                verifiedLabel = "✓ verified",
                avatarColor = rememberAvatarColor("Patricia D."),
            )
            CommentRow(
                authorName = "Anonyme",
                timeLabel = "12 min",
                body = "Heard 3 shots near the church around 3:40 pm.",
                avatarColor = rememberAvatarColor("Anonyme"),
            )
        }
    }
}

@Preview(name = "Component gallery — full", showBackground = true, widthDp = 400, heightDp = 1400)
@Composable
private fun PreviewFullGallery() {
    VEYeTheme {
        Surface(color = MaterialTheme.colorScheme.background) {
            Column(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(VEyeSpacing.md),
                verticalArrangement = Arrangement.spacedBy(VEyeSpacing.lg),
            ) {
                Text("Headers", style = MaterialTheme.typography.labelLarge)
                ScreenHeader(
                    title = "Alerts",
                    subtitle = "14 active · updated 2 min ago",
                    applyStatusBarPadding = false,
                )
                Text("Stat tiles", style = MaterialTheme.typography.labelLarge)
                StatTileRow(
                    items =
                        listOf(
                            StatTileEntry(SeverityKind.Kidnapping, 4),
                            StatTileEntry(SeverityKind.DangerZone, 7),
                            StatTileEntry(SeverityKind.Missing, 3),
                        ),
                )
                Text("Filter pills", style = MaterialTheme.typography.labelLarge)
                FilterPillRow(
                    items =
                        listOf(
                            FilterPillItem("all", "All", count = 14),
                            FilterPillItem("near", "Near me"),
                            FilterPillItem("24h", "Last 24 h"),
                        ),
                    selectedKey = "all",
                    onSelect = {},
                )
                Text("Severity card", style = MaterialTheme.typography.labelLarge)
                SeverityStripeCard(
                    kind = SeverityKind.DangerZone,
                    title = "Active danger · Carrefour Feuilles",
                    subtitle = null,
                    body = "Multiple roadblocks reported between 4 pm and 6 pm.",
                    timeLabel = "1 h",
                    metrics =
                        listOf(
                            SeverityCardMetric(Icons.Outlined.People, "12 reports"),
                            SeverityCardMetric(Icons.Outlined.Verified, "Verified · 4"),
                        ),
                )
                Text("Report tiles", style = MaterialTheme.typography.labelLarge)
                ReportTypePair(
                    primary =
                        ReportTypeTileSpec(
                            kind = SeverityKind.Missing,
                            selected = true,
                            onClick = {},
                            description = "Missing or abducted person",
                        ),
                    secondary =
                        ReportTypeTileSpec(
                            kind = SeverityKind.Info,
                            selected = false,
                            onClick = {},
                            title = "INFO",
                            description = "Tip, witness or update",
                        ),
                )
                Text("CTA", style = MaterialTheme.typography.labelLarge)
                PrimaryPillButton(label = "Submit Report", onClick = {})
            }
        }
    }
}
