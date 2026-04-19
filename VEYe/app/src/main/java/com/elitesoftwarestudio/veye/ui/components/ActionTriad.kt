package com.elitesoftwarestudio.veye.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.elitesoftwarestudio.veye.ui.theme.VEyeRadius
import com.elitesoftwarestudio.veye.ui.theme.VEyeSpacing

/** Single button in a [ActionTriad]. */
data class ActionButton(
    val label: String,
    val icon: ImageVector,
    val onClick: () -> Unit,
    val isPrimary: Boolean = false,
    val accent: Color? = null,
)

/**
 * The three-equally-weighted action row used in the alert detail mockup
 * ("Share · Call 114 · Reroute"). The first item, when [ActionButton.isPrimary]
 * is true, renders as a filled coral button; the rest are outlined.
 */
@Composable
fun ActionTriad(
    actions: List<ActionButton>,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(VEyeSpacing.xs),
    ) {
        actions.forEach { action ->
            ActionTriadButton(
                action = action,
                modifier = Modifier.weight(1f),
            )
        }
    }
}

@Composable
private fun ActionTriadButton(
    action: ActionButton,
    modifier: Modifier = Modifier,
) {
    if (action.isPrimary) {
        Button(
            onClick = action.onClick,
            modifier = modifier.height(48.dp),
            shape = RoundedCornerShape(VEyeRadius.pill),
            colors =
                ButtonDefaults.buttonColors(
                    containerColor = action.accent ?: MaterialTheme.colorScheme.primary,
                    contentColor =
                        if (action.accent == null) MaterialTheme.colorScheme.onPrimary
                        else Color.White,
                ),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = VEyeSpacing.sm),
        ) {
            ActionTriadContent(action = action, contentColor = MaterialTheme.colorScheme.onPrimary)
        }
    } else {
        OutlinedButton(
            onClick = action.onClick,
            modifier = modifier.height(48.dp),
            shape = RoundedCornerShape(VEyeRadius.pill),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = VEyeSpacing.sm),
        ) {
            ActionTriadContent(
                action = action,
                contentColor = action.accent ?: MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@Composable
private fun ActionTriadContent(
    action: ActionButton,
    contentColor: Color,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Icon(
            imageVector = action.icon,
            contentDescription = null,
            modifier = Modifier.size(18.dp),
            tint = contentColor,
        )
        Text(
            text = action.label,
            style =
                MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
            color = contentColor,
            modifier = Modifier.padding(start = 6.dp),
        )
    }
}
