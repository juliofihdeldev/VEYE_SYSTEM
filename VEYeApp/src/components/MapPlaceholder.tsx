import React, { useMemo, useEffect, useRef, useState, forwardRef } from 'react'
import { View, StyleSheet, Animated, Text } from 'react-native'
import MapView, { Marker, Circle, Polyline, type Region } from 'react-native-maps'
import Supercluster from 'supercluster'
import { COLORS } from '../constants'
import { buildHeatSpots, getHeatColor } from '../utils/heatmap'
import type { DangerMapIconName } from '../utils/dangerZoneMapIcon'
import { bboxFromRegion, approximateZoomFromRegion } from '../utils/mapRegionZoom'
import type { DangerBearingLine } from '../utils/dangerProximity'

const MaterialCommunityIcons =
  require('react-native-vector-icons/MaterialCommunityIcons').default

const HAITI_REGION: Region = {
  latitude: 18.5944,
  longitude: -72.3074,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
}

const HAITI_CAMERA = {
  center: { latitude: 18.5944, longitude: -72.3074 },
  pitch: 45,
  heading: 0,
  altitude: 3000,
  zoom: 15,
}

export function mapVariantToMapType(
  enable3D: boolean,
  satellite: boolean,
): 'standard' | 'satellite' | 'hybrid' | 'mutedStandard' {
  if (satellite) return 'hybrid'
  return enable3D ? 'mutedStandard' : 'standard'
}

export type MapScreenMarker = {
  id: string
  coordinate: { latitude: number; longitude: number }
  title?: string
  description?: string
  pinColor?: string
  mapIcon?: DangerMapIconName
  /** Recent (~72h) incidents — pulsing emphasis */
  pulse?: boolean
}

type MapComponentProps = {
  height?: number | string
  showLabel?: boolean
  region?: Region
  markers?: MapScreenMarker[]
  /** When zoomed out, group nearby markers into count bubbles */
  clusterMarkers?: boolean
  radiusOverlay?: {
    center: { latitude: number; longitude: number }
    radiusKm: number
    color?: string
  }
  heatmapPoints?: Array<{ latitude: number; longitude: number }>
  showHeatmap?: boolean
  scrollEnabled?: boolean
  zoomEnabled?: boolean
  enable3D?: boolean
  satellite?: boolean
  /** Line from user to nearest danger within threshold (drawn in red) */
  dangerBearing?: DangerBearingLine | null
  /**
   * When false, skips storing visible region on `onRegionChangeComplete`.
   * Avoids re-render churn (flicker) for static “preview” maps inside scroll views.
   */
  trackVisibleRegion?: boolean
  children?: React.ReactNode
}

function PulsingWrap({ active, children }: { active: boolean; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!active) {
      scale.setValue(1)
      return
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.14,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(scale, { toValue: 1, duration: 850, useNativeDriver: true }),
      ]),
    )
    anim.start()
    return () => anim.stop()
  }, [active, scale])
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
}

