import type { RouteApiResult } from './types'
import { parseLocationText } from './utils'

function parsePolyline(steps: Array<{ polyline?: string }> | undefined): Array<[number, number]> {
  const points: Array<[number, number]> = []
  const seen = new Set<string>()

  for (const step of steps ?? []) {
    if (!step.polyline) continue
    for (const rawPair of step.polyline.split(';')) {
      const parsed = parseLocationText(rawPair)
      if (!parsed) continue
      const key = `${parsed.lat.toFixed(6)},${parsed.lng.toFixed(6)}`
      if (seen.has(key)) continue
      seen.add(key)
      points.push([parsed.lat, parsed.lng])
    }
  }

  return points
}

export async function requestDrivingRoute(
  originLngLat: string,
  destinationLngLat: string,
  strategy = '0',
  waypoints?: string,
): Promise<RouteApiResult> {
  const url = new URL('/api/amap/direction', window.location.origin)
  url.searchParams.set('origin', originLngLat)
  url.searchParams.set('destination', destinationLngLat)
  url.searchParams.set('strategy', strategy)
  if (waypoints) url.searchParams.set('waypoints', waypoints)

  const response = await fetch(`${url.pathname}${url.search}`)
  const raw = (await response.json()) as {
    ok?: boolean
    message?: string
    detail?: unknown
    data?: {
      status?: string
      info?: string
      infocode?: string
      route?: {
        paths?: Array<{
          distance?: string
          duration?: string
          steps?: Array<{ polyline?: string }>
        }>
      }
    }
  }

  if (!response.ok || !raw.ok) {
    if (import.meta.env.DEV) console.error('Direction raw response', raw)
    throw new Error(raw.message || 'direction failed')
  }

  const payload = raw.data
  if (!payload || payload.status !== '1') {
    if (import.meta.env.DEV) console.error('Direction amap payload', payload)
    throw new Error(payload?.info || payload?.infocode || 'direction failed')
  }

  const path = payload.route?.paths?.[0]
  if (!path) throw new Error('高德未返回可用路线。')

  const polyline = parsePolyline(path.steps)
  if (!polyline.length) throw new Error('高德返回路线为空。')

  return {
    polyline,
    distanceText: path.distance ? `${path.distance} 米` : '未知',
    durationText: path.duration ? `${path.duration} 秒` : '未知',
    distanceMeters: path.distance ? Number(path.distance) : undefined,
  }
}

export async function requestCyclingRoute(
  originLngLat: string,
  destinationLngLat: string,
): Promise<RouteApiResult> {
  const url = new URL('/api/amap/cycling-direction', window.location.origin)
  url.searchParams.set('origin', originLngLat)
  url.searchParams.set('destination', destinationLngLat)

  const response = await fetch(`${url.pathname}${url.search}`)
  const raw = (await response.json()) as {
    ok?: boolean
    message?: string
    data?: {
      errcode?: number
      errmsg?: string
      data?: {
        paths?: Array<{
          distance?: number
          duration?: number
          steps?: Array<{ polyline?: string }>
        }>
      }
    }
  }

  if (!response.ok || !raw.ok) {
    throw new Error(raw.message || 'cycling direction failed')
  }

  const payload = raw.data
  if (!payload || payload.errcode !== 0) {
    throw new Error(payload?.errmsg || 'cycling direction failed')
  }

  const path = payload.data?.paths?.[0]
  if (!path) throw new Error('高德未返回可用骑行路线。')

  const polyline = parsePolyline(path.steps)
  if (!polyline.length) throw new Error('高德返回骑行路线为空。')

  return {
    polyline,
    distanceText: typeof path.distance === 'number' ? `${path.distance} 米` : '未知',
    durationText: typeof path.duration === 'number' ? `${path.duration} 秒` : '未知',
    distanceMeters: typeof path.distance === 'number' ? path.distance : undefined,
  }
}
