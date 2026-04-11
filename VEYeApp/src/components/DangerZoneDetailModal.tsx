import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react'
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native'
import type { Region } from 'react-native-maps'
import { useTranslation } from 'react-i18next'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../context/ThemeContext'
import { COLORS, FONT_FAMILY } from '../constants'
import MapPlaceholder from './MapPlaceholder'
import CommentThreadPanel from './CommentThreadPanel'
import {
  incidentSlugFromZone,
  mapIconForIncidentSlug,
  colorForDangerMapIcon,
} from '../utils/dangerZoneMapIcon'
import { zoneCommentsThreadId } from '../utils/commentsStorage'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

/** Bottom stops at half-screen; never snaps to a low “peek” height */
const SHEET_MID = SCREEN_HEIGHT / 2.5
const SHEET_EXPANDED = SCREEN_HEIGHT - 160

const SHEET_SNAP_POINTS = [SHEET_MID, SHEET_EXPANDED]

function nearestSheetSnap(height: number): number {
  return SHEET_SNAP_POINTS.reduce((best, p) =>
    Math.abs(p - height) < Math.abs(best - height) ? p : best,
  )
}

const HAITI_REGION: Region = {
  latitude: 18.5944,
  longitude: -72.3074,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
}

/** Near-max street zoom on the pin (~1–2 city blocks; smaller delta = tighter). */
const DETAIL_ZONE_MAP_DELTA = 0.003

const getSeverityColor = (rezon?: string) => {
  if (!rezon) return COLORS.severityHigh
  const lower = rezon.toLowerCase()
  if (lower.includes('shoot') || lower.includes('active')) return COLORS.severityCritical
  if (lower.includes('danger')) return COLORS.severityHigh
  return '#EAB308'
}

type DangerZoneDetailModalProps = {
  visible: boolean
  zone: any | null
  onClose: () => void
  userLocation: { latitude: number; longitude: number } | null
  radiusKm: number
}

