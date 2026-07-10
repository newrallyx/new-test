import { appMode, isReadonlyDemoMode } from './config/appMode'
import AmapKeySetupDialog from './components/AmapKeySetupDialog'
import FilterPanel from './components/FilterPanel'
import MapPanel from './components/MapPanel'
import MapPlaceholder from './components/MapPlaceholder'
import TripEditor from './components/TripEditor'
import TripManageModal from './components/TripManageModal'
import { useAmapKeyConfig } from './hooks/useAmapKeyConfig'
import { useAppEditingState } from './hooks/useAppEditingState'
import { useMapInfo } from './hooks/useMapInfo'
import { useResolvedRoutes } from './hooks/useResolvedRoutes'
import { useRouteCacheHydration } from './hooks/useRouteCacheHydration'
import { useSegmentEditing } from './hooks/useSegmentEditing'
import { useTripBackup } from './hooks/useTripBackup'
import { useTripManager } from './hooks/useTripManager'
import { useTripReviewState } from './hooks/useTripReviewState'
import { useTripWorkspace } from './hooks/useTripWorkspace'
import { normalizeSegmentNote, normalizeScore } from './utils/segmentScores'
import './styles/app.css'

function App() {
  const {
    tripReview,
    setTripReview,
    demoLoading: isLoading,
    demoError: loadError,
  } = useTripReviewState()
  const amapKeyConfig = useAmapKeyConfig(!isReadonlyDemoMode)

  const editing = useAppEditingState()
  const {
    editingSegmentId,
    setEditingSegmentId,
    selectedWaypointId,
    setSelectedWaypointId,
    editingWaypointSegmentId,
    setEditingWaypointSegmentId,
    waypointDrafts,
    setWaypointDrafts,
    editingEndpointsSegmentId,
    setEditingEndpointsSegmentId,
    endpointDraft,
    setEndpointDraft,
    segmentMetaDraft,
    setSegmentMetaDraft,
  } = editing

  const workspace = useTripWorkspace({
    trips: tripReview.trips,
    editingSegmentId,
    resetEditingState: editing.resetEditingState,
  })
  const {
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
  } = workspace

  useRouteCacheHydration({ trips: tripReview.trips, setTripReview, enabled: !isReadonlyDemoMode })

  const tripManager = useTripManager({
    isReadonlyMode: isReadonlyDemoMode,
    activeWorkspace,
    filters,
    setFilters,
    listViewSegments,
    workspaceTrips,
    editingSegmentId,
    setEditingSegmentId,
    editingWaypointSegmentId,
    setEditingWaypointSegmentId,
    setWaypointDrafts,
    setSelectedWaypointId,
    editingEndpointsSegmentId,
    setEditingEndpointsSegmentId,
    setEndpointDraft,
    setTripReview,
    tripReview,
    activeSegmentId,
  })

  const segmentEditing = useSegmentEditing({
    activeSegmentId,
    listViewSegments,
    selectedWaypointId,
    editingWaypointSegmentId,
    waypointDrafts,
    endpointDraft,
    editingEndpointsSegmentId,
    segmentMetaDraft,
    getSegmentDate: tripManager.getSegmentDate,
    updateSegment: tripManager.updateSegment,
    updateSegmentMeta: tripManager.updateSegmentMeta,
    findSegmentRef: tripManager.findSegmentRef,
    setSegmentMetaDraft,
    setEditingWaypointSegmentId,
    setWaypointDrafts,
    setEditingEndpointsSegmentId,
    setEndpointDraft,
    createId: tripManager.createId,
  })

  const {
    isExportingBackup,
    isImportingBackup,
    backupMessage,
    backupImportInputRef,
    exportBackup,
    importBackup,
    triggerBackupImport,
  } = useTripBackup({
    tripReview,
    setTripReview,
    setFilters,
    resetEditingState: editing.resetEditingState,
  })

  const saveResolvedRoutes = useResolvedRoutes(setTripReview)
  const mapInfo = useMapInfo({
    activeSegment,
    activeSegmentDate: segmentEditing.activeSegmentDate,
    isAllTripsSelected,
    selectedDay,
    selectedTrip,
    filters,
    mapRenderSegments,
    fallbackDayDate: filterContext.dayDate,
  })

  const routePreferenceValue = activeSegment?.preference ?? 'HIGHWAY_FIRST'
  const routeModeValue = activeSegment?.routeType ?? 'DRIVING'

  if (isReadonlyDemoMode && isLoading) {
    return (
      <main className="app-shell">
        <header className="top-nav">
          <div className="top-nav-title-group">
            <h1>自驾旅行记录与规划工具</h1>
            <p>只读展示版正在加载全部旅程数据...</p>
            <p className="readonly-banner">演示版 / 只读模式：当前内容不可修改</p>
          </div>
        </header>
      </main>
    )
  }

  if (isReadonlyDemoMode && loadError) {
    return (
      <main className="app-shell">
        <header className="top-nav">
          <div className="top-nav-title-group">
            <h1>自驾旅行记录与规划工具</h1>
            <p>只读展示版加载失败：{loadError}</p>
            <p className="readonly-banner">请检查 public/demo-data.json 是否存在且 JSON 结构合法。</p>
          </div>
        </header>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="top-nav">
        <div className="top-nav-title-group">
            <h1>自驾旅行记录与规划工具</h1>
          <p>{filterContext.tripName} · {filterContext.dayDate} · {filterContext.segmentName}</p>
          {isReadonlyDemoMode && <p className="readonly-banner">演示版 / 只读模式：当前内容不可修改</p>}
          {!isReadonlyDemoMode && !amapKeyConfig.isChecking && !amapKeyConfig.configured && (
            <p className="amap-key-warning">
              {amapKeyConfig.error || '地图服务尚未配置，地点联想和路线规划暂不可用。'}
            </p>
          )}
          {backupMessage && <p className="backup-export-status">{backupMessage}</p>}
        </div>
        <div className="top-nav-actions">
          <input
            ref={backupImportInputRef}
            type="file"
            className="backup-import-input"
            accept="application/json,.json"
            disabled={isReadonlyDemoMode || isImportingBackup}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              if (file) void importBackup(file)
            }}
          />
          <button
            type="button"
            className="backup-import-button"
            onClick={triggerBackupImport}
            disabled={isReadonlyDemoMode || isImportingBackup}
          >
            {isImportingBackup ? '导入中...' : '导入备份'}
          </button>
          <button type="button" className="backup-export-button" onClick={exportBackup} disabled={isExportingBackup}>
            {isExportingBackup ? '导出中...' : '导出备份'}
          </button>
          {!isReadonlyDemoMode && (
            <button
              type="button"
              className={amapKeyConfig.configured ? 'amap-key-button configured' : 'amap-key-button'}
              onClick={amapKeyConfig.open}
              disabled={amapKeyConfig.isChecking}
            >
              {amapKeyConfig.isChecking
                ? '检查地图服务...'
                : amapKeyConfig.configured
                  ? '地图服务设置'
                  : '配置地图服务'}
            </button>
          )}
          <div className="workspace-tabs" role="tablist" aria-label="总分类">
            <button
              type="button"
              className={activeWorkspace === 'review' ? 'active' : ''}
              onClick={() => setActiveWorkspace('review')}
            >
              复盘
            </button>
            <button
              type="button"
              className={activeWorkspace === 'plan' ? 'active' : ''}
              onClick={() => setActiveWorkspace('plan')}
            >
              规划
            </button>
          </div>
        </div>
      </header>

      <div className="workspace-layout">
        <aside className="sidebar-column">
          {!tripManagerOpen ? (
            <TripEditor
              trips={workspaceTrips}
              onAddTrip={tripManager.addTrip}
              onAddSegment={tripManager.addSegment}
              isReadonlyMode={isReadonlyDemoMode}
            />
          ) : (
            <TripManageModal
              trips={workspaceTrips}
              onClose={() => setTripManagerOpen(false)}
              onDeleteTrip={tripManager.deleteTrip}
              onDuplicateTrip={tripManager.duplicateTrip}
              onMoveTrip={tripManager.moveTrip}
              onReorderTrips={tripManager.reorderTrips}
              onUpdateTrip={tripManager.updateTrip}
              isReadonlyMode={isReadonlyDemoMode}
            />
          )}
        </aside>

        <section className="map-column">
          <div className="map-column-header-row">
            <span>{mapInfo.summary}</span>
          </div>

          <div className="map-canvas-wrap">
            <MapPanel
              filteredSegments={mapRenderSegments}
              routeColorMode={routeColorMode}
              isOverviewMode={!filters.tripId}
              editingSegmentId={editingSegmentId}
              onCancelEdit={() => setEditingSegmentId(null)}
              onSaveEdit={(payload) => {
                segmentEditing.saveSegmentTrack(payload)
                setEditingSegmentId(null)
              }}
              selectedWaypoint={segmentEditing.selectedWaypoint}
              onRouteResolved={saveResolvedRoutes}
              routeServiceRevision={amapKeyConfig.serviceRevision}
              allowAutoBuild={Boolean(!isReadonlyDemoMode && filters.tripId && filters.dayId && filters.segmentId && mapRenderSegments.length <= 3)}
              isReadonlyMode={isReadonlyDemoMode}
              onEndpointDraftChange={editing.updateEndpointCoords}
            />
          </div>

          <FilterPanel
            trips={workspaceTrips}
            filters={filters}
            onChange={setFilters}
            routeColorMode={routeColorMode}
            onChangeRouteColorMode={setRouteColorMode}
            canUseScoreColoring={canUseScoreColoring}
            onOpenTripManager={() => setTripManagerOpen(true)}
            onDuplicateTrip={tripManager.duplicateTrip}
            onInsertDayAfter={tripManager.insertDayAfter}
            onDeleteDay={tripManager.deleteDay}
            isReadonlyMode={isReadonlyDemoMode}
            tripDistanceText={tripDistanceText}
            dayDistanceText={dayDistanceText}
          />
        </section>

        <aside className="detail-column">
          <MapPlaceholder
            placeholderMode={placeholderMode}
            tripListItems={tripListItems}
            onViewTrip={(tripId) => setFilters({ tripId, dayId: '', segmentId: '' })}
            onOpenTripManager={() => setTripManagerOpen(true)}
            onDeleteTrip={tripManager.deleteTrip}
            isReadonlyMode={isReadonlyDemoMode}
            filteredSegments={detailSegments}
            summary={summary}
            filterContext={filterContext}
            editingSegmentId={editingSegmentId}
            activeSegmentId={activeSegmentId}
            activeSegment={activeSegment}
            activeSegmentDate={segmentEditing.activeSegmentDate}
            segmentMetaDraft={segmentMetaDraft}
            onEditSegment={(segmentId) => setEditingSegmentId(segmentId)}
            onDeleteSegment={tripManager.deleteSegment}
            onStartSegmentMetaEdit={segmentEditing.startSegmentMetaEdit}
            onCancelSegmentMetaEdit={() => setSegmentMetaDraft(null)}
            onSaveSegmentMetaEdit={segmentEditing.saveSegmentMetaEdit}
            onUpdateSegmentMetaDraft={(patch) => {
              setSegmentMetaDraft((prev) => (prev ? { ...prev, ...patch } : prev))
            }}
            routePreference={routePreferenceValue}
            routeMode={routeModeValue}
            onChangeRouteMode={(value) => {
              if (!activeSegmentId) return
              tripManager.updateSegment(activeSegmentId, (segment) => ({ ...segment, routeType: value }))
            }}
            onChangeRoutePreference={(value) => {
              if (!activeSegmentId) return
              tripManager.updateSegment(activeSegmentId, (segment) => ({ ...segment, preference: value }))
            }}
            onMoveSegmentInTrip={tripManager.moveSegmentInTrip}
            canMoveSegmentUp={tripManager.canMoveSegment(activeSegmentId, 'up')}
            canMoveSegmentDown={tripManager.canMoveSegment(activeSegmentId, 'down')}
            waypoints={editingWaypointSegmentId === activeSegmentId ? waypointDrafts : segmentEditing.displayedWaypoints}
            onLocateWaypoint={(waypoint) => setSelectedWaypointId(waypoint.id)}
            waypointEditMode={editingWaypointSegmentId === activeSegmentId}
            onStartWaypointEdit={() => {
              if (activeSegmentId) segmentEditing.startWaypointEdit(activeSegmentId)
            }}
            onCancelWaypointEdit={editing.cancelWaypointEdit}
            onSaveWaypoints={segmentEditing.saveWaypoints}
            onAddWaypoint={segmentEditing.addWaypoint}
            onUpdateWaypointName={editing.updateWaypointName}
            onSelectWaypointPlace={editing.selectWaypointPlace}
            onMoveWaypoint={editing.moveWaypoint}
            onDeleteWaypoint={editing.deleteWaypoint}
            endpointEditMode={editingEndpointsSegmentId === activeSegmentId}
            endpointDraft={segmentEditing.effectiveEndpointDraft}
            onStartEndpointEdit={() => {
              if (activeSegmentId) segmentEditing.startEndpointsEdit(activeSegmentId)
            }}
            onCancelEndpointEdit={editing.cancelEndpointEdit}
            onSaveEndpoints={segmentEditing.saveEndpoints}
            onUpdateEndpointText={editing.updateEndpointText}
            onSelectEndpointPlace={editing.selectEndpointPlace}
            onUpdateSegmentScore={(field, value) => {
              if (!activeSegmentId) return
              tripManager.updateSegment(activeSegmentId, (segment) => ({
                ...segment,
                [field]: normalizeScore(value),
              }))
            }}
            onUpdateSegmentNote={(value) => {
              if (!activeSegmentId) return
              tripManager.updateSegment(activeSegmentId, (segment) => ({
                ...segment,
                note: normalizeSegmentNote(value),
              }))
            }}
          />
        </aside>
      </div>

      <footer className="app-mode-footer">当前模式：{appMode === 'readonly-demo' ? 'readonly-demo（演示只读）' : 'normal（正常可编辑）'}</footer>

      <AmapKeySetupDialog
        open={amapKeyConfig.isOpen}
        configured={amapKeyConfig.configured}
        source={amapKeyConfig.source}
        isSaving={amapKeyConfig.isSaving}
        error={amapKeyConfig.error}
        onSave={amapKeyConfig.save}
        onClose={amapKeyConfig.close}
      />
    </main>
  )
}

export default App
