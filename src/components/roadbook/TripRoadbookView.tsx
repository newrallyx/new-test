import { useCallback, useMemo, useState } from 'react'
import type { RouteSegment } from '../../types/trip'
import { formatDistance, getTripDistanceMeters } from '../../utils/distance'
import { formatDurationSummary, summarizeEstimatedDurations } from '../../utils/durations'
import { formatTollSummary, summarizeEstimatedTolls } from '../../utils/tolls'
import { formatActualSummaryText, summarizeActualResults } from '../../utils/reviewFacts'
import { buildTripFactSummary } from '../../utils/factSummary'
import { useRoadbookPhotos } from '../../hooks/useRoadbookPhotos'
import PhotoViewerDialog from '../PhotoViewerDialog'
import RoadbookDaySection from './RoadbookDaySection'
import RoadbookMap from './RoadbookMap'
import type { Trip } from '../../types/trip'

interface TripRoadbookViewProps {
  trip: Trip
  onBack: () => void
}

function TripRoadbookView({ trip, onBack }: TripRoadbookViewProps) {
  const { photosBySegment, allPhotos, desktopAvailable } = useRoadbookPhotos(trip)
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)

  const sortedDays = useMemo(() => [...trip.days].sort((a, b) => a.date.localeCompare(b.date)), [trip.days])

  const segments = useMemo<RouteSegment[]>(
    () => trip.days.flatMap((day) => day.routeSegments),
    [trip.days],
  )
  const distanceText = formatDistance(getTripDistanceMeters(trip))
  const durationText = formatDurationSummary(summarizeEstimatedDurations(segments))
  const tollText = formatTollSummary(summarizeEstimatedTolls(segments))
  const summaryText = useMemo(() => buildTripFactSummary(trip), [trip])
  const actualSummaryText = useMemo(
    () => formatActualSummaryText(summarizeActualResults(segments)),
    [segments],
  )

  const photoCount = useMemo(() => {
    const photoIds = new Set<string>()
    for (const segment of segments) {
      for (const photoId of segment.photoIds ?? []) photoIds.add(photoId)
    }
    return photoIds.size
  }, [segments])

  // 路书浏览为只读展示：查看器回调均为空操作，保证不会误修改旅程。
  const ignorePhotoAction = useCallback(async () => {}, [])
  const ignoreSelectPhoto = useCallback(() => {}, [])

  return (
    <section className="roadbook-view roadbook-trip-page" aria-label={`路书：${trip.title}`}>
      <div className="roadbook-toolbar">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ‹ 返回书架
        </button>
      </div>

      <header className="roadbook-trip-header">
        <h2>{trip.title}</h2>
        <p className="roadbook-trip-dates">
          {trip.startDate} ～ {trip.endDate} · {trip.days.length} 天
        </p>
      </header>

      <div className="roadbook-stats-row" aria-label="旅程汇总">
        <div className="roadbook-stat"><small>总里程</small><strong>{distanceText}</strong></div>
        <div className="roadbook-stat"><small>预计总用时</small><strong>{durationText}</strong></div>
        <div className="roadbook-stat"><small>预估过路费</small><strong>{tollText}</strong></div>
        <div className="roadbook-stat"><small>路段数</small><strong>{segments.length}</strong></div>
        <div className="roadbook-stat"><small>照片数</small><strong>{photoCount}</strong></div>
      </div>

      {summaryText && <p className="roadbook-summary">{summaryText}</p>}

      {actualSummaryText && <p className="roadbook-actual-summary">{actualSummaryText}</p>}

      {segments.length > 0 ? (
        <div className="roadbook-overview-map">
          <h3>旅程总览</h3>
          <RoadbookMap segments={segments} />
        </div>
      ) : (
        <p className="hint-text">这个旅程还没有记录路段，暂时没有可浏览的路线内容。</p>
      )}

      {sortedDays.map((day, index) => (
        <RoadbookDaySection
          key={day.id}
          dayIndex={index}
          day={day}
          photosBySegment={photosBySegment}
          onOpenPhoto={setSelectedPhotoId}
        />
      ))}

      {!desktopAvailable && photoCount > 0 && (
        <p className="hint-text roadbook-photos-unavailable">
          当前环境没有桌面照片接口，照片内容暂不可显示（已关联 {photoCount} 张）。
        </p>
      )}

      {selectedPhotoId && (
        <PhotoViewerDialog
          photos={allPhotos}
          selectedPhotoId={selectedPhotoId}
          isReadonlyMode
          isUpdating={false}
          coverPhotoId={trip.coverPhotoId ?? null}
          onSetCoverPhoto={ignorePhotoAction}
          onSelect={setSelectedPhotoId}
          onClose={() => setSelectedPhotoId(null)}
          onSaveNote={ignorePhotoAction}
          onRefreshMetadata={ignorePhotoAction}
          onRemove={ignorePhotoAction}
          onStartPosition={ignoreSelectPhoto}
          onRestoreExifPosition={ignorePhotoAction}
          onRepairPath={ignorePhotoAction}
        />
      )}
    </section>
  )
}

export default TripRoadbookView