const MapPlaceholder = forwardRef<MapView, MapComponentProps>(function MapPlaceholder(
  {
    height = 200,
    region,
    markers = [],
    clusterMarkers = true,
    radiusOverlay,
    heatmapPoints,
    showHeatmap = false,
    scrollEnabled = true,
    zoomEnabled = true,
    enable3D = false,
    satellite = false,
    dangerBearing,
    trackVisibleRegion = true,
    children,
  },
  ref,
) {
  const heatSpots = useMemo(
    () => (showHeatmap && heatmapPoints ? buildHeatSpots(heatmapPoints) : []),
    [showHeatmap, heatmapPoints],
  )
  const mapType = mapVariantToMapType(enable3D, satellite)

  const [visibleRegion, setVisibleRegion] = useState<Region | null>(null)

  const effectiveRegion = visibleRegion ?? region ?? HAITI_REGION

  const clusterer = useMemo(() => {
    if (!clusterMarkers || markers.length === 0) return null
    const sc = new Supercluster({ radius: 52, maxZoom: 16, minPoints: 2 })
    const feats = markers.map(m => ({
      type: 'Feature' as const,
      properties: { mid: m.id },
      geometry: {
        type: 'Point' as const,
        coordinates: [m.coordinate.longitude, m.coordinate.latitude] as [number, number],
      },
    }))
    sc.load(feats)
    return sc
  }, [clusterMarkers, markers])

  const markerById = useMemo(() => new Map(markers.map(m => [m.id, m])), [markers])

  const clusteredItems = useMemo(() => {
    if (!clusterer) return null
    const b = bboxFromRegion(effectiveRegion)
    const z = Math.min(
      16,
      Math.max(0, Math.round(approximateZoomFromRegion(effectiveRegion))),
    )
    return clusterer.getClusters(b, z)
  }, [
    clusterer,
    effectiveRegion.latitude,
    effectiveRegion.longitude,
    effectiveRegion.latitudeDelta,
    effectiveRegion.longitudeDelta,
  ])

  const camera = enable3D
    ? {
        center: region
          ? { latitude: region.latitude, longitude: region.longitude }
          : HAITI_CAMERA.center,
        pitch: 45,
        heading: 0,
        altitude: 3000,
        zoom: 15,
      }
    : undefined

  const mapRef = useRef<MapView | null>(null)
  const setMapRef = (node: MapView | null) => {
    mapRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as React.MutableRefObject<MapView | null>).current = node
  }

  const onRegionChangeComplete = trackVisibleRegion
    ? (r: Region) => {
        setVisibleRegion(r)
      }
    : undefined

  const renderIconMarker = (m: MapScreenMarker) => {
    const body = (
      <View style={styles.iconMarkerWrap}>
        <View
          style={[
            styles.iconMarkerDisc,
            { backgroundColor: m.pinColor || COLORS.severityHigh },
          ]}>
          <MaterialCommunityIcons name={m.mapIcon!} size={10} color="#FFF" />
        </View>
      </View>
    )
    return (
      <Marker
        key={m.id}
        coordinate={m.coordinate}
        title={m.title}
        description={m.description}
        anchor={{ x: 0.5, y: 1 }}
        tracksViewChanges={!!m.pulse}>
        {m.pulse ? <PulsingWrap active>{body}</PulsingWrap> : body}
      </Marker>
    )
  }

  const renderDefaultPinMarker = (m: MapScreenMarker) => (
    <Marker
      key={m.id}
      coordinate={m.coordinate}
      title={m.title}
      description={m.description}
      pinColor={m.pinColor}
      tracksViewChanges={false}
    />
  )

  const zoomIntoCluster = (lat: number, lng: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: effectiveRegion.latitudeDelta * 0.45,
        longitudeDelta: effectiveRegion.longitudeDelta * 0.45,
      },
      220,
    )
  }

  let markerNodes: React.ReactNode = null

  if (!markers.length) {
    markerNodes = null
  } else if (!clusterMarkers || !clusteredItems) {
    markerNodes = markers.map(m =>
      m.mapIcon ? renderIconMarker(m) : renderDefaultPinMarker(m),
    )
  } else {
    markerNodes = clusteredItems.map((f, idx) => {
      const [lng, lat] = f.geometry.coordinates as [number, number]
      const p = f.properties as {
        cluster?: boolean
        point_count?: number
        cluster_id?: number
        mid?: string
      }
      if (p.cluster) {
        const count = p.point_count ?? 0
        return (
          <Marker
            key={`c-${p.cluster_id ?? f.id ?? idx}-${lat}-${lng}`}
            coordinate={{ latitude: lat, longitude: lng }}
            onPress={() => zoomIntoCluster(lat, lng)}
            tracksViewChanges={false}>
            <View style={styles.clusterBubble}>
              <Text style={styles.clusterCount}>{count}</Text>
            </View>
          </Marker>
        )
      }
      const mid = p.mid
      const m = mid ? markerById.get(mid) : undefined
      if (!m) return null
      return m.mapIcon ? renderIconMarker(m) : renderDefaultPinMarker(m)
    })
  }

  return (
    <View style={[styles.container, typeof height === 'number' ? { height } : { flex: 1 }]}>
      <MapView
        ref={setMapRef}
        key={`${enable3D ? '3d' : '2d'}-${satellite ? 'sat' : 'std'}`}
        style={styles.map}
        {...(camera ? { camera } : { initialRegion: region || HAITI_REGION })}
        mapType={mapType}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
        pitchEnabled={enable3D}
        rotateEnabled={enable3D}
        showsBuildings={enable3D}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={onRegionChangeComplete ?? undefined}>
        {radiusOverlay && (
          <Circle
            center={radiusOverlay.center}
            radius={radiusOverlay.radiusKm * 1000}
            strokeColor={radiusOverlay.color || 'rgba(176, 19, 35, 0.5)'}
            fillColor={
              radiusOverlay.color
                ? radiusOverlay.color.replace(/[\d.]+\)$/, '0.08)')
                : 'rgba(220, 53, 69, 0.06)'
            }
            strokeWidth={1.5}
          />
        )}
        {heatSpots.map((spot, i) => (
          <Circle
            key={`heat-${i}`}
            center={spot.center}
            radius={spot.radiusMeters}
            strokeColor={getHeatColor(spot.weight, 0.6)}
            fillColor={getHeatColor(spot.weight, 0.25 + spot.weight * 0.2)}
            strokeWidth={0}
            zIndex={0}
          />
        ))}
        {dangerBearing ? (
          <Polyline
            coordinates={[dangerBearing.from, dangerBearing.to]}
            strokeColor={COLORS.severityCritical}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        {markerNodes}
        {children}
      </MapView>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 0,
  },
  map: {
    flex: 1,
  },
  iconMarkerWrap: {
    alignItems: 'center',
  },
  iconMarkerDisc: {
    width: 28,
    height: 28,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterBubble: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(176, 19, 35, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  clusterCount: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
})

export default MapPlaceholder
