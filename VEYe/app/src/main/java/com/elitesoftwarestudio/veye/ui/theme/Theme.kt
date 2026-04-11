package com.elitesoftwarestudio.veye.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val LightPrimaryContainer = Color(0xFFFFD8E8)
private val LightOnPrimaryContainer = Color(0xFF5C1030)
private val DarkPrimaryContainer = Color(0xFF8B2255)
private val DarkOnPrimaryContainer = Color(0xFFFFD8E8)

private val LightError = Color(0xFFB3261E)
private val LightOnError = Color.White
private val LightErrorContainer = Color(0xFFF9DEDC)
private val LightOnErrorContainer = Color(0xFF410E0B)

private val DarkError = Color(0xFFF2B8B5)
private val DarkOnError = Color(0xFF601410)
private val DarkErrorContainer = Color(0xFF8C1D18)
private val DarkOnErrorContainer = Color(0xFFF9DEDC)

/**
 * Fully specified neutral surfaces (no default M3 lavender). [Color.Transparent] surface tint so
 * elevated [androidx.compose.material3.Surface]s are not washed with primary.
 */
private val LightColorScheme =
    lightColorScheme(
        primary = VEyeCoral,
        onPrimary = NeutralWhite,
        primaryContainer = LightPrimaryContainer,
        onPrimaryContainer = LightOnPrimaryContainer,
        inversePrimary = VEyeCoralDark,
        secondary = VEyeCoralDark,
        onSecondary = NeutralWhite,
        secondaryContainer = NeutralGray90,
        onSecondaryContainer = LightOnSurface,
        tertiary = NeutralGrayOutline,
        onTertiary = NeutralWhite,
        tertiaryContainer = NeutralGray94,
        onTertiaryContainer = LightOnSurface,
        background = NeutralWhite,
        onBackground = LightOnSurface,
        surface = NeutralWhite,
        onSurface = LightOnSurface,
        surfaceVariant = NeutralGray96,
        onSurfaceVariant = LightOnSurfaceVariant,
        surfaceTint = Color.Transparent,
        inverseSurface = NeutralGray10,
        inverseOnSurface = DarkOnSurface,
        error = LightError,
        onError = LightOnError,
        errorContainer = LightErrorContainer,
        onErrorContainer = LightOnErrorContainer,
        outline = NeutralGrayOutline,
        outlineVariant = NeutralGrayOutlineVariant,
        scrim = Color(0xFF000000),
        surfaceDim = NeutralGray94,
        surfaceBright = NeutralWhite,
        surfaceContainerLowest = NeutralWhite,
        surfaceContainerLow = NeutralGray98,
        surfaceContainer = NeutralWhite,
        surfaceContainerHigh = NeutralGray98,
        surfaceContainerHighest = NeutralGray96,
    )

private val DarkColorScheme =
    darkColorScheme(
        primary = VEyeCoral,
        onPrimary = NeutralWhite,
        primaryContainer = DarkPrimaryContainer,
        onPrimaryContainer = DarkOnPrimaryContainer,
        inversePrimary = Color(0xFFFFB0CD),
        secondary = VEyeCoralDark,
        onSecondary = NeutralWhite,
        secondaryContainer = NeutralGray22,
        onSecondaryContainer = DarkOnSurface,
        tertiary = DarkOnSurfaceVariant,
        onTertiary = NeutralGray10,
        tertiaryContainer = NeutralGray20,
        onTertiaryContainer = DarkOnSurface,
        background = NeutralGray10,
        onBackground = DarkOnSurface,
        surface = NeutralGray10,
        onSurface = DarkOnSurface,
        surfaceVariant = NeutralGray20,
        onSurfaceVariant = DarkOnSurfaceVariant,
        surfaceTint = Color.Transparent,
        inverseSurface = NeutralGray96,
        inverseOnSurface = LightOnSurface,
        error = DarkError,
        onError = DarkOnError,
        errorContainer = DarkErrorContainer,
        onErrorContainer = DarkOnErrorContainer,
        outline = Color(0xFF938F99),
        outlineVariant = NeutralGray24,
        scrim = Color(0xFF000000),
        surfaceDim = NeutralGray10,
        surfaceBright = NeutralGray16,
        surfaceContainerLowest = NeutralGray10,
        surfaceContainerLow = NeutralGray12,
        surfaceContainer = NeutralGray12,
        surfaceContainerHigh = NeutralGray16,
        surfaceContainerHighest = NeutralGray20,
    )

@Composable
fun VEYeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    /** Set true to use Material You dynamic colors on Android 12+ (overrides coral primary). */
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val colorScheme =
        when {
            dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
                if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
            }
            darkTheme -> DarkColorScheme
            else -> LightColorScheme
        }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content,
    )
}
