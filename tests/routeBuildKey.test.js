import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildLegacySegmentRouteKey,
  buildSegmentRouteKey,
  canDisplaySegmentRouteCache,
} from '../src/utils/routeBuildKey.ts'

function createSegment(overrides = {}) {
  return {
    id: 'segment-1',
    name: '西安到宝鸡',
    startPoint: '西安',
    endPoint: '宝鸡',
    startCoord: { lat: 34.3416, lon: 108.9398 },
    endCoord: { lat: 34.3619, lon: 107.2379 },
    waypoints: [{ id: 'via-1', name: '咸阳', lat: 34.3296, lng: 108.7088 }],
    routeType: 'DRIVING',
    preference: 'HIGHWAY_FIRST',
    ...overrides,
  }
}

test('legacy route geometry remains displayable after the route build version changes', () => {
  const segment = createSegment()
  const legacyKey = buildLegacySegmentRouteKey(segment)
  const currentKey = buildSegmentRouteKey(segment)

  assert.notEqual(currentKey, legacyKey)
  assert.equal(canDisplaySegmentRouteCache(segment, legacyKey), true)
  assert.equal(canDisplaySegmentRouteCache(segment, currentKey), true)
})

test('legacy cache is rejected when a route-defining input changes', () => {
  const segment = createSegment()
  const legacyKey = buildLegacySegmentRouteKey(segment)

  assert.equal(canDisplaySegmentRouteCache({ ...segment, endPoint: '天水' }, legacyKey), false)
  assert.equal(canDisplaySegmentRouteCache({ ...segment, preference: 'AVOID_TOLL' }, legacyKey), false)
  assert.equal(
    canDisplaySegmentRouteCache(
      { ...segment, waypoints: [{ ...segment.waypoints[0], lat: 34.4 }] },
      legacyKey,
    ),
    false,
  )
})
