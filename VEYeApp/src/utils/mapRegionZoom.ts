import { Dimensions } from 'react-native'
import type { Region } from 'react-native-maps'

/** Approximate map zoom from visible longitude span (Web Mercator tile math). */
export function approximateZoomFromRegion(region: Region, mapWidthPx?: number): number {
  const w = mapWidthPx ?? Dimensions.get('window').width
  const lonDelta = Math.max(region.longitudeDelta, 1e-12)
  return Math.log2((360 * w) / (256 * lonDelta))
}

export function bboxFromRegion(region: Region): [number, number, number, number] {
  const north = region.latitude + region.latitudeDelta / 2
  const south = region.latitude - region.latitudeDelta / 2
  const east = region.longitude + region.longitudeDelta / 2
  const west = region.longitude - region.longitudeDelta / 2
  return [west, south, east, north]
}
