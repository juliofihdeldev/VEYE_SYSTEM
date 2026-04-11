import React, { useEffect, useState, useContext, useRef, useMemo } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  Alert,
} from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import MapView from 'react-native-maps'
import { AlertContext } from '../../context/AlertContext'
import { UserContext } from '../../context/UserContext'
import { useTheme } from '../../context/ThemeContext'
import { usePendingReports, PendingReport } from '../../context/PendingReportContext'
import MapPlaceholder from '../../components/MapPlaceholder'
import MapTimeSegmentControl from '../../components/MapTimeSegmentControl'
import {
  filterItemsByMapTimeRange,
  isWithinLastMs,
  MAP_LIVE_WINDOW_MS,
  type MapTimeRange,
} from '../../utils/dangerZoneTimeFilter'
import { nearestDangerBearingWithinKm } from '../../utils/dangerProximity'
import { COLORS, FONT_FAMILY } from '../../constants'
import {
  incidentSlugFromZone,
  mapIconForIncidentSlug,
  colorForDangerMapIcon,
} from '../../utils/dangerZoneMapIcon'
import DangerZoneDetailModal from '../../components/DangerZoneDetailModal'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const SWIPE_ACTION_W = 86
const IG_COMMENT_BLUE = '#0095F6'
/** Minimum sheet height (drag handle peek). */
const SHEET_MIN = 120
/** Default / “half” height between min and expanded. */
const SHEET_MID = SCREEN_HEIGHT / 2.5
const SHEET_EXPANDED = SCREEN_HEIGHT - 160

const SHEET_SNAP_POINTS = [SHEET_MIN, SHEET_MID, SHEET_EXPANDED]

function nearestSheetSnap(height: number): number {
  return SHEET_SNAP_POINTS.reduce((best, p) =>
    Math.abs(p - height) < Math.abs(best - height) ? p : best,
  )
}

const HAITI_REGION = {
  latitude: 18.5944,
  longitude: -72.3074,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
}

const getSeverityColor = (rezon?: string) => {
  if (!rezon) return COLORS.severityHigh
  const lower = rezon.toLowerCase()
  if (lower.includes('shoot') || lower.includes('active')) return COLORS.severityCritical
  if (lower.includes('danger')) return COLORS.severityHigh
  return '#EAB308'
}

type DangerZonesProps = {
  onClose?: () => void
}

