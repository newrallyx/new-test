import type { RoutePreference } from '../../types/trip'
import { sumCompleteDurationSeconds } from '../../utils/durations'
import { requestCyclingRoute, requestDrivingRoute } from './routeApi'
import type {
  AMapServiceError,
  DrivingRequestPoint,
  DrivingRouteResult,
  PlannedRouteResponse,
} from './types'
import { buildRouteKey, preferenceToStrategy, toLonLatText } from './utils'

const ROUTE_QUEUE_CONCURRENCY = 2
const ROUTE_REQUEST_DELAY_MS = 200
const ROUTE_RATE_LIMIT_COOLDOWN_MS = 3000

interface RouteTask {
  run: () => Promise<DrivingRouteResult>
  resolve: (value: DrivingRouteResult) => void
  reject: (reason?: unknown) => void
}

const routeCache = new Map<string, DrivingRouteResult>()
const routeTaskQueue: RouteTask[] = []
const inflightRouteTasks = new Map<string, Promise<PlannedRouteResponse>>()
let activeRouteTasks = 0
let routeQueuePauseUntil = 0

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isRouteRateLimitError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '').toUpperCase()
  return message.includes('CUPQS_HAS_EXCEEDED_THE_LIMIT') || message.includes('10021') || message.includes('RATE_LIMIT')
}

function pauseRouteQueueForRateLimit() {
  const nextPauseUntil = Date.now() + ROUTE_RATE_LIMIT_COOLDOWN_MS
  routeQueuePauseUntil = Math.max(routeQueuePauseUntil, nextPauseUntil)
}

function processRouteQueue() {
  const now = Date.now()
  if (routeQueuePauseUntil > now) {
    window.setTimeout(processRouteQueue, routeQueuePauseUntil - now)
    return
  }

  while (activeRouteTasks < ROUTE_QUEUE_CONCURRENCY && routeTaskQueue.length) {
    const nextTask = routeTaskQueue.shift()
    if (!nextTask) return

    activeRouteTasks += 1
    void nextTask
      .run()
      .then(nextTask.resolve)
      .catch(nextTask.reject)
      .finally(() => {
        activeRouteTasks -= 1
        processRouteQueue()
      })
  }
}

function enqueueRouteTask(run: () => Promise<DrivingRouteResult>): Promise<DrivingRouteResult> {
  return new Promise<DrivingRouteResult>((resolve, reject) => {
    routeTaskQueue.push({ run, resolve, reject })
    processRouteQueue()
  })
}

function withRouteInFlightDedup(
  key: string,
  createTask: () => Promise<PlannedRouteResponse>,
): Promise<PlannedRouteResponse> {
  const existing = inflightRouteTasks.get(key)
  if (existing) return existing

  const task = createTask().finally(() => {
    inflightRouteTasks.delete(key)
  })
  inflightRouteTasks.set(key, task)
  return task
}

async function planDrivingRouteRaw(
  points: DrivingRequestPoint[],
  preference: RoutePreference,
  routeKey: string,
): Promise<PlannedRouteResponse> {
  if (points.length < 2) {
    return {
      route: null,
      error: { code: 'POINTS_NOT_ENOUGH', message: '路径规划至少需要起点和终点。' },
    }
  }

  const origin = toLonLatText(points[0])
  const destination = toLonLatText(points[points.length - 1])
  const strategy = preferenceToStrategy(preference)
  const waypoints = points.length > 2 ? points.slice(1, -1).map(toLonLatText).join('|') : undefined

  try {
    const result = await requestDrivingRoute(origin, destination, strategy, waypoints)
    return {
      route: {
        polyline: result.polyline,
        distanceText: result.distanceText,
        durationText: result.durationText,
        durationSeconds: result.durationSeconds,
        distanceMeters: result.distanceMeters,
        estimatedTollYuan: result.estimatedTollYuan,
        tollDistanceMeters: result.tollDistanceMeters,
        tollUpdatedAt: typeof result.estimatedTollYuan === 'number' ? new Date().toISOString() : undefined,
        durationUpdatedAt: typeof result.durationSeconds === 'number' ? new Date().toISOString() : undefined,
        routeKey,
      },
      error: null,
    }
  } catch (error) {
    return {
      route: null,
      error: { message: (error as Error).message || '高德驾车规划请求失败，请检查网络或稍后重试。' },
    }
  }
}

export async function planDrivingRoute(
  points: DrivingRequestPoint[],
  preference: RoutePreference,
  options: { forceRefresh?: boolean } = {},
): Promise<PlannedRouteResponse> {
  const routeKey = buildRouteKey(points, preference)
  const cached = options.forceRefresh ? undefined : routeCache.get(routeKey)
  if (cached) return { route: { ...cached, fromCache: true }, error: null }

  return withRouteInFlightDedup(`DRIVING::${routeKey}`, async () => {
    const result = await enqueueRouteTask(async () => {
      await sleep(ROUTE_REQUEST_DELAY_MS)
      const { route, error } = await planDrivingRouteRaw(points, preference, routeKey)
      if (!route || error) throw error ?? { message: '驾车规划失败' }
      return route
    })
      .then((route) => ({ route, error: null as AMapServiceError | null }))
      .catch((error: AMapServiceError) => {
        if (isRouteRateLimitError(error)) pauseRouteQueueForRateLimit()
        return { route: null, error }
      })

    if (result.route) routeCache.set(routeKey, result.route)
    return result
  })
}

export async function planCyclingRoute(
  points: DrivingRequestPoint[],
  options: { forceRefresh?: boolean } = {},
): Promise<PlannedRouteResponse> {
  if (points.length < 2) {
    return {
      route: null,
      error: { code: 'POINTS_NOT_ENOUGH', message: '路径规划至少需要起点和终点。' },
    }
  }

  const routeKey = `${points.map(toLonLatText).join('|')}|CYCLING`
  const cached = options.forceRefresh ? undefined : routeCache.get(routeKey)
  if (cached) return { route: { ...cached, fromCache: true }, error: null }

  const run = async () => {
    await sleep(ROUTE_REQUEST_DELAY_MS)
    const polyline: Array<[number, number]> = []
    let distanceMeters = 0
    const legDurations: Array<number | undefined> = []

    for (let index = 0; index < points.length - 1; index += 1) {
      const leg = await requestCyclingRoute(toLonLatText(points[index]), toLonLatText(points[index + 1]))
      distanceMeters += Number(leg.distanceText.replace(/[^\d.]/g, '')) || 0
      legDurations.push(leg.durationSeconds)
      polyline.push(...leg.polyline)
    }

    if (!polyline.length) throw new Error('骑行规划失败')

    const durationSeconds = sumCompleteDurationSeconds(legDurations)
    const route: DrivingRouteResult = {
      polyline,
      distanceText: `${Math.round(distanceMeters)} 米`,
      durationText: typeof durationSeconds === 'number' ? `${durationSeconds} 秒` : '未知',
      durationSeconds,
      durationUpdatedAt: typeof durationSeconds === 'number' ? new Date().toISOString() : undefined,
      distanceMeters: Math.round(distanceMeters),
      routeKey,
    }
    routeCache.set(routeKey, route)
    return route
  }

  return withRouteInFlightDedup(`CYCLING::${routeKey}`, () =>
    enqueueRouteTask(run)
      .then((route) => ({ route, error: null as AMapServiceError | null }))
      .catch((error: AMapServiceError) => {
        if (isRouteRateLimitError(error)) pauseRouteQueueForRateLimit()
        return {
          route: null,
          error: { message: error?.message || '高德骑行规划请求失败，请检查网络或稍后重试。' },
        }
      }),
  )
}
