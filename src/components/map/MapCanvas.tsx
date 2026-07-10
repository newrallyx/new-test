import { useMemo, type Dispatch, type SetStateAction } from 'react'
import { MapContainer, Marker, Popup, Polyline, TileLayer } from 'react-leaflet'
import type { CoordPoint, RouteColorMode, RouteSegment, Waypoint } from '../../types/trip'
import {
  getScoreGradient,
  getSegmentDisplayColor,
  getSegmentScore,
  UNRATED_SEGMENT_COLOR,
} from '../../utils/segmentScores'
import { MapResizeController, ViewportController, WaypointFocusController } from './MapControllers'
import { controlPointIcon, pointIcons, selectedWaypointIcon } from './mapIcons'
import { DEFAULT_MAP_CENTER, toLatLng } from './trackUtils'
import type { EditMode, SegmentTrack } from './types'

interface MapCanvasProps {
  filteredSegments: RouteSegment[]
  renderedTracks: SegmentTrack[]
  routeColorMode: RouteColorMode
  isOverviewMode: boolean
  editingSegmentId: string | null
  editMode: EditMode
  draftLine: CoordPoint[] | null
  setDraftLine: Dispatch<SetStateAction<CoordPoint[] | null>>
  controlPointIndices: number[]
  selectedWaypoint: Waypoint | null
  loading: boolean
  onEndpointDraftChange: (payload: {
    segmentId: string
    startCoord?: CoordPoint
    endCoord?: CoordPoint
  }) => void
}

function readDraggedLatLng(event: any): { lat: number; lng: number } {
  const marker = event.target as any
  return marker.getLatLng()
}

export function MapCanvas({
  filteredSegments,
  renderedTracks,
  routeColorMode,
  isOverviewMode,
  editingSegmentId,
  editMode,
  draftLine,
  setDraftLine,
  controlPointIndices,
  selectedWaypoint,
  loading,
  onEndpointDraftChange,
}: MapCanvasProps) {
  const allLatLng = useMemo(() => renderedTracks.flatMap((track) => toLatLng(track.line)), [renderedTracks])
  const mapResizeKey = `${renderedTracks.length}-${editingSegmentId ?? ''}-${loading ? 'loading' : 'idle'}`
  const segmentMap = useMemo(
    () => new Map(filteredSegments.map((segment) => [segment.id, segment])),
    [filteredSegments],
  )
  const activeLegendMode = routeColorMode === 'default' ? null : routeColorMode
  const showPointMarkers = !isOverviewMode

  return (
    <div className="map-panel-wrapper">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={4}
        zoomSnap={0.25}
        zoomDelta={0.25}
        wheelPxPerZoomLevel={160}
        className="map-container"
      >
        <MapResizeController watchKey={mapResizeKey} />
        <TileLayer
          attribution='&copy; <a href="https://www.amap.com/">Amap</a>'
          url="https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
          subdomains={[1, 2, 3, 4]}
        />

        {renderedTracks.map((track) => {
          if (track.line.length < 2) return null
          const sourceSegment = segmentMap.get(track.segmentId)
          const lineColor = sourceSegment
            ? getSegmentDisplayColor(sourceSegment, routeColorMode, '#2563eb')
            : '#2563eb'
          const modeScore =
            routeColorMode === 'default' || !sourceSegment
              ? 'default'
              : getSegmentScore(sourceSegment, routeColorMode) ?? 'unrated'
          const lineWeight = routeColorMode === 'default' ? 4 : 6

          return (
            <Polyline
              key={`${track.segmentId}-${routeColorMode}-${modeScore}`}
              positions={toLatLng(track.line)}
              pathOptions={{ color: lineColor, weight: lineWeight, opacity: 0.96 }}
            />
          )
        })}

        {showPointMarkers && renderedTracks.flatMap((track) =>
          track.points.map((point, index) => {
            const draggable =
              editingSegmentId === track.segmentId &&
              ((editMode === 'start' && point.type === 'start') || (editMode === 'end' && point.type === 'end'))

            return (
              <Marker
                key={`${track.segmentId}-${point.name}-${index}`}
                position={[point.lat, point.lon]}
                icon={pointIcons[point.type]}
                draggable={draggable}
                eventHandlers={
                  draggable && draftLine
                    ? {
                        drag: (event: any) => {
                          const latlng = readDraggedLatLng(event)
                          if (editingSegmentId === track.segmentId) {
                            onEndpointDraftChange({
                              segmentId: track.segmentId,
                              ...(point.type === 'start'
                                ? { startCoord: { lat: latlng.lat, lon: latlng.lng } }
                                : { endCoord: { lat: latlng.lat, lon: latlng.lng } }),
                            })
                          }
                          setDraftLine((prev) => {
                            if (!prev?.length) return prev
                            const next = [...prev]
                            if (point.type === 'start') {
                              next[0] = { ...next[0], lat: latlng.lat, lon: latlng.lng }
                            }
                            if (point.type === 'end') {
                              next[next.length - 1] = {
                                ...next[next.length - 1],
                                lat: latlng.lat,
                                lon: latlng.lng,
                              }
                            }
                            return next
                          })
                        },
                      }
                    : undefined
                }
              >
                <Popup>
                  {track.segmentName} · {point.type === 'start' ? '起点' : point.type === 'end' ? '终点' : '途经点'}
                </Popup>
              </Marker>
            )
          }),
        )}

        {editingSegmentId && draftLine && controlPointIndices.map((index) => {
          const point = draftLine[index]
          if (!point) return null
          return (
            <Marker
              key={`control-${index}`}
              position={[point.lat, point.lon]}
              icon={controlPointIcon}
              draggable
              eventHandlers={{
                drag: (event: any) => {
                  const latlng = readDraggedLatLng(event)
                  setDraftLine((prev) => {
                    if (!prev) return prev
                    const next = [...prev]
                    next[index] = { ...next[index], lat: latlng.lat, lon: latlng.lng }
                    return next
                  })
                },
              }}
            >
              <Popup>轨迹控制点</Popup>
            </Marker>
          )
        })}

        {showPointMarkers && selectedWaypoint && typeof selectedWaypoint.lat === 'number' && typeof selectedWaypoint.lng === 'number' ? (
          <Marker position={[selectedWaypoint.lat, selectedWaypoint.lng]} icon={selectedWaypointIcon}>
            <Popup>{selectedWaypoint.name || '已定位途经点'}</Popup>
          </Marker>
        ) : null}

        <WaypointFocusController waypoint={selectedWaypoint} />
        <ViewportController points={allLatLng} />
      </MapContainer>

      {activeLegendMode && (
        <div className="map-score-legend">
          <div className="map-score-legend-title">{activeLegendMode === 'scenic' ? '风景评分着色' : '难度评分着色'}</div>
          <div className="map-score-legend-bar" style={{ backgroundImage: getScoreGradient(activeLegendMode) }} />
          <div className="map-score-legend-scale">
            <span>1</span>
            <span>10</span>
          </div>
          <div className="map-score-legend-note">
            未评分轨迹显示为 <span className="map-score-legend-chip" style={{ backgroundColor: UNRATED_SEGMENT_COLOR }} /> 灰色
          </div>
        </div>
      )}
    </div>
  )
}
