import { useEffect, useState } from 'react'
import { isReadonlyDemoMode } from '../config/appMode'
import { loadTripReview, saveTripReview } from '../services/tripStorage'
import type { TripReview } from '../types/trip'

const EMPTY_TRIP_REVIEW: TripReview = { trips: [] }

type DemoManifest = {
  files: string[]
}

export function useTripReviewState() {
  const [tripReview, setTripReview] = useState<TripReview>(() => {
    return isReadonlyDemoMode ? EMPTY_TRIP_REVIEW : loadTripReview()
  })
  const [demoLoading, setDemoLoading] = useState<boolean>(isReadonlyDemoMode)
  const [demoError, setDemoError] = useState<string | null>(null)

  useEffect(() => {
    if (!isReadonlyDemoMode) return

    let cancelled = false

    async function loadDemoData() {
      try {
        setDemoLoading(true)
        setDemoError(null)

        const manifestResponse = await fetch('/demo-data/manifest.json', { cache: 'no-store' })
        if (!manifestResponse.ok) {
          throw new Error(`璇诲彇 manifest.json 澶辫触锛欻TTP ${manifestResponse.status}`)
        }

        const manifest = (await manifestResponse.json()) as DemoManifest

        if (!manifest || !Array.isArray(manifest.files) || manifest.files.length === 0) {
          throw new Error('manifest.json 鏍煎紡涓嶆纭紝缂哄皯 files 鏁扮粍')
        }

        const parts = await Promise.all(
          manifest.files.map(async (filePath) => {
            const response = await fetch(filePath, { cache: 'no-store' })
            if (!response.ok) {
              throw new Error(`璇诲彇 ${filePath} 澶辫触锛欻TTP ${response.status}`)
            }

            const data = (await response.json()) as TripReview

            if (!data || !Array.isArray(data.trips)) {
              throw new Error(`${filePath} 鏍煎紡涓嶆纭紝缂哄皯 trips 鏁扮粍`)
            }

            return data
          }),
        )

        const merged: TripReview = {
          trips: parts.flatMap((part) => part.trips ?? []),
        }

        if (!cancelled) {
          setTripReview(merged)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '鏈煡閿欒'
        if (!cancelled) {
          setDemoError(message)
          setTripReview(EMPTY_TRIP_REVIEW)
        }
      } finally {
        if (!cancelled) {
          setDemoLoading(false)
        }
      }
    }

    void loadDemoData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isReadonlyDemoMode) return
    saveTripReview(tripReview)
  }, [tripReview])

  return { tripReview, setTripReview, demoLoading, demoError }
}
