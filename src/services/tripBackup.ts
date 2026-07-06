import type { TripReview } from '../types/trip'
import { getAllSegmentRouteCache, type RouteCacheRecord } from './routeCacheDb'
import { toPersistedTripReview } from './tripStorage'

const BACKUP_SCHEMA = 'roadtrip-retrospective-backup'
const BACKUP_VERSION = 1

interface TripBackupPayload {
  schema: typeof BACKUP_SCHEMA
  version: typeof BACKUP_VERSION
  exportedAt: string
  sources: {
    tripStorageKey: string
    routeCacheDb: string
    routeCacheStore: string
  }
  summary: {
    tripCount: number
    routeSegmentCount: number
    segmentRouteCacheCount: number
  }
  data: {
    tripReview: TripReview
    segmentRoutes: RouteCacheRecord[]
  }
}

export interface TripBackupExport {
  json: string
  filename: string
  tripCount: number
  routeSegmentCount: number
  routeCacheCount: number
}

function countRouteSegments(data: TripReview): number {
  return data.trips.reduce(
    (tripTotal, trip) => tripTotal + trip.days.reduce((dayTotal, day) => dayTotal + day.routeSegments.length, 0),
    0,
  )
}

function formatBackupTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace(/[-:T]/g, '')
}

export async function createTripBackupExport(data: TripReview): Promise<TripBackupExport> {
  const exportedAt = new Date()
  const tripReview = toPersistedTripReview(data)
  const segmentRoutes = await getAllSegmentRouteCache()
  const routeSegmentCount = countRouteSegments(tripReview)

  const payload: TripBackupPayload = {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    sources: {
      tripStorageKey: 'trip-review-data-v1',
      routeCacheDb: 'trip-route-cache',
      routeCacheStore: 'segmentRoutes',
    },
    summary: {
      tripCount: tripReview.trips.length,
      routeSegmentCount,
      segmentRouteCacheCount: segmentRoutes.length,
    },
    data: {
      tripReview,
      segmentRoutes,
    },
  }

  return {
    json: JSON.stringify(payload, null, 2),
    filename: `trip-review-backup-${formatBackupTimestamp(exportedAt)}.json`,
    tripCount: payload.summary.tripCount,
    routeSegmentCount,
    routeCacheCount: segmentRoutes.length,
  }
}