export default function DangerZoneDetailModal({
  visible,
  zone,
  onClose,
  userLocation,
  radiusKm,
}: DangerZoneDetailModalProps) {
  const { t } = useTranslation()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const [postExpanded, setPostExpanded] = useState(false)
  const sheetAnim = useRef(new Animated.Value(SHEET_MID)).current
  const sheetDragStartHeightRef = useRef(SHEET_MID)

  useEffect(() => {
    if (visible && zone) {
      setPostExpanded(false)
      sheetAnim.setValue(SHEET_MID)
      sheetDragStartHeightRef.current = SHEET_MID
    }
  }, [visible, zone?.id])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        sheetAnim.stopAnimation(value => {
          sheetDragStartHeightRef.current = value
        })
      },
      onPanResponderMove: (_, g) => {
        const next = sheetDragStartHeightRef.current - g.dy
        const clamped = Math.max(SHEET_MID, Math.min(SHEET_EXPANDED, next))
        sheetAnim.setValue(clamped)
      },
      onPanResponderRelease: (_, g) => {
        let projected = sheetDragStartHeightRef.current - g.dy
        projected = Math.max(SHEET_MID, Math.min(SHEET_EXPANDED, projected))
        const vy = g.vy ?? 0
        if (vy < -0.8) projected = SHEET_EXPANDED
        if (vy > 0.8) projected = SHEET_MID
        const target = nearestSheetSnap(projected)
        Animated.spring(sheetAnim, { toValue: target, useNativeDriver: false, bounciness: 4, speed: 14 }).start()
      },
    }),
  ).current

  const formatTime = useCallback(
    (date: any) => {
      if (!date) return '—'
      const d = date?.toDate ? date.toDate() : new Date(date)
      const diffMins = Math.floor((Date.now() - d.getTime()) / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)
      const diffWeeks = Math.floor(diffDays / 7)
      const diffMonths = Math.floor(diffDays / 30)
      const diffYears = Math.floor(diffDays / 365)
      if (diffMins < 1) return t('time.justNow')
      if (diffMins < 60) return t('time.minAgo', { count: diffMins })
      if (diffHours < 24) return t('time.hoursAgo', { count: diffHours })
      if (diffDays === 1) return t('time.yesterday')
      if (diffDays < 7) return t('time.daysAgo', { count: diffDays })
      if (diffWeeks < 5) return t('time.weeksAgo', { count: diffWeeks })
      if (diffMonths < 12) return t('time.monthsAgo', { count: diffMonths })
      return t('time.yearsAgo', { count: diffYears })
    },
    [t],
  )

  const mapRegion = useMemo((): Region => {
    if (zone?.latitude != null && zone?.longitude != null) {
      return {
        latitude: Number(zone.latitude),
        longitude: Number(zone.longitude),
        latitudeDelta: DETAIL_ZONE_MAP_DELTA,
        longitudeDelta: DETAIL_ZONE_MAP_DELTA,
      }
    }
    return HAITI_REGION
  }, [zone?.latitude, zone?.longitude])

  const markers = useMemo(() => {
    if (!zone || zone.latitude == null || zone.longitude == null) return []
    const slug = incidentSlugFromZone(zone)
    const mapIcon = mapIconForIncidentSlug(slug)
    return [
      {
        id: `detail-${zone.id}`,
        coordinate: {
          latitude: Number(zone.latitude),
          longitude: Number(zone.longitude),
        },
        title: zone.name,
        description: zone.rezon,
        mapIcon,
        pinColor: colorForDangerMapIcon(mapIcon),
        pulse: false,
      },
    ]
  }, [zone?.id, zone?.latitude, zone?.longitude, zone?.name, zone?.rezon])

  const radiusOverlay = useMemo(() => {
    if (!userLocation) return undefined
    return {
      center: {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      },
      radiusKm,
      color: 'rgba(27, 194, 27, 0.9)',
    }
  }, [userLocation?.latitude, userLocation?.longitude, radiusKm])

  const threadId = zone ? zoneCommentsThreadId(zone) : 'zone:_'
  const barColor = zone ? getSeverityColor(zone.rezon) : COLORS.severityHigh

  const postCard = useMemo(() => {
    if (!zone) return null
    return (
      <View style={styles.postCardWrap}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card }]}
          onPress={() => setPostExpanded(e => !e)}
          activeOpacity={0.88}
          accessibilityRole="button">
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{zone.name}</Text>
            <Text
              style={[styles.cardDesc, { color: colors.textSecondary }]}
            >
              {zone.rezon}
            </Text>
            <Text style={[styles.cardTime, { color: colors.textSecondary }]}>{formatTime(zone.date)}</Text>
          </View>

        </TouchableOpacity>
      </View>
    )
  }, [zone, colors.card, colors.text, colors.textSecondary, barColor, postExpanded, formatTime])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <View style={styles.modalBody}>
          {zone ? (
            <View style={styles.mapUnderlay}>
              <MapPlaceholder
                height="full"
                region={mapRegion}
                markers={markers}
                clusterMarkers={false}
                radiusOverlay={radiusOverlay}
                showHeatmap={false}
                trackVisibleRegion={false}
                satellite
              />
            </View>
          ) : null}

          {zone ? (
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  height: sheetAnim,
                  backgroundColor: colors.card,
                },
              ]}>
              <View {...panResponder.panHandlers} style={styles.sheetHandle}>
                <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
              </View>
              <View style={styles.sheetBody}>
                <CommentThreadPanel
                  threadId={threadId}
                  enabled={visible && !!zone}
                  listHeader={postCard}
                  showSectionTitle
                />
              </View>
            </Animated.View>
          ) : null}

          <Pressable
            onPress={onClose}
            hitSlop={14}
            style={[
              styles.closeFab,
              {
                top: insets.top + 10,
                backgroundColor: isDark ? 'rgba(44,44,46,0.92)' : 'rgba(255,255,255,0.94)',
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}>
            <MaterialCommunityIcons name="close" size={22} color={isDark ? '#FFF' : '#111'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modalBody: { flex: 1, position: 'relative' },
  mapUnderlay: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 14, paddingBottom: 10 },
  handleBar: { width: 48, height: 5, borderRadius: 3 },
  sheetBody: { flex: 1, minHeight: 0 },
  closeFab: {
    position: 'absolute',
    right: 14,
    zIndex: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  postCardWrap: {
    marginBottom: 6,
    marginTop: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardBar: { width: 4, alignSelf: 'stretch' },
  cardContent: { flex: 1, paddingBottom: 12 },
  cardTitle: { fontSize: 16, fontFamily: FONT_FAMILY.bold },
  cardDesc: { fontSize: 12, marginTop: 3, lineHeight: 17 },
  cardTime: { fontSize: 11, marginTop: 4, fontFamily: FONT_FAMILY.medium },
  cardIcon: { marginRight: 14 },
})
