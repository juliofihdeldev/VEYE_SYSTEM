import {COLORS} from '../constants'

/** MaterialCommunityIcons names used on map markers */
export type DangerMapIconName = 'pistol' | 'car' | 'fire'

/**
 * Resolve incident slug from ZoneDanger (or similar): explicit fields first, else `[type]` prefix in rezon.
 */
export function incidentSlugFromZone(zone: {
  rezon?: string
  tag?: string
  incidentType?: string
}): string {
  const raw = zone.incidentType || zone.tag
  if (raw != null && String(raw).trim() !== '') {
    return String(raw)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_')
  }
  const m = zone.rezon?.match(/^\[([^\]]+)\]/)
  return (m?.[1] || 'other')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
}

export function mapIconForIncidentSlug(slug: string): DangerMapIconName {
  const s = slug.toLowerCase()
  if (
    s === 'road_block' ||
    s.includes('road_block') ||
    s.includes('traffic') ||
    s.includes('blockade')
  ) {
    return 'car'
  }
  if (
    s === 'shooting' ||
    s.includes('shoot') ||
    s === 'kidnapping' ||
    s === 'robbery' ||
    s === 'gang_activity' ||
    s === 'violence' ||
    s === 'police_operation' ||
    s.includes('gun') ||
    s.includes('arm')
  ) {
    return 'pistol'
  }
  if (s.includes('fire') || s.includes('arson') || s.includes('burn')) {
    return 'fire'
  }
  return 'fire'
}

export function colorForDangerMapIcon(icon: DangerMapIconName): string {
  switch (icon) {
    case 'pistol':
      return COLORS.severityCritical
    case 'car':
      return '#CA8A04'
    case 'fire':
      return '#EA580C'
    default:
      return COLORS.severityHigh
  }
}
