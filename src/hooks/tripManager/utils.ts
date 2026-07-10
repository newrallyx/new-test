import type { SegmentRef } from './types'

interface SegmentSelection {
  dayId: string
  segmentId: string
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export function createDuplicateTripTitle(title: string, existingTitles: Set<string>): string {
  const baseTitle = `${title} \u526f\u672c`
  if (!existingTitles.has(baseTitle)) return baseTitle

  let copyIndex = 2
  while (existingTitles.has(`${baseTitle} ${copyIndex}`)) {
    copyIndex += 1
  }
  return `${baseTitle} ${copyIndex}`
}

export function getPreviousSegmentSelection(ref: SegmentRef): SegmentSelection | null {
  const flatSegments = ref.trip.days.flatMap((day) =>
    day.routeSegments.map((segment) => ({
      dayId: day.id,
      segmentId: segment.id,
    })),
  )
  const currentIndex = flatSegments.findIndex((item) => item.segmentId === ref.segment.id)
  if (currentIndex <= 0) return null
  return flatSegments[currentIndex - 1]
}
