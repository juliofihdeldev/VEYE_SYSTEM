import { useWindowDimensions, Platform } from 'react-native'

/**
 * Returns true when the device is an iPad (or large Android tablet).
 * We treat any screen with a shortest edge >= 768 pts as a tablet.
 */
export function useIsTablet(): boolean {
  const { width, height } = useWindowDimensions()
  const shortEdge = Math.min(width, height)
  return Platform.OS === 'ios'
    ? Platform.isPad === true
    : shortEdge >= 768
}
