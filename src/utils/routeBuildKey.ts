import type { RouteSegment } from '../types/trip'

const ROUTE_BUILD_VERSION = 'amap-v3-strategy-v2'

function formatCoord(lat?: number, lon?: number): string {
  if (typeof lat !== 'number' || typeof lon !== 'number') return ','
  return `${lat.toFixed(6)},${lon.toFixed(6)}`
}

function buildSegmentRouteKeyParts(segment: RouteSegment): string[] {
  const waypointSignature = (segment.waypoints ?? [])
    .map((point) => {
      const lat = typeof point.lat === 'number' ? point.lat.toFixed(6) : ''
      const lng = typeof point.lng === 'number' ? point.lng.toFixed(6) : ''
      return `${point.name}|${lat},${lng}`
    })
    .join('||')

  return [
    segment.startPoint.trim(),
    segment.endPoint.trim(),
    formatCoord(segment.startCoord?.lat, segment.startCoord?.lon),
    formatCoord(segment.endCoord?.lat, segment.endCoord?.lon),
    waypointSignature,
    segment.routeType ?? 'DRIVING',
    segment.preference,
  ]
}

export function buildLegacySegmentRouteKey(segment: RouteSegment): string {
  return buildSegmentRouteKeyParts(segment).join('::')
}

export function buildSegmentRouteKey(segment: RouteSegment): string {
  return [ROUTE_BUILD_VERSION, ...buildSegmentRouteKeyParts(segment)].join('::')
}

/**
 * Legacy route geometry is still safe to display when every route-defining
 * input matches. It must not be treated as a current route for estimates,
 * because the current AMap strategy mapping may produce a different route.
 */
export function canDisplaySegmentRouteCache(segment: RouteSegment, routeBuildKey: string): boolean {
  return routeBuildKey === buildSegmentRouteKey(segment)
    || routeBuildKey === buildLegacySegmentRouteKey(segment)
}
