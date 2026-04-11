package com.elitesoftwarestudio.veye

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.elitesoftwarestudio.veye.navigation.AlertDetailRoute
import com.elitesoftwarestudio.veye.navigation.DangerZoneDetailRoute
import com.elitesoftwarestudio.veye.navigation.MainDestination
import com.elitesoftwarestudio.veye.ui.alerts.AlertDetailNavScreen
import com.elitesoftwarestudio.veye.ui.alerts.AlertsScreen
import com.elitesoftwarestudio.veye.ui.map.MapScreen
import com.elitesoftwarestudio.veye.ui.profile.ProfileScreen
import com.elitesoftwarestudio.veye.ui.report.ReportScreen
import com.elitesoftwarestudio.veye.ui.zones.DangerZoneDetailScreen
import com.elitesoftwarestudio.veye.ui.zones.ZonesScreen

@Composable
fun VEYeRoot(
    pendingTabRoute: String? = null,
    onConsumedPendingTab: () -> Unit = {},
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    LaunchedEffect(pendingTabRoute) {
        val route = pendingTabRoute ?: return@LaunchedEffect
        navController.navigate(route) {
            popUpTo(navController.graph.findStartDestination().id) {
                saveState = true
            }
            launchSingleTop = true
            restoreState = true
        }
        onConsumedPendingTab()
    }

    Scaffold(
        // Edge-to-edge: draw behind status bar; only apply system nav/gesture bar insets to content.
        contentWindowInsets = WindowInsets.navigationBars,
        bottomBar = {
            if (MainDestination.entries.any { it.route == currentDestination?.route }) {
            NavigationBar {
                MainDestination.entries.forEach { dest ->
                    val selected = currentDestination?.hierarchy?.any { it.route == dest.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            val iconScale by animateFloatAsState(
                                targetValue = if (selected) 1.08f else 1f,
                                animationSpec =
                                    spring(
                                        dampingRatio = Spring.DampingRatioNoBouncy,
                                        stiffness = Spring.StiffnessMediumLow,
                                    ),
                                label = "navIconScale",
                            )
                            Icon(
                                imageVector = dest.icon,
                                contentDescription = stringResource(dest.labelRes),
                                modifier = Modifier.scale(iconScale),
                            )
                        },
                        label = { Text(stringResource(dest.labelRes)) },
                        colors = if (dest.isReportFab) {
                            NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.onPrimary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = MaterialTheme.colorScheme.primary,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        } else {
                            NavigationBarItemDefaults.colors()
                        },
                    )
                }
            }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = MainDestination.Map.route,
            modifier = Modifier.padding(innerPadding),
            enterTransition = {
                fadeIn(
                    animationSpec = tween(240, easing = FastOutSlowInEasing),
                ) +
                    scaleIn(
                        initialScale = 0.97f,
                        animationSpec = tween(240, easing = FastOutSlowInEasing),
                    )
            },
            exitTransition = {
                fadeOut(animationSpec = tween(180, easing = FastOutSlowInEasing)) +
                    scaleOut(
                        targetScale = 1.02f,
                        animationSpec = tween(180, easing = FastOutSlowInEasing),
                    )
            },
            popEnterTransition = {
                fadeIn(
                    animationSpec = tween(240, easing = FastOutSlowInEasing),
                ) +
                    scaleIn(
                        initialScale = 1.02f,
                        animationSpec = tween(240, easing = FastOutSlowInEasing),
                    )
            },
            popExitTransition = {
                fadeOut(animationSpec = tween(180, easing = FastOutSlowInEasing)) +
                    scaleOut(
                        targetScale = 0.97f,
                        animationSpec = tween(180, easing = FastOutSlowInEasing),
                    )
            },
        ) {
            MainDestination.entries.forEach { dest ->
                composable(dest.route) {
                    when (dest) {
                        MainDestination.Map -> MapScreen(
                            onNavigateToZones = {
                                navController.navigate(MainDestination.Zones.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            onNavigateToZoneDetail = { zone ->
                                navController.navigate(DangerZoneDetailRoute.create(zone.id))
                            },
                            onNavigateToAlertDetail = { alertId ->
                                navController.navigate(AlertDetailRoute.create(alertId))
                            },
                        )
                        MainDestination.Zones ->
                            ZonesScreen(
                                onNavigateToZoneDetail = { zone ->
                                    navController.navigate(DangerZoneDetailRoute.create(zone.id))
                                },
                            )
                        MainDestination.Alerts ->
                            AlertsScreen(
                                onNavigateToReport = {
                                    navController.navigate(MainDestination.Report.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                            )
                        MainDestination.Report ->
                            ReportScreen(
                                onThankYouNavigateToZones = {
                                    navController.navigate(MainDestination.Zones.route) {
                                        popUpTo(navController.graph.findStartDestination().id) {
                                            saveState = true
                                        }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                },
                            )
                        MainDestination.Profile -> ProfileScreen()
                    }
                }
            }
            composable(
                route = DangerZoneDetailRoute.ROUTE,
                arguments = listOf(navArgument("zoneId") { type = NavType.StringType }),
            ) {
                DangerZoneDetailScreen(onBack = { navController.popBackStack() })
            }
            composable(
                route = AlertDetailRoute.ROUTE,
                arguments = listOf(navArgument("alertId") { type = NavType.StringType }),
            ) {
                AlertDetailNavScreen(
                    onBack = { navController.popBackStack() },
                    onNavigateToReport = {
                        navController.navigate(MainDestination.Report.route) {
                            popUpTo(navController.graph.findStartDestination().id) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                )
            }
        }
    }
}
