/**
 * Models data service.
 *
 * Pulls model catalog from the /api/models-cache edge proxy (which fronts
 * models.dev) and merges it with the local provider adapter layer.
 *
 * 3-layer fallback chain:
 *   L1 remote fetch → L2 localStorage (6h TTL) → L3 builtin local providers
 *
 * UI prefs (showDeprecated / showBetaPreview) are applied to the merged
 * list before it is returned. They are NOT owned by this module; the
 * caller is expected to pass them in (and persist them via storage).
 */

import { providers as localProviders } from '../config/providers.js'

const LOCAL_STORAGE_KEY = 'models.dev.cache.v1'
const TTL_MS = 6 * 60 * 60 * 1000

const PROVIDER_MAP = {
  aliyun: 'alibaba',
  volcano: 'volcengine',
  zhipu: 'zhipuai',
  minimax: 'minimax',
  minimax_intl: 'minimax',
  kimi: 'moonshotai',
}

/**
 * Apply user-controlled filter rules to a list of upstream models.
 * - Hide models with status === 'deprecated' (unless showDeprecated).
 * - Hide models with status === 'beta' (only when showBetaPreview === false,
 *   so beta is kept by default — aligns with plan test contract).
 * - Hide models with released_at older than 180 days.
 * @param {Array<object>} models
 * @param {{showDeprecated?:boolean, showBetaPreview?:boolean}} prefs
 * @returns {Array<object>}
 */
export function applyFilters(models, prefs = {}) {
  const cutoff = Date.now() - 180 * 24 * 3600 * 1000
  return models.filter((m) => {
    if (!prefs.showDeprecated && m.status === 'deprecated') return false
    if (prefs.showBetaPreview === false && m.status === 'beta') return false
    if (m.released_at && new Date(m.released_at).getTime() < cutoff) return false
    return true
  })
}

/**
 * Fetch remote catalog, merge with local provider adapters, apply filters.
 * @param {object} [opts]
 * @param {Array<object>} [opts.localProviders] - override local adapter list (test seam)
 * @param {object} [opts.providerMap] - override provider id mapping (test seam)
 * @param {object} [opts.prefs] - filter prefs {showDeprecated, showBetaPreview}
 * @param {typeof fetch} [opts.fetcher] - override fetch (test seam)
 * @returns {Promise<Array<object>>} merged provider array with `models` field populated
 */
export async function fetchMergedModels({
  localProviders: local = localProviders,
  providerMap = PROVIDER_MAP,
  prefs = {},
  fetcher = (...args) => fetch(...args),
} = {}) {
  const remote = await fetchRemote(fetcher)
  const byProvider = remote?.providers || remote || {}

  return local.map((p) => {
    if (p.isCustom) return { ...p, models: [] }
    const upstreamId = providerMap[p.id]
    const upstreamModels = upstreamId && byProvider[upstreamId]?.models
      ? Object.values(byProvider[upstreamId].models)
      : []
    return { ...p, models: applyFilters(upstreamModels, prefs) }
  })
}

async function fetchRemote(fetcher) {
  try {
    const r = await fetcher('/api/models-cache', { cache: 'no-cache' })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    saveCache(data)
    return data
  } catch {
    const cached = loadCache()
    if (cached) return cached
    throw new Error('无法获取模型列表，且无本地缓存')
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ at: Date.now(), data }))
  } catch { /* quota */ }
}

function loadCache() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return null
    const { at, data } = JSON.parse(raw)
    if (Date.now() - at > TTL_MS) return null
    return data
  } catch { return null }
}

/**
 * Return the timestamp (ms) when the localStorage cache was last refreshed,
 * or null if no cache exists. Used by UI to render "data N days old" hint.
 * @returns {number|null}
 */
export function getModelsCacheTimestamp() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return null
    const { at } = JSON.parse(raw)
    return typeof at === 'number' ? at : null
  } catch { return null }
}
