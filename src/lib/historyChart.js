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