export default function DangerZones({ onClose }: DangerZonesProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const navigation = useNavigation<any>()
  const { handleGetALert, filteredDangerZones = [], konfimeManti } = useContext(AlertContext)
  const { userPreferences, radiusKm } = useContext(UserContext)
  const { pendingReports, removePendingReport } = usePendingReports()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedZone, setSelectedZone] = useState<any>(null)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [map3D, setMap3D] = useState(false)
  const [mapSatellite, setMapSatellite] = useState(false)
  const [mapTimeRange, setMapTimeRange] = useState<MapTimeRange>('all')
  const mapRef = useRef<MapView>(null)
  const sheetAnim = useRef(new Animated.Value(SHEET_MID)).current
  const sheetDragStartHeightRef = useRef(SHEET_MID)
  const [detailZone, setDetailZone] = useState<any>(null)
  const [swipeOpenZoneId, setSwipeOpenZoneId] = useState<string | null>(null)
  const zoneSwipeRefs = useRef<Record<string, Swipeable | null>>({})

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
        const clamped = Math.max(SHEET_MIN, Math.min(SHEET_EXPANDED, next))
        sheetAnim.setValue(clamped)
      },
      onPanResponderRelease: (_, g) => {
        let projected = sheetDragStartHeightRef.current - g.dy
        projected = Math.max(SHEET_MIN, Math.min(SHEET_EXPANDED, projected))
        const vy = g.vy ?? 0
        if (vy < -0.8) projected = SHEET_EXPANDED
        if (vy > 0.8) projected = SHEET_MIN
        const target = nearestSheetSnap(projected)
        Animated.spring(sheetAnim, { toValue: target, useNativeDriver: false, bounciness: 4, speed: 14 }).start()
      },
    }),
  ).current

  useEffect(() => { handleGetALert?.() }, [])

  const onRefresh = () => {
    setRefreshing(true)
    handleGetALert?.()
    setTimeout(() => setRefreshing(false), 500)
  }

  const handleViewZone = (zone: any) => {
    if (!zone.latitude || !zone.longitude) return
    setSelectedZone(zone)
    mapRef.current?.animateToRegion({
      latitude: Number(zone.latitude),
      longitude: Number(zone.longitude),
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }, 600)
  }

  const formatTime = (date: any) => {
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
  }

  const userLocation = userPreferences?.latitude
    ? { latitude: Number(userPreferences.latitude), longitude: Number(userPreferences.longitude) }
    : null

  const delta = (radiusKm / 111) * 2.5

  const mapInitialRegion = useMemo(() => {
    if (userPreferences?.latitude != null && userPreferences?.longitude != null) {
      return {
        latitude: Number(userPreferences.latitude),
        longitude: Number(userPreferences.longitude),
        latitudeDelta: delta,
        longitudeDelta: delta,
      }
    }
    return HAITI_REGION
  }, [userPreferences?.latitude, userPreferences?.longitude, delta])

  const zonesForMap = useMemo(
    () => filterItemsByMapTimeRange(filteredDangerZones || [], mapTimeRange),
    [filteredDangerZones, mapTimeRange],
  )

  const mapMarkers = useMemo(
    () =>
      zonesForMap
        .filter((z: any) => z.latitude != null && z.longitude != null)
        .map((z: any) => {
          const slug = incidentSlugFromZone(z)
          const mapIcon = mapIconForIncidentSlug(slug)
          return {
            id: `dz-${z.id}`,
            coordinate: {
              latitude: Number(z.latitude),
              longitude: Number(z.longitude),
            },
            title: z.name,
            description: z.rezon,
            mapIcon,
            pinColor: colorForDangerMapIcon(mapIcon),
            pulse: isWithinLastMs(z.date, MAP_LIVE_WINDOW_MS),
          }
        }),
    [zonesForMap],
  )

  const heatmapPoints = useMemo(
    () =>
      zonesForMap
        .filter((z: any) => z.latitude != null && z.longitude != null)
        .map((z: any) => ({
          latitude: Number(z.latitude),
          longitude: Number(z.longitude),
        })),
    [zonesForMap],
  )

  const dangerBearing = useMemo(() => {
    if (!userLocation) return null
    return (
      nearestDangerBearingWithinKm(
        userLocation.latitude,
        userLocation.longitude,
        zonesForMap,
      ) ?? null
    )
  }, [userLocation, zonesForMap])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapPlaceholder
        ref={mapRef}
        key={`${map3D ? '3d' : '2d'}-${mapSatellite ? 'sat' : 'std'}`}
        height="full"
        enable3D={map3D}
        satellite={mapSatellite}
        region={mapInitialRegion}
        markers={mapMarkers}
        radiusOverlay={
          userLocation
            ? {
              center: userLocation,
              radiusKm,
              color: 'rgba(27, 194, 27, 0.9)',
            }
            : undefined
        }
        showHeatmap={showHeatmap}
        heatmapPoints={heatmapPoints}
        dangerBearing={dangerBearing}
      />

      {/* Floating header */}
      <View style={styles.floatingHeader}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('dangerZones.title')}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{zonesForMap.length}</Text>
          </View>
        </View>
        <View style={styles.timeSegmentWrap}>
          <MapTimeSegmentControl
            value={mapTimeRange}
            onChange={setMapTimeRange}
            labels={{
              live: t('map.timeLive'),
              sevenDays: t('map.time7Days'),
              all: t('map.timeAll'),
            }}
            chipSurfaceColor={colors.card}
            activeTint={COLORS.severityCritical}
            textMuted={colors.textSecondary}
            borderColor={colors.border}
          />
        </View>
      </View>

      {/* Floating legend */}
      <View style={[styles.legend, { backgroundColor: colors.card }]}>
        <LegendDot dotColor={COLORS.severityCritical} label={t('dangerZones.highRisk')} labelColor={colors.textSecondary} />
        <LegendDot dotColor={COLORS.severityHigh} label={t('dangerZones.mediumRisk')} labelColor={colors.textSecondary} />
        <LegendDot dotColor="#EAB308" label={t('dangerZones.lowRisk')} labelColor={colors.textSecondary} />
      </View>

      {/* Map controls: heatmap + 3D */}
      <View style={styles.mapControlsColumn}>
        <TouchableOpacity
          style={[
            styles.mapControlPill,
            { backgroundColor: showHeatmap ? undefined : colors.card },
            showHeatmap && styles.mapControlPillHeatActive,
          ]}
          onPress={() => setShowHeatmap(prev => !prev)}
          activeOpacity={0.7}>
          <MaterialCommunityIcons name="fire" size={18} color={showHeatmap ? '#FFF' : colors.textSecondary} />
          <Text
            style={[
              styles.mapControlPillText,
              { color: !showHeatmap ? colors.textSecondary : undefined },
              showHeatmap && styles.mapControlPillTextOnLight,
            ]}>
            {t('map.heatmap')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.mapControlPill,
            { backgroundColor: map3D ? undefined : colors.card },
            map3D && styles.mapControlPill3dActive,
          ]}
          onPress={() => setMap3D(prev => !prev)}
          activeOpacity={0.7}>
          <MaterialCommunityIcons
            name="video-3d-variant"
            size={18}
            color={map3D ? '#FFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.mapControlPillText,
              { color: !map3D ? colors.textSecondary : undefined },
              map3D && styles.mapControlPillTextOnLight,
            ]}>
            {t('map.view3d')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.mapControlPill,
            { backgroundColor: mapSatellite ? undefined : colors.card },
            mapSatellite && styles.mapControlPillSatelliteActive,
          ]}
          onPress={() => setMapSatellite(prev => !prev)}
          activeOpacity={0.7}>
          <MaterialCommunityIcons
            name="satellite-variant"
            size={18}
            color={mapSatellite ? '#FFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.mapControlPillText,
              { color: !mapSatellite ? colors.textSecondary : undefined },
              mapSatellite && styles.mapControlPillTextOnLight,
            ]}>
            {t('map.satellite')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom sheet */}
      <Animated.View style={[styles.bottomSheet, { height: sheetAnim, backgroundColor: colors.card }]}>
        <View {...panResponder.panHandlers} style={styles.sheetHandle}>
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled>
          <View style={styles.sheetListHeader}>
            <Text
              style={[
                styles.sheetTitle,
                { color: colors.text },
                Platform.OS === 'android' && styles.sheetTitleAndroid,
              ]}>
              {t('dangerZones.title')}
            </Text>
          </View>
          {pendingReports.map(report => (
            <PendingReportCard
              key={report.id}
              report={report}
              colors={colors}
              onDismiss={() => removePendingReport(report.id)}
            />
          ))}
          {zonesForMap.map((zone: any) => {
            const isSelected = selectedZone?.id === zone.id
            const closeSwipe = () => zoneSwipeRefs.current[zone.id]?.close()
            const renderZoneSwipeActions = () => (
              <View style={styles.swipeActionsRow}>
                <TouchableOpacity
                  style={[styles.swipeActionBtn, { backgroundColor: IG_COMMENT_BLUE, width: SWIPE_ACTION_W }]}
                  onPress={() => {
                    closeSwipe()
                    setDetailZone(zone)
                  }}
                  activeOpacity={0.88}>
                  <MaterialCommunityIcons name="comment-outline" size={22} color="#FFF" />
                  <Text style={styles.swipeActionLabel}>{t('comments.swipeComment')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.swipeActionBtn, { backgroundColor: COLORS.severityCritical, width: SWIPE_ACTION_W }]}
                  onPress={() => {
                    closeSwipe()
                    Alert.alert(t('dangerZones.flagFalseTitle'), t('dangerZones.flagFalseMessage'), [
                      { text: t('dangerZones.flagFalseCancel'), style: 'cancel' },
                      {
                        text: t('dangerZones.flagFalseConfirm'),
                        onPress: () =>
                          void konfimeManti?.({
                            id: zone.id,
                            name: zone.name,
                            rezon: zone.rezon,
                          }),
                      },
                    ])
                  }}
                  activeOpacity={0.88}>
                  <MaterialCommunityIcons name="flag-outline" size={22} color="#FFF" />
                  <Text style={styles.swipeActionLabel}>{t('dangerZones.swipeReportFalse')}</Text>
                </TouchableOpacity>
              </View>
            )
            return (
              <Swipeable
                key={zone.id}
                ref={ref => {
                  zoneSwipeRefs.current[zone.id] = ref
                }}
                renderRightActions={renderZoneSwipeActions}
                overshootRight={false}
                friction={2}
                enableTrackpadTwoFingerGesture
                rightThreshold={48}
                onSwipeableOpen={() => setSwipeOpenZoneId(zone.id)}
                onSwipeableClose={() =>
                  setSwipeOpenZoneId(prev => (prev === zone.id ? null : prev))
                }>
                <TouchableOpacity
                  style={[
                    styles.card,
                    { backgroundColor: colors.card },
                  ]}
                  onPress={() => {
                    handleViewZone(zone)
                    setDetailZone(zone)
                  }}
                  activeOpacity={0.7}>
                  <View style={[styles.cardBar, { backgroundColor: getSeverityColor(zone.rezon) }]} />
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{zone.name}</Text>
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {zone.rezon}
                    </Text>
                    <Text style={[styles.cardTime, { color: colors.textSecondary }]}>{formatTime(zone.date)}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name={isSelected ? 'map-marker-check' : 'map-marker-right'}
                    size={22}
                    color={isSelected ? COLORS.severityHigh : colors.textSecondary}
                    style={styles.cardIcon}
                  />
                </TouchableOpacity>
              </Swipeable>
            )
          })}
          {zonesForMap.length === 0 && !refreshing && (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>{t('dangerZones.noZonesNearby')}</Text>
          )}
        </ScrollView>
      </Animated.View>

      <DangerZoneDetailModal
        visible={!!detailZone}
        zone={detailZone}
        onClose={() => setDetailZone(null)}
        userLocation={userLocation}
        radiusKm={radiusKm}
      />
    </View>
  )
}

