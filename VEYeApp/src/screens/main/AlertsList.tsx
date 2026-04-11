import React, { useState, useEffect, useCallback, useContext, useRef } from 'react'
import {
  StyleSheet,
  View,
  Alert,
  TouchableOpacity,
  Text,
  RefreshControl,
  ScrollView,
  Modal,
  FlatList,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import firestore from '@react-native-firebase/firestore'
import { COLORS, SIZES, FONT_FAMILY } from '../../constants'
import { UserContext } from '../../context/UserContext'
import { useTheme } from '../../context/ThemeContext'
import { useIsTablet } from '../../utils/useIsTablet'
import MapPlaceholder from '../../components/MapPlaceholder'
import AlertCard from '../../components/AlertCard'
import AlertDetails from './AlertDetails'
import { Viktim } from '../../types/Viktim'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const { height: SCREEN_HEIGHT } = Dimensions.get('window')
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 64
const SHEET_COLLAPSED = 320
const SHEET_EXPANDED = SCREEN_HEIGHT - TAB_BAR_HEIGHT - 120

export default function AlertsList() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const isTablet = useIsTablet()
  const { userPreferences, radiusKm } = useContext(UserContext)
  const [filter, setFilter] = useState('kidnaping')
  const [viktims, setViktims] = useState<Viktim[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [mapSatellite, setMapSatellite] = useState(false)
  const sheetAnim = useRef(new Animated.Value(SHEET_COLLAPSED)).current
  const expandedRef = useRef(false)
  const [sheetExpanded, setSheetExpanded] = useState(false)

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        const current = expandedRef.current ? SHEET_EXPANDED : SHEET_COLLAPSED
        const next = current - g.dy
        const clamped = Math.max(SHEET_COLLAPSED, Math.min(SHEET_EXPANDED, next))
        sheetAnim.setValue(clamped)
      },
      onPanResponderRelease: (_, g) => {
        const mid = (SHEET_COLLAPSED + SHEET_EXPANDED) / 2
        const current = expandedRef.current ? SHEET_EXPANDED : SHEET_COLLAPSED
        const projected = current - g.dy
        const target = projected > mid ? SHEET_EXPANDED : SHEET_COLLAPSED
        expandedRef.current = target === SHEET_EXPANDED
        setSheetExpanded(target === SHEET_EXPANDED)
        Animated.spring(sheetAnim, { toValue: target, useNativeDriver: false, bounciness: 4, speed: 14 }).start()
      },
    }),
  ).current

  const FILTERS = [
    { key: 'all', label: t('alerts.filterAll'), color: null as string | null, bg: null as string | null },
    { key: 'kidnaping', label: t('alerts.filterKidnapped'), color: COLORS.white, bg: COLORS.severityCritical },
    { key: 'disparut', label: t('alerts.filterMissing'), color: '#333', bg: '#FDE68A' },
    { key: 'released', label: t('alerts.filterReleased'), color: COLORS.white, bg: '#22C55E' },
    { key: 'danger', label: t('alerts.filterShooting'), color: COLORS.white, bg: COLORS.severityHigh },
  ]

  const fetchAlerts = useCallback(() => {
    setLoading(true)
    let list: Viktim[] = []
    let query = firestore().collection('Viktim') as any
    if (filter === 'released') {
      query = query.where('status', '==', 'Libérer')
    } else if (filter !== 'all') {
      query = query.where('type', '==', filter)
    }
    query = query.orderBy('date', 'desc')
    query
      .get()
      .then((snap: any) => {
        snap.forEach((doc: any) => {
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
  }, [filter, t])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  // Sync sheetExpanded during drag for pointerEvents
  const prevExpandedRef = useRef(false)
  useEffect(() => {
    const id = sheetAnim.addListener(({ value }) => {
      const expanded = value > (SHEET_COLLAPSED + SHEET_EXPANDED) / 2
      if (expanded !== prevExpandedRef.current) {
        prevExpandedRef.current = expanded
        setSheetExpanded(expanded)
      }
    })
    return () => sheetAnim.removeListener(id)
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchAlerts()
    setRefreshing(false)
  }

  const userLocation = userPreferences?.latitude
    ? { latitude: Number(userPreferences.latitude), longitude: Number(userPreferences.longitude) }
    : null

  const markers =
    viktims
      .map(v => {
        if (!v.latitude || !v.longitude) return null
        return {
          id: String(v.id ?? ''),
          coordinate: {
            latitude: Number(v.latitude),
            longitude: Number(v.longitude),
          },
          title: v.fullName,
          description:
            [v.status, v.city, v.details].filter(Boolean).join(' · ') || undefined,
          pinColor:
            v.status === 'Libérer' ? '#22C55E' : COLORS.severityCritical,
        }
      })
      .filter(
        (m): m is NonNullable<typeof m> => m !== null,
      )

  const renderItem = ({ item }: { item: any }) => (
    <AlertCard
      item={item}
      userLocation={userLocation}
      onPress={() => setSelectedAlert(item)}
      showActions
    />
  )

  // ─── Shared sub-components ────────────────────────────────────────────────

  const filterBar = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipContainer}>
      {FILTERS.map(f => {
        const active = filter === f.key
        const bg = f.bg ?? colors.inputBg
        const fg = f.color ?? colors.text
        return (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.chip,
              active
                ? { backgroundColor: bg }
                : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => setFilter(f.key)}>
            <Text style={[styles.chipText, { color: active ? fg : colors.textSecondary }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )

  const alertList = (
    <>
      {loading ? (
        <View style={styles.loadingBox}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={viktims}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.id || ''}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('alerts.noAlertsFound')}</Text>
            </View>
          }
        />
      )}
    </>
  )

  const mapView = (
    <MapPlaceholder
      height="full"
      region={userLocation ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: (radiusKm / 111) * 2.5,
        longitudeDelta: (radiusKm / 111) * 2.5,
      } : undefined}
      markers={markers}
      radiusOverlay={userLocation ? { center: userLocation, radiusKm } : undefined}
      showHeatmap={showHeatmap}
      satellite={mapSatellite}
      heatmapPoints={viktims
        .map(v =>
          v.latitude && v.longitude
            ? {
              latitude: Number(v.latitude),
              longitude: Number(v.longitude),
            }
            : null,
        )
        .filter(
          (p): p is { latitude: number; longitude: number } => p !== null,
        )}
    />
  )

  // ─── iPad split layout ─────────────────────────────────────────────────────
  if (isTablet) {
    return (
      <View style={[styles.tabletContainer, { backgroundColor: colors.background }]}>
        {/* Detail modal (still uses modal on iPad for full detail view) */}
        <Modal visible={!!selectedAlert} animationType="slide" presentationStyle="formSheet">
          {selectedAlert && (
            <AlertDetails alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
          )}
        </Modal>

        {/* Left panel — list */}
        <View style={[styles.tabletListPanel, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.tabletListHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerRow}>
              <Text style={[styles.tabletListTitle, { color: colors.text }]}>{t('alerts.title')}</Text>
              <View style={styles.alertCountBadge}>
                <Text style={styles.alertCountText}>{viktims?.length || 0}</Text>
              </View>
            </View>
            <View style={styles.tabletFilterRow}>{filterBar}</View>
          </View>
          {alertList}
        </View>

        {/* Right panel — map */}
        <View style={styles.tabletMapPanel}>
          {mapView}
          <View style={styles.tabletMapFabStack}>
            <TouchableOpacity
              style={[styles.heatmapToggle, styles.mapFabInStack, showHeatmap && styles.heatmapToggleActive]}
              onPress={() => setShowHeatmap(prev => !prev)}
              activeOpacity={0.7}>
              <MaterialCommunityIcons name="fire" size={18} color={showHeatmap ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.heatmapToggleText, { color: showHeatmap ? undefined : colors.textSecondary }, showHeatmap && styles.heatmapToggleTextActive]}>
                {t('map.heatmap')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.heatmapToggle,
                styles.mapFabInStack,
                { backgroundColor: mapSatellite ? undefined : 'rgba(255,255,255,0.92)' },
                mapSatellite && styles.mapFabSatelliteActive,
              ]}
              onPress={() => setMapSatellite(prev => !prev)}
              activeOpacity={0.7}>
              <MaterialCommunityIcons name="satellite-variant" size={18} color={mapSatellite ? '#FFF' : colors.textSecondary} />
              <Text
                style={[
                  styles.heatmapToggleText,
                  { color: !mapSatellite ? colors.textSecondary : undefined },
                  mapSatellite && styles.heatmapToggleTextActive,
                ]}>
                {t('map.satellite')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  // ─── Phone layout (unchanged) ──────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Modal visible={!!selectedAlert} animationType="slide" presentationStyle="pageSheet">
        {selectedAlert && (
          <AlertDetails alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
        )}
      </Modal>

      {/* Full-screen map with alert markers */}
      {mapView}

      {/* Floating header with title */}
      <View style={styles.floatingHeader}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('alerts.title')}</Text>
          <View style={styles.alertCountBadge}>
            <Text style={styles.alertCountText}>{viktims?.length || 0}</Text>
          </View>
        </View>
      </View>

      {/* Heatmap toggle - hide when sheet expands */}
      <Animated.View
        style={[
          styles.heatmapToggleWrapper,
          {
            opacity: sheetAnim.interpolate({
              inputRange: [SHEET_COLLAPSED, (SHEET_COLLAPSED + SHEET_EXPANDED) / 2],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
            transform: [{
              translateY: sheetAnim.interpolate({
                inputRange: [SHEET_COLLAPSED, SHEET_EXPANDED],
                outputRange: [0, -40],
                extrapolate: 'clamp',
              }),
            }],
          },
        ]}
        pointerEvents={sheetExpanded ? 'none' : 'auto'}>
        <View style={styles.phoneMapFabStack}>
          <TouchableOpacity
            style={[
              styles.heatmapToggle,
              styles.mapFabInStack,
              { backgroundColor: showHeatmap ? undefined : colors.card },
              showHeatmap && styles.heatmapToggleActive,
            ]}
            onPress={() => setShowHeatmap(prev => !prev)}
            activeOpacity={0.7}>
            <MaterialCommunityIcons name="fire" size={18} color={showHeatmap ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.heatmapToggleText, { color: showHeatmap ? undefined : colors.textSecondary }, showHeatmap && styles.heatmapToggleTextActive]}>
              {t('map.heatmap')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.heatmapToggle,
              styles.mapFabInStack,
              { backgroundColor: mapSatellite ? undefined : colors.card },
              mapSatellite && styles.mapFabSatelliteActive,
            ]}
            onPress={() => setMapSatellite(prev => !prev)}
            activeOpacity={0.7}>
            <MaterialCommunityIcons name="satellite-variant" size={18} color={mapSatellite ? '#FFF' : colors.textSecondary} />
            <Text
              style={[
                styles.heatmapToggleText,
                { color: !mapSatellite ? colors.textSecondary : undefined },
                mapSatellite && styles.heatmapToggleTextActive,
              ]}>
              {t('map.satellite')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Floating filter chips - animate hide when sheet expands */}
      <Animated.View
        style={[
          styles.chipWrapper,
          {
            transform: [{
              translateY: sheetAnim.interpolate({
                inputRange: [SHEET_COLLAPSED, SHEET_EXPANDED],
                outputRange: [0, -40],
                extrapolate: 'clamp',
              }),
            }],
          },
        ]}
        pointerEvents={sheetExpanded ? 'none' : 'auto'}>
        {filterBar}
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View style={[styles.bottomSheet, { height: sheetAnim, backgroundColor: colors.card }]}>
        <View {...panResponder.panHandlers} style={styles.sheetHandle}>
          <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
        </View>
        {alertList}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // ── iPad split layout ──
  tabletContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  tabletListPanel: {
    width: 320,
    borderRightWidth: StyleSheet.hairlineWidth,
    flexDirection: 'column',
  },
  tabletListHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  tabletListTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.extraBold,
    letterSpacing: -0.3,
  },
  tabletFilterRow: {
    marginHorizontal: -16,
  },
  tabletMapFabStack: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    right: 16,
    gap: 8,
    alignItems: 'flex-end',
  },
  mapFabSatelliteActive: {
    backgroundColor: '#1565C0',
  },
  phoneMapFabStack: {
    gap: 8,
    alignItems: 'flex-end',
  },
  mapFabInStack: {
    position: 'relative',
    top: 0,
    right: 0,
  },
  tabletMapPanel: {
    flex: 1,
    position: 'relative',
  },

  // Floating header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 38 : 44,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: FONT_FAMILY.extraBold,
    color: '#FFF',
    flex: 1,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  alertCountBadge: {
    backgroundColor: COLORS.severityCritical,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    shadowColor: COLORS.severityCritical,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  alertCountText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: '#FFF',
  },

  heatmapToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 54,
    right: 16,
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
  heatmapToggleActive: {
    backgroundColor: COLORS.severityCritical,
  },
  heatmapToggleText: { fontSize: 11, fontFamily: FONT_FAMILY.bold, color: '#555' },
  heatmapToggleTextActive: { color: '#FFF' },

  // Floating chips
  chipWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 86,
    left: 0,
    right: 0,
  },
  chipContainer: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chipText: { fontSize: 13, fontFamily: FONT_FAMILY.semiBold },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handleBar: { width: 120, height: 8, borderRadius: 12, backgroundColor: '#DDD', margin: 12 },

  listContent: { paddingBottom: 20 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  loadingText: { fontSize: 14, color: '#999' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999' },
  heatmapToggleWrapper: { position: 'absolute', top: Platform.OS === 'ios' ? 68 : 54, right: 16 },
})
