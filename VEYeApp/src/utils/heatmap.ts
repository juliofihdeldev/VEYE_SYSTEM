type LatLng = { latitude: number; longitude: number }

export type HeatSpot = {
  center: LatLng
  weight: number
  radiusMeters: number
}

/**
 * Grid-based spatial clustering that groups nearby coordinates
 * and returns weighted heat spots for rendering as map circles.
 *
 * @param points   Array of { latitude, longitude }
 * @param cellKm   Grid cell size in km (controls cluster granularity)
 * @returns        Array of HeatSpot with center, weight (0-1), and radius
 */
export function buildHeatSpots(
  points: LatLng[],
  cellKm: number = 0.2,
): HeatSpot[] {
  if (!points.length) return []

  const cellDeg = cellKm / 111

  const buckets = new Map<string, LatLng[]>()

  for (const p of points) {
    const gx = Math.floor(p.latitude / cellDeg)
    const gy = Math.floor(p.longitude / cellDeg)
    const key = `${gx}:${gy}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(p)
  }

  let maxCount = 1
  for (const pts of buckets.values()) {
    if (pts.length > maxCount) maxCount = pts.length
  }

  const spots: HeatSpot[] = []

  for (const pts of buckets.values()) {
    if (!pts.length) continue

    let latSum = 0
    let lngSum = 0
    for (const p of pts) {
      latSum += p.latitude
      lngSum += p.longitude
    }
    const center = {
      latitude: latSum / pts.length,
      longitude: lngSum / pts.length,
    }

    const weight = pts.length / maxCount
    const baseRadius = cellKm * 500
    // Single isolated points still render a modest blob (previously required 2+ per cell → empty map)
    const radiusMeters =
      pts.length >= 2
        ? baseRadius + baseRadius * weight
        : baseRadius * 0.65 + baseRadius * 0.45 * weight

    spots.push({ center, weight, radiusMeters })
  }

  return spots
}

const HEAT_COLORS = [
  { r: 255, g: 235, b: 59 },
  { r: 255, g: 152, b: 0 },
  { r: 244, g: 67, b: 54 },
]

export function getHeatColor(weight: number, opacity: number = 0.35): string {
  const t = Math.max(0, Math.min(1, weight))
  const idx = t * (HEAT_COLORS.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.min(lo + 1, HEAT_COLORS.length - 1)
  const frac = idx - lo

  const r = Math.round(HEAT_COLORS[lo].r + (HEAT_COLORS[hi].r - HEAT_COLORS[lo].r) * frac)
  const g = Math.round(HEAT_COLORS[lo].g + (HEAT_COLORS[hi].g - HEAT_COLORS[lo].g) * frac)
  const b = Math.round(HEAT_COLORS[lo].b + (HEAT_COLORS[hi].b - HEAT_COLORS[lo].b) * frac)

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
