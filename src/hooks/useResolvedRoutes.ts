import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { isReadonlyDemoMode } from '../config/appMode'
import type { CoordPoint, TripReview } from '../types/trip'

interface ResolvedRoutePatch {
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

export function useResolvedRoutes(setTripReview: Dispatch<SetStateAction<TripReview>>) {
  return useCallback((patches: ResolvedRoutePatch[]) => {
    if (isReadonlyDemoMode || !patches.length) return
    const patchMap = new Map(patches.map((item) => [item.segmentId, item]))

    setTripReview((prev) => {
      let changed = false
      const nextTrips = prev.trips.map((trip) => {
        let hasTripChanges = false
        const nextDays = trip.days.map((day) => {
          let dayChanged = false
          const nextSegments = day.routeSegments.map((segment) => {
            const patch = patchMap.get(segment.id)
            if (!patch) return segment

            const sameDistance =
              (typeof segment.distanceMeters === 'number' ? segment.distanceMeters : null) ===
              (typeof patch.distanceMeters === 'number' ? Math.round(patch.distanceMeters) : null)
            const sameRouteKey = segment.routeBuildKey === patch.routeBuildKey
            const sameDuration =
              (typeof segment.estimatedDurationSeconds === 'number' ? segment.estimatedDurationSeconds : null) ===
              (typeof patch.estimatedDurationSeconds === 'number' ? Math.round(patch.estimatedDurationSeconds) : null)
            const sameDurationUpdatedAt = (segment.durationUpdatedAt ?? null) === (patch.durationUpdatedAt ?? null)
            const sameToll =
              (typeof segment.estimatedTollYuan === 'number' ? segment.estimatedTollYuan : null) ===
              (typeof patch.estimatedTollYuan === 'number' ? patch.estimatedTollYuan : null)
            const sameTollDistance =
              (typeof segment.tollDistanceMeters === 'number' ? segment.tollDistanceMeters : null) ===
              (typeof patch.tollDistanceMeters === 'number' ? Math.round(patch.tollDistanceMeters) : null)
            const sameTollUpdatedAt = (segment.tollUpdatedAt ?? null) === (patch.tollUpdatedAt ?? null)
            const samePoints =
              Array.isArray(segment.points) &&
              segment.points.length === patch.points.length &&
              segment.points.every(
                (point, index) => point.lat === patch.points[index].lat && point.lon === patch.points[index].lon,
              )

            if (
              sameDistance
              && sameRouteKey
              && sameDuration
              && sameDurationUpdatedAt
              && sameToll
              && sameTollDistance
              && sameTollUpdatedAt
              && samePoints
            ) {
              return segment
            }

            changed = true
            dayChanged = true
            hasTripChanges = true
            return {
              ...segment,
              points: patch.points,
              distanceMeters:
                typeof patch.distanceMeters === 'number' ? Math.round(patch.distanceMeters) : segment.distanceMeters,
              estimatedDurationSeconds:
                typeof patch.estimatedDurationSeconds === 'number'
                  ? Math.round(patch.estimatedDurationSeconds)
                  : undefined,
              durationUpdatedAt:
                typeof patch.estimatedDurationSeconds === 'number' ? patch.durationUpdatedAt : undefined,
              estimatedTollYuan:
                typeof patch.estimatedTollYuan === 'number'
                  ? Math.round(patch.estimatedTollYuan * 100) / 100
                  : undefined,
              tollDistanceMeters:
                typeof patch.tollDistanceMeters === 'number' ? Math.round(patch.tollDistanceMeters) : undefined,
              tollUpdatedAt: typeof patch.estimatedTollYuan === 'number' ? patch.tollUpdatedAt : undefined,
              routeBuildKey: patch.routeBuildKey,
            }
          })

          return dayChanged ? { ...day, routeSegments: nextSegments } : day
        })

        return hasTripChanges ? { ...trip, days: nextDays } : trip
      })

      return changed ? { ...prev, trips: nextTrips } : prev
    })
  }, [setTripReview])
}
