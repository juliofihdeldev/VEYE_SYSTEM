export type MapTimeRange = 'live' | '7d' | 'all'

export const MAP_LIVE_WINDOW_MS = 72 * 60 * 60 * 1000
export const MAP_SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function reportedAtMs(date: unknown): number | null {
  if (date == null) return null
  const d = date as { toDate?: () => Date }
  if (typeof d.toDate === 'function') {
    try {
      return d.toDate().getTime()
    } catch {
      return null
    }
  }
  if (typeof date === 'number' && Number.isFinite(date)) return date
  if (date instanceof Date) return date.getTime()
  const parsed = new Date(date as string)
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime()
}

export function isWithinLastMs(date: unknown, windowMs: number): boolean {
  const ms = reportedAtMs(date)
  if (ms == null) return false
  return Date.now() - ms <= windowMs
}

/** Filter danger / victim rows by report time. Undated rows appear in 7d + all only (not Live). */
export function filterItemsByMapTimeRange<T extends { date?: unknown }>(
  items: T[],
  range: MapTimeRange,
): T[] {
  if (range === 'all') return items
  const now = Date.now()
  const windowMs = range === 'live' ? MAP_LIVE_WINDOW_MS : MAP_SEVEN_DAYS_MS
  return items.filter(item => {
    const ms = reportedAtMs(item.date)
    if (ms == null) return range !== 'live'
    return now - ms <= windowMs
  })
}
