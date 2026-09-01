import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeTripOrders, sortTripsByOrder } from '../src/utils/tripOrder.ts'

function createTrip(id, category, order) {
  return {
    id,
    category,
    order,
    title: id,
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    days: [],
  }
}

test('trip ordering follows visible order instead of backing-array order', () => {
  const trips = [
    createTrip('third', 'review', 2),
    createTrip('first', 'review', 0),
    createTrip('second', 'review', 1),
  ]

  assert.deepEqual(sortTripsByOrder(trips).map((trip) => trip.id), ['first', 'second', 'third'])
})

test('trip order normalization repairs gaps and duplicates independently per workspace', () => {
  const trips = [
    createTrip('review-last', 'review', 8),
    createTrip('plan-second', 'plan', 4),
    createTrip('review-first', 'review', 2),
    createTrip('plan-first', 'plan', 4),
  ]

  const normalized = normalizeTripOrders(trips)
  const orderById = Object.fromEntries(normalized.map((trip) => [trip.id, trip.order]))

  assert.deepEqual(orderById, {
    'review-last': 1,
    'plan-second': 0,
    'review-first': 0,
    'plan-first': 1,
  })
})
