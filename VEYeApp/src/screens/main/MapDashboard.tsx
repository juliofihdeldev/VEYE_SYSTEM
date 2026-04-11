import React, { useCallback, useEffect, useState, useContext, useRef, useMemo } from 'react'
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  PermissionsAndroid,
  TouchableOpacity,
  Text,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import MapPlaceholder from '../../components/MapPlaceholder'
import MapTimeSegmentControl from '../../components/MapTimeSegmentControl'
import {
  filterItemsByMapTimeRange,
  isWithinLastMs,
  MAP_LIVE_WINDOW_MS,
  type MapTimeRange,
} from '../../utils/dangerZoneTimeFilter'
import { nearestDangerBearingWithinKm } from '../../utils/dangerProximity'
import { useNavigation } from '@react-navigation/native'
import Geolocation from '@react-native-community/geolocation'
import firestore from '@react-native-firebase/firestore'
import { UserContext } from '../../context/UserContext'
import { AlertContext } from '../../context/AlertContext'
import { useTheme } from '../../context/ThemeContext'
import { COLORS, FONT_FAMILY } from '../../constants'
import AlertCard from '../../components/AlertCard'
import AlertDetails from './AlertDetails'
import {
  incidentSlugFromZone,
  mapIconForIncidentSlug,
  colorForDangerMapIcon,
} from '../../utils/dangerZoneMapIcon'

type MapVictimRow = {
  id: string
  fullName?: string
  status?: string
  date?: unknown
  city?: string
  details?: string
  amount?: unknown
  imageSource?: string
  latitude?: number
  longitude?: number
}

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 64
const SHEET_MIN = 120
const SHEET_MID = 190
const SHEET_EXPANDED = SCREEN_HEIGHT - TAB_BAR_HEIGHT - 120
const SHEET_TITLE_FADE_BAND = 80

const SHEET_SNAP_POINTS = [SHEET_MIN, SHEET_MID, SHEET_EXPANDED]

function nearestSheetSnap(height: number): number {
  return SHEET_SNAP_POINTS.reduce((best, p) =>
    Math.abs(p - height) < Math.abs(best - height) ? p : best,
  )
}

function LegendRow({
  label,
  color,
  textSecondary,
}: {
  label: string
  color: string
  textSecondary: string
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: textSecondary }]}>{label}</Text>
    </View>
  )
}

function MapSheetAlertCard({
  item,
  userLocation,
  onOpen,
}: {
  item: MapVictimRow
  userLocation: { latitude: number; longitude: number } | null
  onOpen: () => void
}) {
  return (
    <AlertCard
      item={{ ...item, type: 'kidnapping' }}
      userLocation={userLocation}
      onPress={onOpen}
      compact
    />
  )
}

