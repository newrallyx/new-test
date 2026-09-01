import assert from 'node:assert/strict'
import test from 'node:test'

import { buildTripBackupPayload, parseTripBackupJson } from '../src/services/tripBackup.ts'

function createTripReviewWithFacts() {
  return {
    trips: [{
      id: 'trip-1',
      title: '旅程',
      category: 'review',
      startDate: '2026-08-01',
      endDate: '2026-08-02',
      days: [{
        id: 'day-1',
        date: '2026-08-01',
        routeSegments: [{
          id: 's-1',
          name: '成都到康定',
          startPoint: '成都',
          endPoint: '康定',
          preference: 'HIGHWAY_FIRST',
          routeType: 'DRIVING',
          distanceMeters: 354000,
          reviewFacts: {
            tags: ['SUNNY', 'WORTH_REVISIT'],
            actual: { distanceMeters: 371000, durationSeconds: 25500, tollYuan: 173.5 },
          },
        }],
      }],
    }],
  }
}

test('exported backup uses version 2', () => {
  const payload = buildTripBackupPayload(createTripReviewWithFacts(), [], new Date('2026-08-01T00:00:00.000Z'))
  const parsed = JSON.parse(JSON.stringify(payload))
  assert.equal(parsed.schema, 'roadtrip-retrospective-backup')
  assert.equal(parsed.version, 2)
})

test('v2 round-trip preserves review facts', () => {
  const payload = buildTripBackupPayload(createTripReviewWithFacts(), [], new Date('2026-08-01T00:00:00.000Z'))
  const imported = parseTripBackupJson(JSON.stringify(payload))
  const segment = imported.tripReview.trips[0].days[0].routeSegments[0]
  assert.deepEqual(segment.reviewFacts, {
    tags: ['SUNNY', 'WORTH_REVISIT'],
    actual: { distanceMeters: 371000, durationSeconds: 25500, tollYuan: 173.5 },
  })
})

test('v1 backup import works and old trips get no review facts', () => {
  const v1TripReview = createTripReviewWithFacts()
  v1TripReview.trips[0].days[0].routeSegments[0].reviewFacts = undefined
  const v1Payload = {
    schema: 'roadtrip-retrospective-backup',
    version: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    sources: {},
    summary: { tripCount: 1, routeSegmentCount: 1, segmentRouteCacheCount: 0 },
    data: {
      tripReview: v1TripReview,
      segmentRoutes: [],
    },
  }
  const imported = parseTripBackupJson(JSON.stringify(v1Payload))
  const segment = imported.tripReview.trips[0].days[0].routeSegments[0]
  assert.equal(segment.reviewFacts, undefined)
  assert.equal(imported.tripReview.trips[0].id, 'trip-1')
})

test('unsupported backup versions are rejected', () => {
  const v3Payload = {
    schema: 'roadtrip-retrospective-backup',
    version: 3,
    exportedAt: '2026-01-01T00:00:00.000Z',
    data: { tripReview: { trips: [] }, segmentRoutes: [] },
  }
  assert.throws(() => parseTripBackupJson(JSON.stringify(v3Payload)), /备份文件格式不匹配/)
})

test('legacy raw trip review JSON still imports', () => {
  const imported = parseTripBackupJson(JSON.stringify(createTripReviewWithFacts()))
  assert.equal(imported.tripReview.trips[0].id, 'trip-1')
})
