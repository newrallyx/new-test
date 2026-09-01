import { useEffect, useMemo, useState } from 'react'
import type { FilterState, RouteColorMode, Trip } from '../types/trip'
import { sortTripDaysByDate } from '../utils/date'

interface FilterPanelProps {
  trips: Trip[]
  filters: FilterState
  onChange: (next: FilterState) => void
  routeColorMode: RouteColorMode
  onChangeRouteColorMode: (mode: RouteColorMode) => void
  canUseScoreColoring: boolean
  onOpenTripManager: () => void
  onDuplicateTrip: (tripId: string) => void
  onInsertDayAfter: (tripId: string, dayId: string) => void
  onDeleteDay: (tripId: string, dayId: string) => void
  onReorderDaySegments: (tripId: string, dayId: string, orderedSegmentIds: string[]) => void
  isReadonlyMode: boolean
  dayDistanceText: string
  tripDistanceText: string
  dayTollText: string
  tripTollText: string
  dayDurationText: string
  tripDurationText: string
}

// 筛选区：按“旅程 / 日期 / 路段”逐级筛选，并处理筛选联动重置。
function FilterPanel({
  trips,
  filters,
  onChange,
  routeColorMode,
  onChangeRouteColorMode,
  canUseScoreColoring,
  onOpenTripManager,
  onDuplicateTrip,
  onInsertDayAfter,
  onDeleteDay,
  onReorderDaySegments,
  isReadonlyMode,
  dayDistanceText,
  tripDistanceText,
  dayTollText,
  tripTollText,
  dayDurationText,
  tripDurationText,
}: FilterPanelProps) {
  const [isSegmentOrderOpen, setIsSegmentOrderOpen] = useState(false)
  const [draggingSegmentId, setDraggingSegmentId] = useState<string | null>(null)
  const selectedTrip = trips.find((trip) => trip.id === filters.tripId)

  const dayOptions = useMemo(() => {
    return sortTripDaysByDate(selectedTrip?.days ?? [])
  }, [selectedTrip])

  const selectedDay = dayOptions.find((day) => day.id === filters.dayId)
  const segmentOptions = selectedDay?.routeSegments ?? []

  useEffect(() => {
    setIsSegmentOrderOpen(false)
    setDraggingSegmentId(null)
  }, [filters.tripId, filters.dayId])

  const moveSegmentToIndex = (segmentId: string, targetIndex: number) => {
    if (!selectedTrip || !selectedDay || isReadonlyMode) return
    const orderedSegmentIds = segmentOptions.map((segment) => segment.id)
    const currentIndex = orderedSegmentIds.indexOf(segmentId)
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedSegmentIds.length || currentIndex === targetIndex) {
      return
    }

    const [movedId] = orderedSegmentIds.splice(currentIndex, 1)
    orderedSegmentIds.splice(targetIndex, 0, movedId)
    onReorderDaySegments(selectedTrip.id, selectedDay.id, orderedSegmentIds)
  }

  return (
    <section className="card-section filter-panel-card">
      <h2 className="filter-panel-title">旅程筛选</h2>

      <div className="filter-row">
        <label className="trip-filter-field">
          旅程
          <div className="trip-filter-row">
            <select
              value={filters.tripId}
              onChange={(e) => onChange({ tripId: e.target.value, dayId: '', segmentId: '' })}
            >
              <option value="">全部旅程</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title}
                </option>
              ))}
            </select>
            <div className="trip-filter-actions">
              <button type="button" onClick={onOpenTripManager}>
                {isReadonlyMode ? '查看旅程' : '管理旅程'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (filters.tripId) onDuplicateTrip(filters.tripId)
                }}
                disabled={isReadonlyMode || !filters.tripId}
              >
                新建副本
              </button>
            </div>
          </div>
        </label>

        <label className="date-filter-field">
          日期
          <div className="date-filter-row">
            <select
              value={filters.dayId}
              onChange={(e) => onChange({ ...filters, dayId: e.target.value, segmentId: '' })}
              disabled={!filters.tripId}
            >
              <option value="">全部日期</option>
              {dayOptions.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.date}
                </option>
              ))}
            </select>
            <div className="date-filter-actions">
              <button
                type="button"
                onClick={() => onInsertDayAfter(filters.tripId, filters.dayId)}
                disabled={isReadonlyMode || !filters.tripId || !filters.dayId}
                title="在当前日期后插入空白的一天，并将后续日期顺延一天"
              >
                插入下一天
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={() => onDeleteDay(filters.tripId, filters.dayId)}
                disabled={isReadonlyMode || !filters.tripId || !filters.dayId}
                title="删除当前日期，并将后续日期提前一天"
              >
                删除当天
              </button>
              <button
                type="button"
                aria-expanded={isSegmentOrderOpen}
                aria-controls="day-segment-order-panel"
                onClick={() => setIsSegmentOrderOpen((current) => !current)}
                disabled={isReadonlyMode || !filters.tripId || !filters.dayId || segmentOptions.length < 2}
                title={segmentOptions.length < 2 ? '当天至少需要两条路段才能排序' : '调整当天全部路段的先后顺序'}
              >
                {isSegmentOrderOpen ? '收起路段排序' : '调整路段顺序'}
              </button>
            </div>
          </div>
        </label>

        <label className="segment-filter-field">
          路段
          <select
            value={filters.segmentId}
            onChange={(e) => onChange({ ...filters, segmentId: e.target.value })}
            disabled={!filters.dayId}
          >
            <option value="">全部路段</option>
            {segmentOptions.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isSegmentOrderOpen && selectedTrip && selectedDay && (
        <section id="day-segment-order-panel" className="day-segment-order-panel" aria-label={`${selectedDay.date} 路段排序`}>
          <div className="day-segment-order-header">
            <div>
              <h3>{selectedDay.date} 路段顺序</h3>
              <p>拖拽路段，或使用上移、下移按钮；保存会立即生效。</p>
            </div>
            <button type="button" onClick={() => setIsSegmentOrderOpen(false)}>
              完成
            </button>
          </div>
          <ol className="day-segment-order-list">
            {segmentOptions.map((segment, index) => (
              <li
                key={segment.id}
                className={draggingSegmentId === segment.id ? 'dragging' : ''}
                draggable={!isReadonlyMode}
                onDragStart={() => setDraggingSegmentId(segment.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggingSegmentId) return
                  moveSegmentToIndex(draggingSegmentId, index)
                  setDraggingSegmentId(null)
                }}
                onDragEnd={() => setDraggingSegmentId(null)}
              >
                <span className="day-segment-order-number">#{index + 1}</span>
                <div className="day-segment-order-meta">
                  <strong>{segment.name}</strong>
                  <small>{segment.startPoint} → {segment.endPoint}</small>
                </div>
                <div className="day-segment-order-actions">
                  <button
                    type="button"
                    aria-label={`上移路段“${segment.name}”`}
                    onClick={() => moveSegmentToIndex(segment.id, index - 1)}
                    disabled={isReadonlyMode || index === 0}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    aria-label={`下移路段“${segment.name}”`}
                    onClick={() => moveSegmentToIndex(segment.id, index + 1)}
                    disabled={isReadonlyMode || index === segmentOptions.length - 1}
                  >
                    下移
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!filters.tripId && <p className="hint-text filter-hint">已选择“全部旅程”，可查看所有路段。</p>}
      {filters.tripId && !filters.dayId && <p className="hint-text filter-hint">当前为该旅程下“全部日期”。</p>}
      {filters.dayId && !filters.segmentId && <p className="hint-text filter-hint">当前为该日期下“全部路段”。</p>}

      <div className="filter-stats-row">
        {filters.tripId && <p>旅程总里程：{tripDistanceText}</p>}
        {filters.tripId && <p>旅程预计行驶时间：{tripDurationText}</p>}
        {filters.tripId && <p>旅程预估过路费：{tripTollText}</p>}
        {filters.dayId && <p>当日总里程：{dayDistanceText}</p>}
        {filters.dayId && <p>当日预计行驶时间：{dayDurationText}</p>}
        {filters.dayId && <p>当日预估过路费：{dayTollText}</p>}
      </div>

      <div className="route-color-mode-section">
        <p className="route-color-mode-title">地图轨迹着色</p>
        <div className="route-color-mode-options" role="radiogroup" aria-label="地图轨迹评分可视化">
          <label className={`route-color-mode-option ${routeColorMode === 'default' ? 'active' : ''}`}>
            <input
              type="radio"
              name="route-color-mode"
              checked={routeColorMode === 'default'}
              onChange={() => onChangeRouteColorMode('default')}
            />
            默认颜色
          </label>
          <label className={`route-color-mode-option ${routeColorMode === 'scenic' ? 'active' : ''}`}>
            <input
              type="radio"
              name="route-color-mode"
              checked={routeColorMode === 'scenic'}
              disabled={!canUseScoreColoring}
              onChange={() => onChangeRouteColorMode('scenic')}
            />
            风景评分可视化
          </label>
          <label className={`route-color-mode-option ${routeColorMode === 'difficulty' ? 'active' : ''}`}>
            <input
              type="radio"
              name="route-color-mode"
              checked={routeColorMode === 'difficulty'}
              disabled={!canUseScoreColoring}
              onChange={() => onChangeRouteColorMode('difficulty')}
            />
            难度评分可视化
          </label>
        </div>
        <p className="hint-text filter-hint">
          {canUseScoreColoring
            ? '评分着色模式互斥，同一时间最多开启一种可视化。'
            : '评分着色仅在选中具体旅程时可用；“全部旅程”会混合多次记录，已自动关闭评分着色。'}
        </p>
      </div>
    </section>
  )
}

export default FilterPanel