function LegendDot({ dotColor, label, labelColor }: { dotColor: string; label: string; labelColor: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.legendLabel, { color: labelColor }]}>{label}</Text>
    </View>
  )
}

function PendingReportCard({
  report,
  colors,
  onDismiss,
}: {
  report: PendingReport
  colors: any
  onDismiss: () => void
}) {
  const shimmer = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (report.status === 'sending') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
      ).start()
    } else {
      // Fade out smoothly before parent removes the card
      Animated.timing(fadeAnim, { toValue: 0, duration: 600, delay: 1200, useNativeDriver: true }).start()
    }
  }, [report.status])

  const barColor =
    report.status === 'success'
      ? '#22C55E'
      : report.status === 'error'
        ? COLORS.severityCritical
        : COLORS.primary

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] })

  const statusIcon = report.status === 'success' ? 'check-circle' : report.status === 'error' ? 'alert-circle' : 'clock-outline'
  const statusText =
    report.status === 'success'
      ? 'Rapport envoyé'
      : report.status === 'error'
        ? 'Échec — appuyez pour ignorer'
        : 'En cours de traitement…'

  return (
    <Animated.View style={[pendingStyles.card, { backgroundColor: colors.card, opacity: fadeAnim }]}>
      {/* Colour bar */}
      <Animated.View style={[pendingStyles.bar, { backgroundColor: barColor, opacity: report.status === 'sending' ? shimmerOpacity : 1 }]} />
      <View style={pendingStyles.content}>
        <View style={pendingStyles.row}>
          <MaterialCommunityIcons name={statusIcon} size={16} color={barColor} />
          <Text style={[pendingStyles.status, { color: barColor }]}>{statusText}</Text>
          {report.status !== 'sending' && (
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close" size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[pendingStyles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
          {report.rezon}
        </Text>
        {report.status === 'sending' && (
          <View style={[pendingStyles.progressTrack, { backgroundColor: colors.border }]}>
            <Animated.View style={[pendingStyles.progressFill, { backgroundColor: COLORS.primary, opacity: shimmerOpacity }]} />
          </View>
        )}
      </View>
    </Animated.View>
  )
}

const pendingStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  bar: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  status: { flex: 1, fontSize: 12, fontFamily: FONT_FAMILY.semiBold },
  desc: { fontSize: 12, lineHeight: 17 },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
  },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Floating header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 28 : 42,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeSegmentWrap: {
    marginTop: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    marginRight: 12,
  },
  backLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.semiBold,
    color: '#FFF',
    marginLeft: 2,
  },
  headerTitle: {
    flex: 1,
    marginRight: 6,
    fontSize: 22,
    fontFamily: FONT_FAMILY.extraBold,
    color: '#FFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  countBadge: {
    backgroundColor: COLORS.severityHigh,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    shadowColor: COLORS.severityHigh,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  countText: { fontSize: 14, fontFamily: FONT_FAMILY.bold, color: '#FFF' },

  // Floating legend
  legend: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 168 : 158,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    padding: 10,
    paddingRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendLabel: { fontSize: 10, fontFamily: FONT_FAMILY.semiBold, color: '#555' },

  mapControlsColumn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 168 : 158,
    right: 16,
    gap: 8,
    alignItems: 'flex-end',
  },
  mapControlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  mapControlPillHeatActive: {
    backgroundColor: COLORS.severityCritical,
  },
  mapControlPill3dActive: {
    backgroundColor: COLORS.severityInfo,
  },
  mapControlPillSatelliteActive: {
    backgroundColor: '#1565C0',
  },
  mapControlPillText: { fontSize: 11, fontFamily: FONT_FAMILY.bold, color: '#555' },
  mapControlPillTextOnLight: { color: '#FFF' },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 14, paddingBottom: 10 },
  handleBar: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#CCC' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 10,
  },
  cardSelected: {
    borderWidth: 1.5,
    // borderColor: COLORS.severityHigh,
    // shadowColor: COLORS.severityHigh,
    shadowOpacity: 0.15,
  },
  sheetListHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
    lineHeight: 28,
  },
  sheetTitleAndroid: { includeFontPadding: false },
  cardBar: { width: 4, alignSelf: 'stretch' },
  cardContent: { flex: 1, padding: 14 },
  cardTitle: { fontSize: 16, fontFamily: FONT_FAMILY.bold, color: '#222' },
  cardDesc: { fontSize: 12, color: '#888', marginTop: 3 },
  cardTime: { fontSize: 11, color: '#BBB', marginTop: 4 },
  cardIcon: { marginRight: 14 },
  empty: { textAlign: 'center', color: '#999', padding: 24, fontSize: 14 },

  swipeActionsRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'stretch',
  },
  swipeActionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  swipeActionLabel: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFF',
    textAlign: 'center',
  },
})
