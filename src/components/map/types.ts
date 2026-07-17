import type { CoordPoint, RouteSegment } from '../../types/trip'

export type PointKind = 'start' | 'via' | 'end'
export type EditMode = 'start' | 'end' | 'track'

export interface SegmentTrack {
  segmentId: string
  segmentName: string
  points: Array<{ name: string; lat: number; lon: number; type: PointKind }>
  line: CoordPoint[]
}

export interface SegmentRouteDescriptor {
  segment: RouteSegment
  buildKey: string
  canReusePersisted: boolean
}

export interface ResolvedRoutePatch {
  segmentId: string
  points: CoordPoint[]
  distanceMeters: number | null
  estimatedDurationSeconds: number | null
  durationUpdatedAt?: string
  estimatedTollYuan: number | null
  tollDistanceMeters: number | null
  tollUpdatedAt?: string
  routeBuildKey: string
}

export interface RouteRefreshRequest {
  segmentId: string | null
  revision: number
}

export interface TrackSavePayload {
  segmentId: string
  startCoord: CoordPoint
  endCoord: CoordPoint
  points: CoordPoint[]
}
