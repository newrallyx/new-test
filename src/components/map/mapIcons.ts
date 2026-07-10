import L, { type DivIcon } from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { PointKind } from './types'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

export const pointIcons: Record<PointKind, DivIcon> = {
  start: L.divIcon({
    className: 'custom-point-icon-wrapper',
    html: '<div class="custom-point-icon start">S</div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  }),
  end: L.divIcon({
    className: 'custom-point-icon-wrapper',
    html: '<div class="custom-point-icon end">E</div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  }),
  via: L.divIcon({
    className: 'custom-point-icon-wrapper',
    html: '<div class="custom-point-icon via">•</div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }),
}

export const controlPointIcon = L.divIcon({
  className: 'custom-point-icon-wrapper',
  html: '<div class="custom-point-icon control">●</div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

export const selectedWaypointIcon = L.divIcon({
  className: 'custom-point-icon-wrapper',
  html: '<div class="custom-point-icon waypoint-selected">★</div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})
