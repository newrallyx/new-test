import { useCallback } from 'react'
import { deleteSegmentRouteCache, getSegmentRouteCache, saveSegmentRouteCache } from '../../services/routeCacheDb'
import type { FilterState, Trip, TripCategory, TripReview } from '../../types/trip'
import type {
  BlockReadonlyWrite,
  EditingStateControls,
  SetFilters,
  SetTripReview,
} from './types'
import { createDuplicateTripTitle, createId } from './utils'

interface UseTripActionsParams extends EditingStateControls {
  activeWorkspace: TripCategory
  filters: FilterState
  setFilters: SetFilters
  workspaceTrips: Trip[]
  tripReview: TripReview
  setTripReview: SetTripReview
  blockReadonlyWrite: BlockReadonlyWrite
}

export function useTripActions({
  activeWorkspace,
  filters,
  setFilters,
  workspaceTrips,
  tripReview,
  setTripReview,
  blockReadonlyWrite,
  editingSegmentId,
  setEditingSegmentId,
  editingWaypointSegmentId,
  setEditingWaypointSegmentId,
  setWaypointDrafts,
  setSelectedWaypointId,
  editingEndpointsSegmentId,
  setEditingEndpointsSegmentId,
  setEndpointDraft,
}: UseTripActionsParams) {
  const resetEditingState = useCallback(() => {
    setEditingSegmentId(null)
    setSelectedWaypointId(null)
    setEditingWaypointSegmentId(null)
    setWaypointDrafts([])
    setEditingEndpointsSegmentId(null)
    setEndpointDraft(null)
  }, [setEditingEndpointsSegmentId, setEditingSegmentId, setEditingWaypointSegmentId, setEndpointDraft, setSelectedWaypointId, setWaypointDrafts])

  const addTrip = useCallback((payload: { title: string; startDate: string; endDate: string }) => {
    if (blockReadonlyWrite('addTrip')) return
    setTripReview((prev) => ({
      trips: [
        ...prev.trips,
        {
          id: createId('trip'),
          title: payload.title,
          startDate: payload.startDate,
          endDate: payload.endDate,
          category: activeWorkspace,
          order: prev.trips.filter((trip) => trip.category === activeWorkspace).length,
          days: [],
        },
      ],
    }))
  }, [activeWorkspace, blockReadonlyWrite, setTripReview])

  const deleteTrip = useCallback((tripId: string) => {
    if (blockReadonlyWrite('deleteTrip')) return
    const target = workspaceTrips.find((trip) => trip.id === tripId)
    if (!target) return

    const deletedSegmentIds = new Set(target.days.flatMap((day) => day.routeSegments.map((segment) => segment.id)))
    const segmentCount = target.days.reduce((sum, day) => sum + day.routeSegments.length, 0)
    const confirmed = window.confirm(
      `确定删除旅程“${target.title}”吗？将同时删除该旅程下的全部日期与路段数据（${segmentCount} 条路段）。此操作不可恢复。`,
    )
    if (!confirmed) return

    for (const segmentId of deletedSegmentIds) {
      void deleteSegmentRouteCache(segmentId)
    }

    setTripReview((prev) => ({ trips: prev.trips.filter((trip) => trip.id !== tripId) }))

    if (filters.tripId === tripId) {
      setFilters({ tripId: '', dayId: '', segmentId: '' })
    }

    if (editingSegmentId && deletedSegmentIds.has(editingSegmentId)) setEditingSegmentId(null)
    if (editingWaypointSegmentId && deletedSegmentIds.has(editingWaypointSegmentId)) {
      setEditingWaypointSegmentId(null)
      setWaypointDrafts([])
      setSelectedWaypointId(null)
    }
    if (editingEndpointsSegmentId && deletedSegmentIds.has(editingEndpointsSegmentId)) {
      setEditingEndpointsSegmentId(null)
      setEndpointDraft(null)
    }
  }, [blockReadonlyWrite, editingEndpointsSegmentId, editingSegmentId, editingWaypointSegmentId, filters.tripId, setEditingEndpointsSegmentId, setEditingSegmentId, setEditingWaypointSegmentId, setEndpointDraft, setFilters, setSelectedWaypointId, setTripReview, setWaypointDrafts, workspaceTrips])

  const updateTrip = useCallback((tripId: string, patch: { title: string; startDate: string; endDate: string }): boolean => {
    if (blockReadonlyWrite('updateTrip')) return false
    if (patch.endDate < patch.startDate) return false
    setTripReview((prev) => ({
      trips: prev.trips.map((trip) =>
        trip.id === tripId
          ? { ...trip, title: patch.title, startDate: patch.startDate, endDate: patch.endDate }
          : trip,
      ),
    }))
    return true
  }, [blockReadonlyWrite, setTripReview])

  const duplicateTrip = useCallback((tripId: string): string | null => {
    if (blockReadonlyWrite('duplicateTrip')) return null

    const sourceTrip = workspaceTrips.find((trip) => trip.id === tripId)
    if (!sourceTrip) return null

    const existingTitles = new Set(
      tripReview.trips
        .filter((trip) => trip.category === sourceTrip.category)
        .map((trip) => trip.title),
    )
    const segmentCopyPairs: Array<{ sourceSegmentId: string; copiedSegmentId: string }> = []
    const copiedTrip: Trip = {
      ...sourceTrip,
      id: createId('trip'),
      title: createDuplicateTripTitle(sourceTrip.title, existingTitles),
      days: sourceTrip.days.map((day) => ({
        ...day,
        id: createId('day'),
        routeSegments: day.routeSegments.map((segment) => {
          const copiedSegmentId = createId('segment')
          segmentCopyPairs.push({ sourceSegmentId: segment.id, copiedSegmentId })

          return {
            ...segment,
            id: copiedSegmentId,
            points: segment.points?.map((point) => ({ ...point })),
            waypoints: segment.waypoints?.map((waypoint) => ({
              ...waypoint,
              id: createId('waypoint'),
            })),
          }
        }),
      })),
    }

    setTripReview((prev) => {
      if (!prev.trips.some((trip) => trip.id === sourceTrip.id)) return prev

      const scopedTrips = prev.trips
        .filter((trip) => trip.category === sourceTrip.category)
        .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
      const sourceIndex = scopedTrips.findIndex((trip) => trip.id === sourceTrip.id)
      if (sourceIndex < 0) return prev

      const orderedScopedTrips = [...scopedTrips]
      orderedScopedTrips.splice(sourceIndex + 1, 0, copiedTrip)
      const orderMap = new Map(orderedScopedTrips.map((trip, order) => [trip.id, order]))
      const reorderedTrips = prev.trips.map((trip) =>
        trip.category === sourceTrip.category ? { ...trip, order: orderMap.get(trip.id) ?? trip.order } : trip,
      )

      return {
        trips: [
          ...reorderedTrips,
          {
            ...copiedTrip,
            order: orderMap.get(copiedTrip.id) ?? scopedTrips.length,
          },
        ],
      }
    })

    const firstDay = copiedTrip.days[0]
    setFilters({
      tripId: copiedTrip.id,
      dayId: firstDay?.id ?? '',
      segmentId: firstDay?.routeSegments[0]?.id ?? '',
    })
    resetEditingState()

    void Promise.all(
      segmentCopyPairs.map(async ({ sourceSegmentId, copiedSegmentId }) => {
        const routeCache = await getSegmentRouteCache(sourceSegmentId)
        if (!routeCache) return

        await saveSegmentRouteCache({
          segmentId: copiedSegmentId,
          routeBuildKey: routeCache.routeBuildKey,
          points: routeCache.points,
        })
      }),
    )

    return copiedTrip.id
  }, [blockReadonlyWrite, resetEditingState, setFilters, setTripReview, tripReview.trips, workspaceTrips])

  const moveTrip = useCallback((tripId: string, direction: 'up' | 'down') => {
    if (blockReadonlyWrite('moveTrip')) return
    setTripReview((prev) => {
      const scopedTrips = prev.trips.filter((trip) => trip.category === activeWorkspace)
      const idx = scopedTrips.findIndex((trip) => trip.id === tripId)
      if (idx < 0) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= scopedTrips.length) return prev

      const movedScoped = [...scopedTrips]
      const [moved] = movedScoped.splice(idx, 1)
      movedScoped.splice(target, 0, moved)
      const orderMap = new Map(movedScoped.map((trip, order) => [trip.id, order]))

      return {
        trips: prev.trips.map((trip) =>
          trip.category === activeWorkspace ? { ...trip, order: orderMap.get(trip.id) ?? trip.order } : trip,
        ),
      }
    })
  }, [activeWorkspace, blockReadonlyWrite, setTripReview])

  const reorderTrips = useCallback((orderedTripIds: string[]) => {
    if (blockReadonlyWrite('reorderTrips')) return
    setTripReview((prev) => {
      const scopedTrips = prev.trips.filter((trip) => trip.category === activeWorkspace)
      if (orderedTripIds.length !== scopedTrips.length) return prev
      const scopedMap = new Map(scopedTrips.map((trip) => [trip.id, trip]))
      const orderedScoped = orderedTripIds
        .map((id) => scopedMap.get(id))
        .filter((trip): trip is (typeof prev.trips)[number] => Boolean(trip))
      if (orderedScoped.length !== scopedTrips.length) return prev

      const orderMap = new Map(orderedScoped.map((trip, order) => [trip.id, order]))
      return {
        trips: prev.trips.map((trip) =>
          trip.category === activeWorkspace ? { ...trip, order: orderMap.get(trip.id) ?? trip.order } : trip,
        ),
      }
    })
  }, [activeWorkspace, blockReadonlyWrite, setTripReview])

  return {
    addTrip,
    deleteTrip,
    updateTrip,
    duplicateTrip,
    moveTrip,
    reorderTrips,
  }
}