export default function MapDashboard() {
  const { t } = useTranslation()
  const navigation = useNavigation<any>()
  const { colors } = useTheme()
  const { userPreferences, handleUserPreferences, radiusKm } = useContext(UserContext)
  const { filteredDangerZones = [], handleGetALert } = useContext(AlertContext)
  const [viktims, setViktims] = useState<MapVictimRow[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [map3D, setMap3D] = useState(false)
  const [mapSatellite, setMapSatellite] = useState(false)
  const [mapTimeRange, setMapTimeRange] = useState<MapTimeRange>('all')
  const sheetAnim = useRef(new Animated.Value(SHEET_MID)).current
  const sheetDragStartHeightRef = useRef(SHEET_MID)

  const sheetHeaderOpacity = sheetAnim.interpolate({
    inputRange: [SHEET_MIN, SHEET_MIN + SHEET_TITLE_FADE_BAND],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 4,
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

  const zonesForMap = useMemo(
    () => filterItemsByMapTimeRange(filteredDangerZones || [], mapTimeRange),
    [filteredDangerZones, mapTimeRange],
  )

  const viktimsForMap = useMemo(
    () => filterItemsByMapTimeRange(Array.isArray(viktims) ? viktims : [], mapTimeRange),
    [viktims, mapTimeRange],
  )

  const latestDangerZoneName = zonesForMap?.[0]?.name

  const userMapCoord =
    userPreferences?.latitude != null && userPreferences?.longitude != null
      ? {
          latitude: Number(userPreferences.latitude),
          longitude: Number(userPreferences.longitude),
        }
      : null

  const dangerBearing = useMemo(() => {
    if (!userMapCoord) return null
    return (
      nearestDangerBearingWithinKm(
        userMapCoord.latitude,
        userMapCoord.longitude,
        zonesForMap,
      ) ?? null
    )
  }, [userMapCoord, zonesForMap])

  const mapMarkers = useMemo(() => {
    const zones = zonesForMap
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
      })
    const victims = viktimsForMap
      .filter((v: MapVictimRow) => v.latitude != null && v.longitude != null)
      .map(v => ({
        id: `vk-${v.id}`,
        coordinate: {
          latitude: Number(v.latitude),
          longitude: Number(v.longitude),
        },
        title: v.fullName,
        description:
          [v.status, v.city, v.details].filter(Boolean).join(' · ') || undefined,
        mapIcon: 'pistol' as const,
        pinColor: COLORS.severityCritical,
        pulse: isWithinLastMs(v.date, MAP_LIVE_WINDOW_MS),
      }))
    return [...zones, ...victims]
  }, [zonesForMap, viktimsForMap])

  /** Same sources as map markers so heatmap matches Danger Zones (viktims alone are often without coords or too sparse per grid cell). */
  const heatmapPoints = useMemo(() => {
    const zonePts = zonesForMap
      .filter((z: any) => z.latitude != null && z.longitude != null)
      .map((z: any) => ({
        latitude: Number(z.latitude),
        longitude: Number(z.longitude),
      }))
    const victimPts = viktimsForMap
      .filter((v: MapVictimRow) => v.latitude != null && v.longitude != null)
      .map(v => ({
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
      }))
    return [...zonePts, ...victimPts]
  }, [zonesForMap, viktimsForMap])

  const LEGEND = [
    { label: t('severity.kidnapping'), color: COLORS.severityCritical },
    { label: t('severity.dangerZone'), color: COLORS.severityHigh },
    { label: t('severity.missing'), color: '#EAB308' },
    { label: t('severity.info'), color: COLORS.severityInfo },
  ]

  const location = userPreferences?.address || t('map.defaultLocation')

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: t('permissions.locationTitle'),
            message: t('permissions.locationMessage'),
            buttonNeutral: t('permissions.askLater'),
            buttonNegative: t('common.cancel'),
            buttonPositive: t('common.ok'),
          },
        )
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentPosition()
        }
      } catch (err) {
        getCurrentPosition()
      }
    } else {
      getCurrentPosition()
    }
  }

  const getCurrentPosition = useCallback(() => {
    Geolocation.getCurrentPosition(
      async pos => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
        handleUserPreferences({
          ...userPreferences,
          latitude: coords.latitude,
          longitude: coords.longitude,
          coords: { latitude: String(coords.latitude), longitude: String(coords.longitude) },
        } as any)
      },
      () => { },
      { enableHighAccuracy: true }
    )
  }, [userPreferences, handleUserPreferences])

  const fetchAlerts = useCallback(() => {
    setLoading(true)
    let list: MapVictimRow[] = []
    firestore()
      .collection('Viktim')
      .where('type', '==', 'kidnaping')
      .orderBy('date', 'desc')
      .limit(5)
      .get()
      .then(snap => {
        snap.forEach(doc => {
          const d = doc.data()
          list.push({
            id: doc.id, fullName: d.fullName, status: d.status,
            date: d.date, city: d.city, details: d.details,
            amount: d.amount, imageSource: d.imageSource,
            latitude: d.latitude, longitude: d.longitude,
          })
        })
        setViktims(list)
        setLoading(false)
      })
      .catch(() => {
        setViktims([])
        setLoading(false)
      })
  }, [t])

  useEffect(() => { requestLocationPermission() }, [])
  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const onRefresh = () => {
    setRefreshing(true)
    fetchAlerts()
    getCurrentPosition()
    handleGetALert?.()
    setRefreshing(false)
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Modal visible={!!selectedAlert} animationType="slide" presentationStyle="pageSheet">
        {selectedAlert && <AlertDetails alert={selectedAlert} onClose={() => setSelectedAlert(null)} />}
      </Modal>

      {/* Full-screen map */}
      <MapPlaceholder
        height="full"
        enable3D={map3D}
        region={userPreferences?.latitude ? {
          latitude: Number(userPreferences.latitude),
          longitude: Number(userPreferences.longitude),
          latitudeDelta: (radiusKm / 111) * 2.5,
          longitudeDelta: (radiusKm / 111) * 2.5,
        } : undefined}
        markers={mapMarkers}
        radiusOverlay={userPreferences?.latitude ? {
          center: { latitude: Number(userPreferences.latitude), longitude: Number(userPreferences.longitude) },
          radiusKm,
        } : undefined}
        showHeatmap={showHeatmap}
        heatmapPoints={heatmapPoints}
        satellite={mapSatellite}
        dangerBearing={dangerBearing}
      />

      {/* Floating header */}
      <View style={styles.floatingHeader}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>
              <Text style={styles.logoV}>v</Text>
              <Text style={[styles.logoYe, { color: colors.text }]}>ye</Text>
            </Text>
            {location && (
              <View style={[styles.locationPill, { backgroundColor: colors.card }]}>
                <MaterialCommunityIcons name="map-marker" size={14} color={COLORS.severityCritical} />
                <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>{location}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
              <MaterialCommunityIcons name="account-circle" size={34} color="#FFF" />
            </TouchableOpacity>
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
        {LEGEND.map(l =>
          React.createElement(LegendRow, {
            key: l.label,
            label: l.label,
            color: l.color,
            textSecondary: colors.textSecondary,
          }),
        )}
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

        <Animated.View>
          {/* Danger zone floating card */}
          <TouchableOpacity
            style={[styles.dangerCard, { backgroundColor: COLORS.severityHigh + '15', borderColor: COLORS.severityHigh + '30' }]}
            onPress={() => navigation.navigate('DangerZones')}
            activeOpacity={0.7}>
            <View style={[styles.dangerDot, { backgroundColor: COLORS.severityHigh }]} />
            <View style={styles.dangerInfo}>
              <Text style={styles.dangerLabel}>{t('map.dangerZone')}</Text>
              <Text style={[styles.dangerDesc, { color: colors.text }]} numberOfLines={1}>
                {latestDangerZoneName
                  ? t('map.dangerZoneLatest', { name: latestDangerZoneName })
                  : t('map.dangerZoneNoLatest')}
              </Text>
            </View>
            <View style={styles.dangerArrow}>
              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Nearby alerts */}
          <View style={styles.alertsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('map.nearbyAlerts')}</Text>
            <Text style={styles.alertCount}>{viktimsForMap?.length || 0}</Text>
          </View>
        </Animated.View>

        <ScrollView
          style={styles.alertsScroll}
          contentContainerStyle={styles.alertsContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled>

          {!loading && viktimsForMap?.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('map.noAlertsNearby')}</Text>
          )}
          {viktimsForMap.slice(0, 7).map(item =>
            React.createElement(MapSheetAlertCard, {
              key: item.id,
              item,
              userLocation:
                userPreferences?.latitude
                  ? {
                    latitude: Number(userPreferences.latitude),
                    longitude: Number(userPreferences.longitude),
                  }
                  : null,
              onOpen: () => setSelectedAlert(item),
            }),
          )}
        </ScrollView>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Floating header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 38 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  logo: { fontSize: 32, fontFamily: FONT_FAMILY.black, letterSpacing: -0.5 },
  logoV: { color: COLORS.severityCritical, fontFamily: FONT_FAMILY.black },
  logoYe: { color: '#FFF', fontFamily: FONT_FAMILY.extraBold },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    maxWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  locationText: { fontSize: 12, color: '#333', marginLeft: 5, fontFamily: FONT_FAMILY.semiBold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileBtn: { padding: 2 },

  // Floating legend
  timeSegmentWrap: {
    marginTop: 10,
    marginHorizontal: 0,
  },
  legend: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 168 : 152,
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
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 10, fontFamily: FONT_FAMILY.semiBold, color: '#555', letterSpacing: 0.3 },

  mapControlsColumn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 168 : 152,
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
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handleBar: {
    width: 120,
    height: 8,
    borderRadius: 12,
    backgroundColor: '#DDD',
    margin: 12,
  },

  // Danger card
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.severityHigh + '30',
  },
  dangerDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  dangerInfo: { flex: 1 },
  dangerLabel: { fontSize: 11, fontFamily: FONT_FAMILY.extraBold, color: COLORS.severityHigh, letterSpacing: 0.5, marginBottom: 1 },
  dangerDesc: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold, color: '#333' },
  dangerArrow: { padding: 4 },

  // Alerts section
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.extraBold,
    color: '#111',
    flex: 1,
    letterSpacing: -0.3,
  },
  alertCount: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFF',
    backgroundColor: COLORS.severityCritical,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  alertsScroll: { flex: 1 },
  alertsContent: { paddingBottom: 20 },
  emptyText: { fontSize: 14, color: '#999', paddingHorizontal: 16, marginBottom: 12 },
})
