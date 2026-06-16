/**
 * Pure helpers for HistoryChart.
 * Kept separate from the component so they can be unit tested without React.
 */

export const METRICS = [
  { key: 'ttft', label: { zh: 'TTFT (ms)', en: 'TTFT (ms)' } },
  { key: 'latency', label: { zh: '总耗时 (ms)', en: 'Latency (ms)' } },
  { key: 'throughput', label: { zh: '稳定吞吐 (tok/s)', en: 'Steady TPS' } },
  { key: 'effectiveTps', label: { zh: '有效吞吐 (tok/s)', en: 'Effective TPS' } },
]

/**
 * Filter history entries by time range (relative to now).
 * @param {Array<object>} history
 * @param {'7d'|'30d'|'all'} range
 */
export function filterByRange(history, range) {
  if (!Array.isArray(history) || range === 'all') return history ?? []
  const days = range === '7d' ? 7 : 30
  const cutoff = Date.now() - days * 24 * 3600 * 1000
  return history.filter((h) => new Date(h.timestamp).getTime() >= cutoff)
}

/**
 * Distinct provider/model pairs as series keys (e.g. "DashScope / qwen3-max").
 * Sorted for stable legend ordering.
 * @param {Array<object>} history
 */
export function listSeries(history) {
  const set = new Set()
  for (const h of history ?? []) {
    set.add(`${h.provider ?? '?'} / ${h.model ?? '?'}`)
  }
  return Array.from(set).sort()
}

/**
 * Pivot history into wide format that Recharts expects:
 *   [{ timestamp: 1700000000000, "DashScope / qwen3-max": 320, "...": 210, ... }, ...]
 * Missing points become null (line breaks rather than 0 to avoid misleading zeros).
 * @param {Array<object>} history
 * @param {string} metric
 */
export function buildChartData(history, metric) {
  const byTime = new Map()
  for (const h of history ?? []) {
    const t = new Date(h.timestamp).getTime()
    if (!Number.isFinite(t)) continue
    if (!byTime.has(t)) byTime.set(t, { timestamp: t })
    const key = `${h.provider ?? '?'} / ${h.model ?? '?'}`
    const value = h?.[metric]
    byTime.get(t)[key] = Number.isFinite(value) ? value : null
  }
  return Array.from(byTime.values()).sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Y-axis domain that keeps every data point within view.
 *
 * Earlier IQR-based approach failed when the dataset is genuinely
 * wide-spread (e.g. TTFT bouncing between ~1500ms and ~14000ms across
 * runs): Q3 + 1.5*IQR exceeded the actual max and no cap happened.
 *
 * This implementation uses P5 / P95 to define the body of the range and
 * guarantees that the absolute min and max are inside the domain with
 * 10% padding, so no point is ever clipped off the chart.
 *
 * Pair with `<YAxis domain={...} />` (allowDataOverflow defaults to false
 * so recharts auto-fills any leftover room).
 *
 * @param {Array<object>} data - wide-format rows from buildChartData
 * @returns {[number, number]}
 */
export function computeYDomain(data) {
  if (!Array.isArray(data) || data.length === 0) return [0, 1]
  const values = []
  for (const point of data) {
    for (const [k, v] of Object.entries(point)) {
      if (k !== 'timestamp' && Number.isFinite(v)) values.push(v)
    }
  }
  if (values.length === 0) return [0, 1]

  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  // P5 / P95 with absolute-min / absolute-max fallback.
  // The fallback ensures the extreme points stay inside the axis even when
  // P5/P95 would push them out (e.g. n=3 where the only "low" point is also
  // the absolute min).
  const p5 = sorted[Math.floor(sorted.length * 0.05)] ?? min
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? max

  const domainMin = Math.max(0, Math.min(p5 * 0.9, min * 0.9))
  const domainMax = Math.max(p95 * 1.1, max * 1.1)
  return [domainMin, domainMax]
}
