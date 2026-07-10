import type { CoordPoint } from '../types/trip'

const DB_NAME = 'trip-route-cache'
const DB_VERSION = 1
const STORE_NAME = 'segmentRoutes'

export interface RouteCacheRecord {
  segmentId: string
  routeBuildKey: string
  points: CoordPoint[]
  updatedAt: number
}

interface SaveSegmentRouteCacheParams {
  segmentId: string
  routeBuildKey: string
  points: CoordPoint[]
}

function normalizeCoordPoint(value: unknown): CoordPoint | undefined {
  if (!value || typeof value !== 'object') return undefined

  const candidate = value as Partial<CoordPoint>
  if (typeof candidate.lat !== 'number' || typeof candidate.lon !== 'number') return undefined

  const point: CoordPoint = {
    lat: candidate.lat,
    lon: candidate.lon,
  }

  if (typeof candidate.timestamp === 'string') {
    point.timestamp = candidate.timestamp
  }

  return point
}

export function normalizeCoordPointArray(value: unknown): CoordPoint[] | undefined {
  if (!Array.isArray(value)) return undefined

  const points = value
    .map((item) => normalizeCoordPoint(item))
    .filter((item): item is CoordPoint => Boolean(item))

  return points.length > 0 ? points : undefined
}

function openRouteCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'segmentId' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveSegmentRouteCache(params: SaveSegmentRouteCacheParams): Promise<void> {
  try {
    const points = normalizeCoordPointArray(params.points)
    if (!points?.length) return

    const db = await openRouteCacheDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const payload: RouteCacheRecord = {
        segmentId: params.segmentId,
        routeBuildKey: params.routeBuildKey,
        points,
        updatedAt: Date.now(),
      }

      store.put(payload)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  } catch (error) {
    console.error('[routeCacheDb] Failed to save segment route cache.', error)
  }
}

export async function getSegmentRouteCache(segmentId: string): Promise<RouteCacheRecord | null> {
  try {
    const db = await openRouteCacheDb()
    const record = await new Promise<RouteCacheRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(segmentId)

      request.onsuccess = () => {
        if (!request.result) {
          resolve(null)
          return
        }

        const result = request.result as Partial<RouteCacheRecord>
        const points = normalizeCoordPointArray(result.points)
        if (!points || typeof result.routeBuildKey !== 'string' || typeof result.segmentId !== 'string') {
          resolve(null)
          return
        }

        resolve({
          segmentId: result.segmentId,
          routeBuildKey: result.routeBuildKey,
          points,
          updatedAt: typeof result.updatedAt === 'number' ? result.updatedAt : 0,
        })
      }
      request.onerror = () => reject(request.error)
    })
    db.close()
    return record
  } catch (error) {
    console.error('[routeCacheDb] Failed to read segment route cache.', error)
    return null
  }
}

export async function getAllSegmentRouteCache(): Promise<RouteCacheRecord[]> {
  try {
    const db = await openRouteCacheDb()
    const records = await new Promise<RouteCacheRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const results = Array.isArray(request.result) ? request.result : []
        const normalized = results
          .map((item) => {
            const result = item as Partial<RouteCacheRecord>
            const points = normalizeCoordPointArray(result.points)
            if (!points || typeof result.routeBuildKey !== 'string' || typeof result.segmentId !== 'string') {
              return null
            }

            return {
              segmentId: result.segmentId,
              routeBuildKey: result.routeBuildKey,
              points,
              updatedAt: typeof result.updatedAt === 'number' ? result.updatedAt : 0,
            }
          })
          .filter((item): item is RouteCacheRecord => Boolean(item))

        resolve(normalized)
      }
      request.onerror = () => reject(request.error)
    })
    db.close()
    return records
  } catch (error) {
    console.error('[routeCacheDb] Failed to read all segment route cache.', error)
    return []
  }
}

export async function deleteSegmentRouteCache(segmentId: string): Promise<void> {
  try {
    const db = await openRouteCacheDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.delete(segmentId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  } catch (error) {
    console.error('[routeCacheDb] Failed to delete segment route cache.', error)
  }
}

export async function clearAllRouteCache(): Promise<void> {
  try {
    const db = await openRouteCacheDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
  } catch (error) {
    console.error('[routeCacheDb] Failed to clear route cache.', error)
  }
}

export async function replaceAllSegmentRouteCache(records: RouteCacheRecord[]): Promise<number> {
  try {
    const normalizedRecords = records
      .map((record) => {
        const points = normalizeCoordPointArray(record.points)
        if (!points || typeof record.segmentId !== 'string' || typeof record.routeBuildKey !== 'string') {
          return null
        }

        return {
          segmentId: record.segmentId,
          routeBuildKey: record.routeBuildKey,
          points,
          updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : Date.now(),
        } satisfies RouteCacheRecord
      })
      .filter((record): record is RouteCacheRecord => Boolean(record))

    const db = await openRouteCacheDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()
      normalizedRecords.forEach((record) => store.put(record))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
    db.close()
    return normalizedRecords.length
  } catch (error) {
    console.error('[routeCacheDb] Failed to replace segment route cache.', error)
    throw error
  }
}
