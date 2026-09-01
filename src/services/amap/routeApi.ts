import { LOCAL_API_CLIENT_HEADERS } from '../localApiClient.ts'
import type { RouteApiResult } from './types'
import { parseLocationText } from './utils.ts'

export function parsePolyline(steps: Array<{ polyline?: string }> | undefined): Array<[number, number]> {
  const points: Array<[number, number]> = []
  let previousKey = ''

  for (const step of steps ?? []) {
    if (!step.polyline) continue
    for (const rawPair of step.polyline.split(';')) {
      const parsed = parseLocationText(rawPair)
      if (!parsed) continue
      const key = `${parsed.lat.toFixed(6)},${parsed.lng.toFixed(6)}`
      if (key === previousKey) continue
      points.push([parsed.lat, parsed.lng])
      previousKey = key
    }
  }

  return points
}

function parseNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined
  if (typeof value === 'string' && !value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

interface AmapDrivingPath {
  distance?: string | number
  duration?: string | number
  tolls?: string | number
  toll_distance?: string | number
  steps?: Array<{ polyline?: string }>
}

interface AmapCyclingPath {
  distance?: number
  duration?: number
  steps?: Array<{ polyline?: string }>
}

export function parseDrivingPath(path: AmapDrivingPath): RouteApiResult {
  const distanceMeters = parseNonNegativeNumber(path.distance)
  const durationSeconds = parseNonNegativeNumber(path.duration)
  return {
    polyline: parsePolyline(path.steps),
    distanceText: typeof distanceMeters === 'number' ? `${distanceMeters} 米` : '未知',
    durationText: typeof durationSeconds === 'number' ? `${durationSeconds} 秒` : '未知',
    durationSeconds,
    distanceMeters,
    estimatedTollYuan: parseNonNegativeNumber(path.tolls),
    tollDistanceMeters: parseNonNegativeNumber(path.toll_distance),
  }
}

export function parseCyclingPath(path: AmapCyclingPath): RouteApiResult {
  const distanceMeters = parseNonNegativeNumber(path.distance)
  const durationSeconds = parseNonNegativeNumber(path.duration)
  return {
    polyline: parsePolyline(path.steps),
    distanceText: typeof distanceMeters === 'number' ? `${distanceMeters} 米` : '未知',
    durationText: typeof durationSeconds === 'number' ? `${durationSeconds} 秒` : '未知',
    durationSeconds,
    distanceMeters,
  }
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

  const response = await fetch(`${url.pathname}${url.search}`, {
    headers: LOCAL_API_CLIENT_HEADERS,
  })
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
          distance?: string | number
          duration?: string | number
          tolls?: string | number
          toll_distance?: string | number
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

  const result = parseDrivingPath(path)
  if (!result.polyline.length) throw new Error('高德返回路线为空。')
  return result
}

export async function requestCyclingRoute(
  originLngLat: string,
  destinationLngLat: string,
): Promise<RouteApiResult> {
  const url = new URL('/api/amap/cycling-direction', window.location.origin)
  url.searchParams.set('origin', originLngLat)
  url.searchParams.set('destination', destinationLngLat)

  const response = await fetch(`${url.pathname}${url.search}`, {
    headers: LOCAL_API_CLIENT_HEADERS,
  })
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

  const result = parseCyclingPath(path)
  if (!result.polyline.length) throw new Error('高德返回骑行路线为空。')
  return result
}
