/**
 * Aggregate an array of numeric samples into statistical measures.
 * @param {number[]} samples
 * @returns {{avg:number, p50:number, p95:number, stdDev:number, min:number, max:number, samples:number}}
 */
export function aggregateMetric(samples) {
  if (!samples || samples.length === 0) {
    return { avg: 0, p50: 0, p95: 0, stdDev: 0, min: 0, max: 0, samples: 0 }
  }
  const sorted = [...samples].sort((a, b) => a - b)
  const n = sorted.length
  const sum = sorted.reduce((s, v) => s + v, 0)
  const avg = sum / n
  const p50 = percentile(sorted, 0.5)
  const p95 = percentile(sorted, 0.95)
  const variance = sorted.reduce((s, v) => s + (v - avg) ** 2, 0) / (n - 1 || 1)
  const stdDev = Math.sqrt(variance)
  return {
    avg: round2(avg),
    p50: round2(p50),
    p95: round2(p95),
    stdDev: round2(stdDev),
    min: round2(sorted[0]),
    max: round2(sorted[n - 1]),
    samples: n,
  }
}

/**
 * Linear-interpolation percentile (NIST type 7).
 * @param {number[]} sorted - sorted ascending
 * @param {number} p - percentile in [0, 1]
 */
function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]
  const idx = p * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

function round2(n) {
  return Math.round(n * 100) / 100
}
