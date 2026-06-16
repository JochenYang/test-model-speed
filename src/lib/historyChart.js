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
 * Y-axis domain that resists outlier compression.
 *
 * recharts' default YAxis domain is [dataMin, dataMax], which means a single
 * extreme outlier (e.g. an early misconfigured run reporting 1100 tok/s next
 * to steady ~12 tok/s runs) drags the upper bound up and squashes normal
 * values against the X axis.
 *
 * Algorithm:
 *  1. Collect all numeric values across every series and timestamp.
 *  2. IQR fence: if Q3 + 1.5*IQR < max, cap at the fence (Tukey's rule).
 *  3. Small-sample safety net: if max/median > 20 (Q3 itself is the outlier
 *     when n is tiny), cap at median × 10. Keeps 3-point charts usable.
 *  4. Pad 10% on both ends; clamp min to 0 (latency / TPS never negative).
 *
 * Pass the result to <YAxis domain={...} allowDataOverflow /> so recharts
 * honours the cap instead of auto-expanding to fit the outlier.
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
  const median = sorted[Math.floor(sorted.length / 2)]

  let domainMax = max
  if (sorted.length >= 4) {
    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const q3 = sorted[Math.floor(sorted.length * 0.75)]
    const iqr = q3 - q1
    if (iqr > 0) {
      const upperFence = q3 + 1.5 * iqr
      if (max > upperFence) domainMax = upperFence
    }
  }
  // Small-sample safety net (Q3 == outlier when n is tiny, IQR is meaningless).
  if (median > 0 && domainMax / median > 20) {
    domainMax = median * 10
  }

  const span = domainMax - Math.max(0, min)
  const pad = span * 0.1 || 1
  const domainMin = Math.max(0, min - pad)
  return [domainMin, domainMax + pad]
}
