import { getDistanceKm } from './distance'

export const NEAR_DANGER_RADIUS_KM = 5

export type DangerBearingLine = {
  from: { latitude: number; longitude: number }
  to: { latitude: number; longitude: number }
}

export function nearestDangerBearingWithinKm(
  userLat: number,
  userLng: number,
  zones: Array<{ latitude?: unknown; longitude?: unknown }>,
  maxKm: number = NEAR_DANGER_RADIUS_KM,
): DangerBearingLine | undefined {
  let bestDist = Infinity
  let best: { latitude: number; longitude: number } | null = null
  for (const z of zones) {
    if (z.latitude == null || z.longitude == null) continue
    const zLat = Number(z.latitude)
    const zLng = Number(z.longitude)
    if (!Number.isFinite(zLat) || !Number.isFinite(zLng)) continue
    const d = getDistanceKm(userLat, userLng, zLat, zLng)
    if (d <= maxKm && d < bestDist) {
      bestDist = d
      best = { latitude: zLat, longitude: zLng }
    }
  }
  if (!best) return undefined
  return {
    from: { latitude: userLat, longitude: userLng },
    to: best,
  }
}
