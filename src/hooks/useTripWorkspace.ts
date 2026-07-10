import { useEffect, useMemo, useState } from 'react'
import { isReadonlyDemoMode } from '../config/appMode'
import type {
  FilterState,
  RouteColorMode,
  RouteSegment,
  RouteSummary,
  TripCategory,
  TripReview,
} from '../types/trip'
import { formatDistance, getDayDistanceMeters, getTrackDistanceMeters, getTripDistanceMeters } from '../utils/distance'
import { useFilteredSegments } from './useFilteredSegments'

interface UseTripWorkspaceParams {
  trips: TripReview['trips']
  editingSegmentId: string | null
  resetEditingState: () => void
}

export function useTripWorkspace({
  trips,
  editingSegmentId,
  resetEditingState,
}: UseTripWorkspaceParams) {
  const [activeWorkspace, setActiveWorkspace] = useState<TripCategory>('review')
  const [filters, setFilters] = useState<FilterState>({ tripId: '', dayId: '', segmentId: '' })
  const [tripManagerOpen, setTripManagerOpen] = useState(false)
  const [routeColorMode, setRouteColorMode] = useState<RouteColorMode>('default')

  const workspaceTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.category === activeWorkspace)
        .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)),
    [trips, activeWorkspace],
  )

  const isAllTripsSelected = !filters.tripId
  const canUseScoreColoring = !isAllTripsSelected
  const placeholderMode: 'trip-list' | 'segment-list' = isAllTripsSelected ? 'trip-list' : 'segment-list'
  const mapRenderSegments = useFilteredSegments(workspaceTrips, filters)
  const listViewSegments = placeholderMode === 'segment-list' ? mapRenderSegments : []

  const segmentDayDateMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const trip of workspaceTrips) {
      for (const day of trip.days) {
        for (const segment of day.routeSegments) {
          if (!map.has(segment.id) && day.date) {
            map.set(segment.id, day.date)
          }
        }
      }
    }
    return map
  }, [workspaceTrips])

  const detailSegments = useMemo(
    () =>
      listViewSegments.map((segment) => ({
        ...segment,
        dayDate: (segment as RouteSegment & { dayDate?: string }).dayDate ?? segmentDayDateMap.get(segment.id),
      })),
    [listViewSegments, segmentDayDateMap],
  )

  const activeSegmentId = useMemo(() => {
    if (editingSegmentId && listViewSegments.some((segment) => segment.id === editingSegmentId)) {
      return editingSegmentId
    }
    if (filters.segmentId && listViewSegments.some((segment) => segment.id === filters.segmentId)) {
      return filters.segmentId
    }
    return null
  }, [editingSegmentId, filters.segmentId, listViewSegments])

  useEffect(() => {
    setFilters((prev) => {
      const firstTrip = workspaceTrips[0]
      if (!firstTrip) return { tripId: '', dayId: '', segmentId: '' }

      if (isReadonlyDemoMode && !prev.tripId) {
        return { tripId: '', dayId: '', segmentId: '' }
      }

      const selectedTrip = workspaceTrips.find((trip) => trip.id === prev.tripId) ?? firstTrip
      const selectedDay = selectedTrip.days.find((day) => day.id === prev.dayId) ?? selectedTrip.days[0]
      const selectedSegment =
        selectedDay?.routeSegments.find((segment) => segment.id === prev.segmentId) ?? selectedDay?.routeSegments[0]

      return {
        tripId: selectedTrip.id,
        dayId: selectedDay?.id ?? '',
        segmentId: selectedSegment?.id ?? '',
      }
    })
    resetEditingState()
  }, [activeWorkspace, workspaceTrips, resetEditingState])

  useEffect(() => {
    if (canUseScoreColoring || routeColorMode === 'default') return
    setRouteColorMode('default')
  }, [canUseScoreColoring, routeColorMode])

  const selectedTrip = useMemo(
    () => workspaceTrips.find((trip) => trip.id === filters.tripId) ?? null,
    [workspaceTrips, filters.tripId],
  )
  const selectedDay = useMemo(
    () => selectedTrip?.days.find((day) => day.id === filters.dayId) ?? null,
    [selectedTrip, filters.dayId],
  )
  const activeSegment = useMemo(
    () => listViewSegments.find((segment) => segment.id === activeSegmentId) ?? null,
    [listViewSegments, activeSegmentId],
  )

  const tripListItems = useMemo(
    () =>
      workspaceTrips.map((trip) => ({
        id: trip.id,
        title: trip.title,
        startDate: trip.startDate,
        endDate: trip.endDate,
        segmentCount: trip.days.reduce((sum, day) => sum + day.routeSegments.length, 0),
        tripDistanceText: formatDistance(getTripDistanceMeters(trip)),
      })),
    [workspaceTrips],
  )

  const tripDistanceText = useMemo(
    () => formatDistance(selectedTrip ? getTripDistanceMeters(selectedTrip) : null),
    [selectedTrip],
  )
  const dayDistanceText = useMemo(
    () => formatDistance(selectedDay ? getDayDistanceMeters(selectedDay.routeSegments) : null),
    [selectedDay],
  )

  const filterContext = useMemo(() => {
    const currentTrip = workspaceTrips.find((trip) => trip.id === filters.tripId)
    const currentDay = currentTrip?.days.find((day) => day.id === filters.dayId)
    const currentSegment = currentDay?.routeSegments.find((segment) => segment.id === filters.segmentId)

    return {
      tripName: currentTrip?.title ?? '全部旅程',
      dayDate: currentDay?.date ?? '全部日期',
      segmentName: currentSegment?.name ?? '全部路段',
    }
  }, [workspaceTrips, filters.tripId, filters.dayId, filters.segmentId])

  const summary: RouteSummary = useMemo(
    () => ({ totalDistanceText: formatDistance(activeSegment ? getTrackDistanceMeters(activeSegment) : null) }),
    [activeSegment],
  )

  return {
    activeWorkspace,
    setActiveWorkspace,
    filters,
    setFilters,
    tripManagerOpen,
    setTripManagerOpen,
    routeColorMode,
    setRouteColorMode,
    workspaceTrips,
    isAllTripsSelected,
    canUseScoreColoring,
    placeholderMode,
    mapRenderSegments,
    listViewSegments,
    detailSegments,
    activeSegmentId,
    selectedTrip,
    selectedDay,
    activeSegment,
    tripListItems,
    tripDistanceText,
    dayDistanceText,
    filterContext,
    summary,
  }
}
