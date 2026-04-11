import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native'
import { COLORS, FONT_FAMILY } from '../constants'
import { useTheme } from '../context/ThemeContext'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

type ModernHeaderProps = {
  title?: string
  location?: string
  showBack?: boolean
  onBack?: () => void
  showSOS?: boolean
  onSOSPress?: () => void
  showProfile?: boolean
  onProfilePress?: () => void
  rightElement?: React.ReactNode
}

export default function ModernHeader({
  title = 'VEYe',
  location,
  showBack = false,
  onBack,
  showSOS = true,
  onSOSPress,
  showProfile = false,
  onProfilePress,
  rightElement,
}: ModernHeaderProps) {
  const isHome = title === 'VEYe' && !showBack
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          {isHome ? (
            <Text style={styles.logo}>
              <Text style={styles.logoV}>v</Text>
              <Text style={[styles.logoYe, { color: colors.text }]}>ye</Text>
            </Text>
          ) : !showBack ? null : null}
          {location && isHome && (
            <View style={[styles.locationPill, { backgroundColor: COLORS.severityCritical + '15' }]}>
              <MaterialCommunityIcons name="map-marker" size={14} color={COLORS.severityCritical} />
              <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>{location}</Text>
            </View>
          )}
        </View>
        <View style={styles.rightSection}>
          {rightElement}
          {showSOS && (
            <TouchableOpacity onPress={onSOSPress} style={styles.sosBadge} activeOpacity={0.7}>
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          )}
          {showProfile && (
            <TouchableOpacity onPress={onProfilePress} style={styles.profileBtn}>
              <MaterialCommunityIcons name="account-circle" size={32} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {!isHome && !showBack && (
        <Text style={[styles.screenTitle, { color: colors.text }]}>{title}</Text>
      )}
      {showBack && title !== 'VEYe' && (
        <Text style={[styles.screenTitle, { color: colors.text }]}>{title}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  backBtn: {
    padding: 6,
    marginRight: 2,
  },
  logo: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.black,
    letterSpacing: -0.5,
  },
  logoV: {
    color: COLORS.severityCritical,
    fontFamily: FONT_FAMILY.black,
  },
  logoYe: {
    color: '#222',
    fontFamily: FONT_FAMILY.extraBold,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: 180,
  },
  locationText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 5,
    fontFamily: FONT_FAMILY.medium,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sosBadge: {
    backgroundColor: COLORS.severityCritical,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  sosText: {
    color: COLORS.white,
    fontFamily: FONT_FAMILY.extraBold,
    fontSize: 14,
    letterSpacing: 1,
  },
  profileBtn: {
    padding: 2,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.extraBold,
    color: '#111',
    marginTop: 10,
    letterSpacing: -0.3,
  },
})
