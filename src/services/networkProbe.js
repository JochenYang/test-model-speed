const CACHE_KEY = 'network.baseline.v1'
const PROBE_COUNT = 3
const PROBE_TIMEOUT_MS = 5000
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000

/**
 * Probe network RTT/jitter against a base URL via OPTIONS requests.
 * Falls back to a localStorage cached baseline (7-day TTL) if all probes fail.
 * @param {string} baseUrl
 * @returns {Promise<NetworkBaseline|null>}
 */
export async function probeNetwork(baseUrl) {
  const samples = []
  for (let i = 0; i < PROBE_COUNT; i++) {
    const rtt = await singleProbe(baseUrl)
    if (rtt !== null) samples.push(rtt)
  }

  if (samples.length === 0) {
    return loadCache()
  }

  const sorted = [...samples].sort((a, b) => a - b)
  const rtt = sorted[Math.floor(sorted.length / 2)]
  const avg = samples.reduce((s, v) => s + v, 0) / samples.length
  const variance = samples.reduce((s, v) => s + (v - avg) ** 2, 0) / samples.length
  const jitter = Math.sqrt(variance)

  const baseline = {
    rtt: Math.round(rtt),
    jitter: Math.round(jitter),
    samples,
    measuredAt: new Date().toISOString(),
  }
  saveCache(baseline)
  return baseline
}

async function singleProbe(baseUrl) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  const start = performance.now()
  try {
    const r = await fetch(baseUrl, { method: 'OPTIONS', signal: controller.signal })
    if (!r.ok && r.status !== 405) return null
    return performance.now() - start
  } catch {
    return null
  } finally {
    clearTimeout(id)
  }
}

function saveCache(b) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(b)) } catch { /* quota / disabled */ }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const b = JSON.parse(raw)
    if (Date.now() - new Date(b.measuredAt).getTime() > CACHE_TTL_MS) return null
    return b
  } catch { return null }
}

/**
 * Classify network quality from a baseline.
 * @param {NetworkBaseline|null} b
 * @returns {'good'|'fair'|'poor'|'unknown'}
 */
export function networkStatus(b) {
  if (!b) return 'unknown'
  if (b.rtt < 100) return 'good'
  if (b.rtt < 300) return 'fair'
  return 'poor'
}
