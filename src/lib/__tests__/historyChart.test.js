import { describe, it, expect, vi, afterEach } from 'vitest'
import { METRICS, filterByRange, listSeries, buildChartData, computeYDomain } from '../historyChart.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('filterByRange', () => {
  it('returns all entries when range is "all"', () => {
    const history = [
      { timestamp: '2024-01-01T00:00:00Z' },
      { timestamp: '2025-01-01T00:00:00Z' },
    ]
    expect(filterByRange(history, 'all')).toEqual(history)
  })

  it('keeps entries newer than the cutoff for 7d', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-16T12:00:00Z'))
    const history = [
      { id: 1, timestamp: '2026-06-15T00:00:00Z' }, // 1.5d ago, kept
      { id: 2, timestamp: '2026-06-10T00:00:00Z' }, // 6.5d ago, kept
      { id: 3, timestamp: '2026-06-09T00:00:00Z' }, // 7.5d ago, dropped
    ]
    const out = filterByRange(history, '7d')
    expect(out.map((h) => h.id)).toEqual([1, 2])
  })

  it('keeps entries newer than the cutoff for 30d', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-16T12:00:00Z'))
    const history = [
      { id: 1, timestamp: '2026-06-01T00:00:00Z' }, // 15d, kept
      { id: 2, timestamp: '2026-05-01T00:00:00Z' }, // 46d, dropped
    ]
    expect(filterByRange(history, '30d').map((h) => h.id)).toEqual([1])
  })

  it('handles empty / null input', () => {
    expect(filterByRange([], '7d')).toEqual([])
    expect(filterByRange(null, '7d')).toEqual([])
  })
})

describe('listSeries', () => {
  it('returns unique "provider / model" pairs sorted', () => {
    const history = [
      { provider: 'B', model: 'x' },
      { provider: 'A', model: 'y' },
      { provider: 'B', model: 'x' }, // duplicate
      { provider: 'A', model: 'z' },
    ]
    expect(listSeries(history)).toEqual(['A / y', 'A / z', 'B / x'])
  })

  it('returns empty array for empty input', () => {
    expect(listSeries([])).toEqual([])
    expect(listSeries(null)).toEqual([])
  })
})

describe('buildChartData', () => {
  it('returns wide-format data points sorted by timestamp', () => {
    const history = [
      { timestamp: '2026-06-15T10:00:00Z', provider: 'A', model: 'x', ttft: 100 },
      { timestamp: '2026-06-15T11:00:00Z', provider: 'A', model: 'x', ttft: 120 },
      { timestamp: '2026-06-15T10:00:00Z', provider: 'B', model: 'y', ttft: 200 },
    ]
    const out = buildChartData(history, 'ttft')
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({
      timestamp: new Date('2026-06-15T10:00:00Z').getTime(),
      'A / x': 100,
      'B / y': 200,
    })
    expect(out[1]['A / x']).toBe(120)
  })

  it('returns null for missing values (line breaks, not misleading zeros)', () => {
    const history = [
      { timestamp: '2026-06-15T10:00:00Z', provider: 'A', model: 'x', ttft: 100 },
      { timestamp: '2026-06-15T11:00:00Z', provider: 'A', model: 'x' /* missing ttft */ },
    ]
    const out = buildChartData(history, 'ttft')
    expect(out[0]['A / x']).toBe(100)
    expect(out[1]['A / x']).toBeNull()
  })

  it('returns empty array for empty input', () => {
    expect(buildChartData([], 'ttft')).toEqual([])
  })
})

describe('METRICS', () => {
  it('defines the four tracked metrics with bilingual labels', () => {
    expect(METRICS.map((m) => m.key)).toEqual(['ttft', 'latency', 'throughput', 'effectiveTps'])
    for (const m of METRICS) {
      expect(m.label.zh).toBeTruthy()
      expect(m.label.en).toBeTruthy()
    }
  })
})

describe('computeYDomain', () => {
  function row(time, values) {
    return { timestamp: time, ...values }
  }

  it('returns a safe default for empty input', () => {
    expect(computeYDomain([])).toEqual([0, 1])
    expect(computeYDomain(null)).toEqual([0, 1])
    expect(computeYDomain([{ timestamp: 1 }])).toEqual([0, 1])
  })

  it('pads evenly when there are too few points for IQR (3-point case)', () => {
    // The reported bug: MiniMax-M3 around 12 tok/s, plus one legacy outlier
    // at ~1100. With n=3, IQR is meaningless; the small-sample safety net
    // caps at median × 10 instead of letting 1100 squash everything to 0.
    const data = [
      row(1, { 'A': 12, 'B': 12.73 }),
      row(2, { 'A': 1100 }),
    ]
    const [lo, hi] = computeYDomain(data)
    expect(hi).toBeLessThan(200)         // not 1210
    expect(hi).toBeGreaterThan(120)      // but covers the 1100 order of magnitude
    expect(lo).toBeLessThan(15)          // sits near the low values, not 0
    expect(lo).toBeGreaterThanOrEqual(0)
  })

  it('uses max when no outlier is present', () => {
    const data = [
      row(1, { A: 30, B: 40 }),
      row(2, { A: 50, B: 60 }),
      row(3, { A: 35, B: 55 }),
    ]
    const [, hi] = computeYDomain(data)
    expect(hi).toBeGreaterThanOrEqual(60)
    expect(hi).toBeLessThan(80)
  })

  it('caps at IQR fence when a real outlier exists (n >= 4)', () => {
    // 5 normal points at ~30 + 1 outlier at 1000
    const data = [
      row(1, { A: 28 }),
      row(2, { A: 30 }),
      row(3, { A: 31 }),
      row(4, { A: 32 }),
      row(5, { A: 33 }),
      row(6, { A: 1000 }),
    ]
    const [, hi] = computeYDomain(data)
    expect(hi).toBeLessThan(80)          // outlier excluded
    expect(hi).toBeGreaterThan(33)
  })

  it('never goes negative (clamp at 0)', () => {
    const data = [
      row(1, { A: 5, B: 10 }),
      row(2, { A: 8, B: 12 }),
    ]
    const [lo] = computeYDomain(data)
    expect(lo).toBeGreaterThanOrEqual(0)
  })
})
