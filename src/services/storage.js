/**
 * LocalStorage service for persisting API key, language preference, and test history
 */

// Storage keys
const STORAGE_KEYS = {
  API_KEYS: 'llm_tester_api_keys', // Store as JSON object: { providerId: apiKey }
  HISTORY: 'llm_tester_history',
  LANGUAGE: 'llm_tester_language',
  SAVE_API_KEY: 'llm_tester_save_api_key',
  CUSTOM_PROVIDER_CONFIG: 'llm_tester_custom_provider_config',
}

const DEFAULT_CUSTOM_PROVIDER_CONFIG = {
  baseUrl: '',
  model: '',
  path: '/chat/completions',
  headers: '',
}

/**
 * API Key operations (per provider)
 */
export function getApiKeys() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.API_KEYS)
    return data ? JSON.parse(data) : {}
  } catch (error) {
    console.error('Failed to get API keys:', error)
    return {}
  }
}

export function saveApiKey(providerId, apiKey) {
  try {
    const keys = getApiKeys()
    keys[providerId] = apiKey
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys))
    return true
  } catch (error) {
    console.error('Failed to save API key:', error)
    return false
  }
}

export function getApiKey(providerId) {
  try {
    const keys = getApiKeys()
    return keys[providerId] || ''
  } catch (error) {
    console.error('Failed to get API key:', error)
    return ''
  }
}

export function clearApiKey(providerId) {
  try {
    const keys = getApiKeys()
    delete keys[providerId]
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys))
    return true
  } catch (error) {
    console.error('Failed to clear API key:', error)
    return false
  }
}

// Legacy support for single API key
export function saveApiKeyLegacy(apiKey) {
  return saveApiKey('default', apiKey)
}

export function getApiKeyLegacy() {
  return getApiKey('default')
}

/**
 * Save API Key preference (whether to save)
 */
export function getSaveApiKeyPreference() {
  try {
    return localStorage.getItem(STORAGE_KEYS.SAVE_API_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setSaveApiKeyPreference(save) {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVE_API_KEY, String(save))
    return true
  } catch {
    return false
  }
}

/**
 * Language operations
 */
export function saveLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang)
    return true
  } catch (error) {
    console.error('Failed to save language:', error)
    return false
  }
}

export function getLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'zh'
  } catch (error) {
    console.error('Failed to get language:', error)
    return 'zh'
  }
}

/**
 * History operations (legacy support - uses same storage key)
 */
const HISTORY_KEY = 'model-speed-tester-history'

export function getHistory() {
  try {
    // Check new key first, then fallback to legacy key
    let data = localStorage.getItem(STORAGE_KEYS.HISTORY)
    if (!data) {
      data = localStorage.getItem(HISTORY_KEY)
    }
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to read history:', error)
    return []
  }
}

export function saveResult(result) {
  try {
    const history = getHistory()
    const newRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      provider: result.provider,
      model: result.model,
      ttft: result.ttft || result.latency,
      latency: result.latency,
      throughput: result.throughput,
      effectiveTps: result.effectiveTps || 0,
      outputTokens: result.outputTokens,
      runCount: result.runCount || 1,
      warmupCount: result.warmupCount || 0,
      successRate: result.successRate ?? 100,
      failedRuns: result.failedRuns || 0,
      tokenSource: result.tokenSource || 'unknown',
      ttftP50: result.ttftP50 || result.ttft || result.latency,
      ttftP95: result.ttftP95 || result.ttft || result.latency,
      latencyP50: result.latencyP50 || result.latency,
      latencyP95: result.latencyP95 || result.latency,
    }
    history.unshift(newRecord)
    // Keep latest 100 records
    const trimmedHistory = history.slice(0, 100)
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmedHistory))
    return newRecord
  } catch (error) {
    console.error('Failed to save result:', error)
    throw new Error('Failed to save result. Storage may be full.')
  }
}

export function deleteRecord(id) {
  try {
    const history = getHistory()
    const filtered = history.filter(item => item.id !== id)
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to delete record:', error)
    throw new Error('Failed to delete record')
  }
}

export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY)
    localStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    console.error('Failed to clear history:', error)
    throw new Error('Failed to clear history')
  }
}

export function exportCSV() {
  const history = getHistory()
  if (history.length === 0) return ''

  const headers = [
    'Time',
    'Provider',
    'Model',
    'TTFT Avg (ms)',
    'TTFT P95 (ms)',
    'Latency Avg (ms)',
    'Latency P95 (ms)',
    'Effective TPS',
    'Tokens',
    'Runs',
    'Warmup',
    'Success Rate (%)',
    'Token Source',
  ]
  const rows = history.map(item => [
    new Date(item.timestamp).toLocaleString(),
    item.provider,
    item.model,
    item.ttft || item.latency,
    item.ttftP95 || item.ttft || item.latency,
    item.latency,
    item.latencyP95 || item.latency,
    item.effectiveTps || 0,
    item.outputTokens || '',
    item.runCount || 1,
    item.warmupCount || 0,
    item.successRate ?? 100,
    item.tokenSource || 'unknown',
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

export function exportJSON() {
  const history = getHistory()
  return JSON.stringify(history, null, 2)
}

/**
 * Custom provider configuration
 */
export function getCustomProviderConfig() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_PROVIDER_CONFIG)
    if (data) {
      return { ...DEFAULT_CUSTOM_PROVIDER_CONFIG, ...JSON.parse(data) }
    }
    return DEFAULT_CUSTOM_PROVIDER_CONFIG
  } catch (error) {
    console.error('Failed to get custom provider config:', error)
    return DEFAULT_CUSTOM_PROVIDER_CONFIG
  }
}

export function saveCustomProviderConfig(config) {
  try {
    const merged = { ...DEFAULT_CUSTOM_PROVIDER_CONFIG, ...config }
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PROVIDER_CONFIG, JSON.stringify(merged))
    return true
  } catch (error) {
    console.error('Failed to save custom provider config:', error)
    return false
  }
}

/**
 * Migrate a stored result to the current schema.
 * - v1 (no schemaVersion): copy outputTokens → completionTokens, mark source unknown, aggregate null.
 * - v2: return as-is.
 * @param {object} record
 * @returns {object}
 */
export function migrateResult(record) {
  if (!record) return record
  if (record.schemaVersion === 'v2') return record

  return {
    ...record,
    schemaVersion: 'v2',
    completionTokens: record.outputTokens ?? 0,
    tokenSource: 'unknown',
    aggregate: null,
    networkBaseline: null,
    benchmarkVersion: '2.0',
  }
}

/**
 * Read history with automatic migration.
 * @returns {Array<object>}
 */
export function getHistoryMigrated() {
  const raw = getHistory()
  if (!Array.isArray(raw)) return []
  return raw.map(migrateResult)
}
