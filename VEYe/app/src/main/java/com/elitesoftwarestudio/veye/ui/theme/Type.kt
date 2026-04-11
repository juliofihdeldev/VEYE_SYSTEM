package com.elitesoftwarestudio.veye.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import com.elitesoftwarestudio.veye.R

/** Same family as RN `src/constants/theme.js` (`FONT_FAMILY` → Montserrat-*). */
val MontserratFamily = FontFamily(
    Font(R.font.montserrat_regular, FontWeight.Normal),
    Font(R.font.montserrat_italic, FontWeight.Normal, FontStyle.Italic),
    Font(R.font.montserrat_medium, FontWeight.Medium),
    Font(R.font.montserrat_medium_italic, FontWeight.Medium, FontStyle.Italic),
    Font(R.font.montserrat_semibold, FontWeight.SemiBold),
    Font(R.font.montserrat_semibold_italic, FontWeight.SemiBold, FontStyle.Italic),
    Font(R.font.montserrat_bold, FontWeight.Bold),
    Font(R.font.montserrat_bold_italic, FontWeight.Bold, FontStyle.Italic),
    Font(R.font.montserrat_extrabold, FontWeight.ExtraBold),
    Font(R.font.montserrat_black, FontWeight.Black),
)

private val defaultTypography = Typography()

val Typography = Typography(
    displayLarge = defaultTypography.displayLarge.copy(fontFamily = MontserratFamily),
    displayMedium = defaultTypography.displayMedium.copy(fontFamily = MontserratFamily),
    displaySmall = defaultTypography.displaySmall.copy(fontFamily = MontserratFamily),
    headlineLarge = defaultTypography.headlineLarge.copy(fontFamily = MontserratFamily),
    headlineMedium = defaultTypography.headlineMedium.copy(fontFamily = MontserratFamily),
    headlineSmall = defaultTypography.headlineSmall.copy(fontFamily = MontserratFamily),
    titleLarge = defaultTypography.titleLarge.copy(fontFamily = MontserratFamily),
    titleMedium = defaultTypography.titleMedium.copy(fontFamily = MontserratFamily),
    titleSmall = defaultTypography.titleSmall.copy(fontFamily = MontserratFamily),
    bodyLarge = defaultTypography.bodyLarge.copy(fontFamily = MontserratFamily),
    bodyMedium = defaultTypography.bodyMedium.copy(fontFamily = MontserratFamily),
    bodySmall = defaultTypography.bodySmall.copy(fontFamily = MontserratFamily),
    labelLarge = defaultTypography.labelLarge.copy(fontFamily = MontserratFamily),
    labelMedium = defaultTypography.labelMedium.copy(fontFamily = MontserratFamily),
    labelSmall = defaultTypography.labelSmall.copy(fontFamily = MontserratFamily),
)
