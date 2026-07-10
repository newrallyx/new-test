import { useEffect } from 'react'
import L, { type LatLngExpression } from 'leaflet'
import { useMap } from 'react-leaflet'
import type { Waypoint } from '../../types/trip'

export function ViewportController({ points }: { points: LatLngExpression[] }) {
  const map = useMap()

  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) {
      map.setView(points[0], 11)
      return
    }
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24] })
  }, [map, points])

  return null
}

export function MapResizeController({ watchKey }: { watchKey: string }) {
  const map = useMap()

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 80)
    return () => window.clearTimeout(timer)
  }, [map])

  useEffect(() => {
    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [map])

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => map.invalidateSize())
    return () => window.cancelAnimationFrame(animationFrame)
  }, [map, watchKey])

  useEffect(() => {
    const container = map.getContainer()
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])

  return null
}

export function WaypointFocusController({ waypoint }: { waypoint: Waypoint | null }) {
  const map = useMap()

  useEffect(() => {
    if (!waypoint || typeof waypoint.lat !== 'number' || typeof waypoint.lng !== 'number') return
    map.flyTo([waypoint.lat, waypoint.lng], Math.max(map.getZoom(), 12), { duration: 0.8 })
  }, [map, waypoint])

  return null
}
