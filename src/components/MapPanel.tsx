import type { CoordPoint, RouteColorMode, RouteSegment, Waypoint } from '../types/trip'
import { MapCanvas } from './map/MapCanvas'
import type { ResolvedRoutePatch, TrackSavePayload } from './map/types'
import { useMapTracks } from './map/useMapTracks'
import { useTrackEditing } from './map/useTrackEditing'

interface MapPanelProps {
  filteredSegments: RouteSegment[]
  routeColorMode: RouteColorMode
  isOverviewMode: boolean
  editingSegmentId: string | null
  onCancelEdit: () => void
  onSaveEdit: (payload: TrackSavePayload) => void
  selectedWaypoint: Waypoint | null
  onRouteResolved: (patches: ResolvedRoutePatch[]) => void
  routeServiceRevision: number
  allowAutoBuild: boolean
  isReadonlyMode: boolean
  onEndpointDraftChange: (payload: {
    segmentId: string
    startCoord?: CoordPoint
    endCoord?: CoordPoint
  }) => void
}

function MapPanel({
  filteredSegments,
  routeColorMode,
  isOverviewMode,
  editingSegmentId,
  onCancelEdit,
  onSaveEdit,
  selectedWaypoint,
  onRouteResolved,
  routeServiceRevision,
  allowAutoBuild,
  isReadonlyMode,
  onEndpointDraftChange,
}: MapPanelProps) {
  const { tracks, loading, message } = useMapTracks({
    filteredSegments,
    allowAutoBuild,
    isReadonlyMode,
    onRouteResolved,
    routeServiceRevision,
  })
  const trackEditing = useTrackEditing({
    tracks,
    editingSegmentId,
    isOverviewMode,
    onCancelEdit,
    onSaveEdit,
  })

  return (
    <section className="card-section map-section-with-toolbar">
      {loading && <p className="hint-text">正在加载轨迹点位...</p>}
      {!loading && message.startsWith('未解析') && <p className="hint-text">{message}</p>}

      {editingSegmentId && !isReadonlyMode && (
        <div className="map-toolbar">
          <button type="button" onClick={trackEditing.cancelEdit}>
            取消
          </button>
          <button type="button" onClick={trackEditing.saveEdit}>
            保存
          </button>
          <div className="edit-mode-tabs">
            <button
              type="button"
              className={trackEditing.editMode === 'start' ? 'active' : ''}
              onClick={() => trackEditing.setEditMode('start')}
            >
              改起点
            </button>
            <button
              type="button"
              className={trackEditing.editMode === 'end' ? 'active' : ''}
              onClick={() => trackEditing.setEditMode('end')}
            >
              改终点
            </button>
            <button
              type="button"
              className={trackEditing.editMode === 'track' ? 'active' : ''}
              onClick={() => trackEditing.setEditMode('track')}
            >
              改轨迹
            </button>
          </div>
        </div>
      )}

      <MapCanvas
        filteredSegments={filteredSegments}
        renderedTracks={trackEditing.renderedTracks}
        routeColorMode={routeColorMode}
        isOverviewMode={isOverviewMode}
        editingSegmentId={editingSegmentId}
        editMode={trackEditing.editMode}
        draftLine={trackEditing.draftLine}
        setDraftLine={trackEditing.setDraftLine}
        controlPointIndices={trackEditing.controlPointIndices}
        selectedWaypoint={selectedWaypoint}
        loading={loading}
        onEndpointDraftChange={onEndpointDraftChange}
      />
    </section>
  )
}

export default MapPanel
