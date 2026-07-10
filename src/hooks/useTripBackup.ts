import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { isReadonlyDemoMode } from '../config/appMode'
import { replaceAllSegmentRouteCache } from '../services/routeCacheDb'
import { createTripBackupExport, parseTripBackupJson } from '../services/tripBackup'
import type { FilterState, TripReview } from '../types/trip'

interface UseTripBackupParams {
  tripReview: TripReview
  setTripReview: Dispatch<SetStateAction<TripReview>>
  setFilters: Dispatch<SetStateAction<FilterState>>
  resetEditingState: () => void
}

export function useTripBackup({
  tripReview,
  setTripReview,
  setFilters,
  resetEditingState,
}: UseTripBackupParams) {
  const [isExportingBackup, setIsExportingBackup] = useState(false)
  const [isImportingBackup, setIsImportingBackup] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const backupImportInputRef = useRef<HTMLInputElement | null>(null)

  const exportBackup = useCallback(async () => {
    setIsExportingBackup(true)
    setBackupMessage('')

    try {
      const backup = await createTripBackupExport(tripReview)
      const blob = new Blob([backup.json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = backup.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      setBackupMessage(
        `已导出 ${backup.tripCount} 个旅程、${backup.routeSegmentCount} 条路段、${backup.routeCacheCount} 条路线缓存。`,
      )
    } catch (error) {
      console.error('[backup] Failed to export trip backup.', error)
      setBackupMessage('导出失败，请打开浏览器控制台查看错误。')
    } finally {
      setIsExportingBackup(false)
    }
  }, [tripReview])

  const importBackup = useCallback(async (file: File) => {
    if (isReadonlyDemoMode) return

    setIsImportingBackup(true)
    setBackupMessage('')

    try {
      const imported = parseTripBackupJson(await file.text())
      const importedCacheCount = await replaceAllSegmentRouteCache(imported.segmentRoutes)

      setTripReview(imported.tripReview)
      setFilters({ tripId: '', dayId: '', segmentId: '' })
      resetEditingState()

      setBackupMessage(
        `已导入 ${imported.tripCount} 个旅程、${imported.routeSegmentCount} 条路段、${importedCacheCount} 条路线缓存。`,
      )
    } catch (error) {
      console.error('[backup] Failed to import trip backup.', error)
      const message = error instanceof Error ? error.message : '未知错误'
      setBackupMessage(`导入失败：${message}`)
    } finally {
      setIsImportingBackup(false)
    }
  }, [resetEditingState, setFilters, setTripReview])

  const triggerBackupImport = useCallback(() => {
    if (isReadonlyDemoMode || isImportingBackup) return
    backupImportInputRef.current?.click()
  }, [isImportingBackup])

  return {
    isExportingBackup,
    isImportingBackup,
    backupMessage,
    backupImportInputRef,
    exportBackup,
    importBackup,
    triggerBackupImport,
  }
}
