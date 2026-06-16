import { describe, it, expect } from 'vitest'
import { aggregateMetric } from '../aggregate.js'

describe('aggregateMetric', () => {
  it('returns zero for empty array', () => {
    const r = aggregateMetric([])
    expect(r.avg).toBe(0)
    expect(r.p50).toBe(0)
    expect(r.p95).toBe(0)
    expect(r.stdDev).toBe(0)
    expect(r.samples).toBe(0)
  })

  it('handles single value', () => {
    const r = aggregateMetric([42])
    expect(r.avg).toBe(42)
    expect(r.p50).toBe(42)
    expect(r.p95).toBe(42)
    expect(r.min).toBe(42)
    expect(r.max).toBe(42)
    expect(r.samples).toBe(1)
  })

  it('computes correct percentiles for [1..100]', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1)
    const r = aggregateMetric(arr)
    expect(r.avg).toBeCloseTo(50.5, 1)
    expect(r.p50).toBeCloseTo(50.5, 1)
    expect(r.p95).toBeCloseTo(95.05, 1)
    expect(r.min).toBe(1)
    expect(r.max).toBe(100)
  })

  it('computes stdDev with n-1 denominator', () => {
    const r = aggregateMetric([2, 4, 4, 4, 5, 5, 7, 9])
    expect(r.stdDev).toBeCloseTo(2.138, 2)
  })
})
