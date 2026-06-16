/**
 * LLM API service for speed testing
 * Uses streaming to accurately measure TTFT, throughput, and effective TPS.
 * v2: TTFT/TPS strict semantics, tokenSource from official/tokenizer/estimated.
 */

import { estimateTokensWithSource } from './tokenEstimate.js'

const isProd = import.meta.env.PROD

function normalizeEndpointPath(path) {
  const fallback = '/chat/completions'
  if (!path || typeof path !== 'string') return fallback
  const trimmed = path.trim()
  if (!trimmed) return fallback
  if (trimmed.includes('://')) return fallback
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function sanitizeHeaders(input) {
  if (!input || typeof input !== 'object') return {}
  const blocked = new Set(['authorization', 'content-type', 'content-length', 'host'])
  const output = {}
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = String(rawKey || '').trim()
    if (!key) continue
    if (blocked.has(key.toLowerCase())) continue
    output[key] = String(rawValue ?? '')
  }
  return output
}

/**
 * Call LLM API once with streaming. Returns run metrics.
 * @returns {Promise<RunMetrics>}
 *
 * RunMetrics shape (JSDoc):
 * {
 *   ttfb: number,              // ms, network only
 *   ttft: number,              // ms, model-only (firstTokenTime - firstByteTime)
 *   ttftOverWallClock: number, // ms, perceived
 *   latency: number,           // ms
 *   promptTokens: number,
 *   completionTokens: number,
 *   totalTokens: number,
 *   steadyTps: number,
 *   effectiveTps: number,
 *   chunkCount: number,
 *   chunkIntervals: number[],
 *   tokenSource: 'official'|'tokenizer'|'estimated',
 *   parseErrorCount: number,   // count of malformed SSE data: chunks skipped
 * }
 */
export async function callLLMApi(baseUrl, apiKey, model, prompt, options = {}) {
  const {
    maxTokens = 2048,
    timeout = 120000,
    endpointPath = '/chat/completions',
    extraHeaders = {},
  } = options

  const normalizedPath = normalizeEndpointPath(endpointPath)
  const normalizedHeaders = sanitizeHeaders(extraHeaders)
  const normalizedBaseUrl = String(baseUrl || '').replace(/\/+$/, '')
  const url = isProd ? '/api/proxy' : `${normalizedBaseUrl}${normalizedPath}`

  const requestBase = {
    model,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    max_tokens: maxTokens,
    stream_options: { include_usage: true },
  }
  const requestBody = isProd
    ? { ...requestBase, baseUrl: normalizedBaseUrl, apiKey, endpointPath: normalizedPath, extraHeaders: normalizedHeaders }
    : requestBase
  const headers = isProd
    ? { 'Content-Type': 'application/json' }
    : {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...normalizedHeaders,
      }

  const requestStart = performance.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  let response
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(requestBody), signal: controller.signal })
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      const e = new Error(`Request timeout after ${timeout / 1000}s`)
      e.cause = 'timeout'
      throw e
    }
    throw error
  }
  clearTimeout(timeoutId)

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const err = new Error(errorBody.error || errorBody.message || `HTTP ${response.status}: ${response.statusText}`)
    err.status = response.status
    err.cause = 'http_error'
    throw err
  }

  const firstByteTime = performance.now()
  const ttfb = firstByteTime - requestStart

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let generatedText = ''

  let ttft = null
  let firstTokenTime = null
  let lastChunkTime = firstByteTime
  let chunkCount = 0
  const chunkIntervals = []
  let parseErrorCount = 0

  let promptTokens = 0
  let completionTokens = 0
  let tokenSource = 'estimated'

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const now = performance.now()
    chunkIntervals.push(now - lastChunkTime)
    chunkCount++
    lastChunkTime = now

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue
      const jsonStr = trimmed.slice(6)
      try {
        const data = JSON.parse(jsonStr)

        if (data?.usage) {
          if (Number.isFinite(data.usage.prompt_tokens)) promptTokens = data.usage.prompt_tokens
          if (Number.isFinite(data.usage.completion_tokens)) {
            completionTokens = data.usage.completion_tokens
            tokenSource = 'official'
          }
        }

        const hasContent =
          data?.choices?.[0]?.delta?.content !== undefined
          || data?.choices?.[0]?.content !== undefined
        if (hasContent && ttft === null) {
          ttft = performance.now() - firstByteTime
          firstTokenTime = performance.now()
        }
        const content =
          data?.choices?.[0]?.delta?.content
          ?? data?.choices?.[0]?.content
          ?? data?.content
        if (content) generatedText += content
      } catch {
        parseErrorCount++
      }
    }
  }

  const endTime = performance.now()
  const latency = endTime - requestStart

  if (tokenSource !== 'official' && generatedText) {
    const est = estimateTokensWithSource(generatedText)
    completionTokens = est.tokens
    tokenSource = est.source
  }

  const streamingTime = firstTokenTime ? lastChunkTime - firstTokenTime : 0
  const steadyTps = streamingTime > 0 ? completionTokens / (streamingTime / 1000) : 0
  const effectiveTps = latency > 0 ? completionTokens / (latency / 1000) : 0

  return {
    ttfb: Math.round(ttfb),
    ttft: ttft !== null ? Math.round(ttft) : Math.round(latency),
    ttftOverWallClock: firstTokenTime ? Math.round(firstTokenTime - requestStart) : Math.round(latency),
    latency: Math.round(latency),
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    steadyTps: round2(steadyTps),
    effectiveTps: round2(effectiveTps),
    chunkCount,
    chunkIntervals,
    tokenSource,
    parseErrorCount,
  }
}

function round2(n) {
  return Math.round(n * 100) / 100
}
