import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { useNavigation, useNavigationState } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, FONT_FAMILY } from '../constants'
import { useTheme } from '../context/ThemeContext'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const SIDEBAR_WIDTH = 280

const TABS = [
  {
    name: 'Map',
    labelKey: 'tabs.map',
    icon: 'map-outline',
    iconActive: 'map',
  },
  {
    name: 'Alerts',
    labelKey: 'tabs.alerts',
    icon: 'bell-outline',
    iconActive: 'bell-ring',
  },
  {
    name: 'DangerZones',
    labelKey: 'tabs.dangerZones',
    icon: 'map-marker-radius-outline',
    iconActive: 'map-marker-radius',
  },
  {
    name: 'Profile',
    labelKey: 'tabs.profile',
    icon: 'account-outline',
    iconActive: 'account',
  },
]

export default function IPadSidebar() {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()

  const activeRouteName = useNavigationState(
    state => state?.routes[state.index]?.name ?? 'Map'
  )

  const bg = isDark ? '#0B1F2E' : '#0B1F2E'

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <Text style={styles.logoV}>v</Text>
        <Text style={styles.logoYe}>ye</Text>
      </View>

      {/* Nav items */}
      <View style={styles.navList}>
        {TABS.map(tab => {
          const isActive = activeRouteName === tab.name
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? '#FFFFFF' : '#7A9BB5'}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {t(tab.labelKey).toUpperCase()}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* FAB — Report */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('Report')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={26} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.fabLabel}>{t('tabs.report', 'Rapòte').toUpperCase()}</Text>
      </View>

      {/* Version footer */}
      <Text style={styles.version}>VEYe v{require('../../package.json').version}</Text>
    </View>
  )
}

export { SIDEBAR_WIDTH }

const styles = StyleSheet.create({
  container: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    flexDirection: 'column',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#1E3448',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  logoV: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.severityCritical,
    fontFamily: FONT_FAMILY.bold,
  },
  logoYe: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bold,
  },
  navList: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: COLORS.severityCritical,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: '#7A9BB5',
    fontFamily: FONT_FAMILY.medium,
  },
  navLabelActive: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bold,
  },
  fabWrapper: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.severityCritical,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.severityCritical,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#7A9BB5',
    fontFamily: FONT_FAMILY.medium,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    color: '#3A5570',
    paddingBottom: 20,
    fontFamily: FONT_FAMILY.regular,
  },
})
