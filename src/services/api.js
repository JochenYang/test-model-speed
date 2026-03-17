/**
 * LLM API service for speed testing
 * Uses streaming to accurately measure TTFT, throughput, and effective TPS
 */

const isProd = import.meta.env.PROD

/**
 * Estimate tokens using improved algorithm for mixed Chinese/English content
 * @param {string} text - Generated text
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  if (!text || text.length === 0) return 1

  // Count Chinese characters (each Chinese character ~= 0.55 tokens)
  const chineseChars = (text.match(/[\u4e00-\u9fa5]+/g) || []).join('').length

  // Remove Chinese characters and count English words
  const textWithoutChinese = text.replace(/[\u4e00-\u9fa5]/g, '')
  const englishWords = textWithoutChinese.split(/\s+/).filter(w => w.length > 0)

  // Count punctuation (each punctuation mark ~= 0.3 tokens)
  const punctuationCount = (text.match(/[\p{P}]/u) || []).length

  // Calculation: Chinese * 0.55 + English words * 1.3 + Punctuation * 0.3
  return Math.max(1, Math.ceil(
    chineseChars * 0.55 +
    englishWords.length * 1.3 +
    punctuationCount * 0.3
  ))
}

/**
 * Call LLM API with streaming and measure performance
 * @param {string} baseUrl - Provider base URL
 * @param {string} apiKey - API key
 * @param {string} model - Model name
 * @param {string} prompt - User prompt
 * @param {Object} options - Options object
 * @param {number} options.maxTokens - Maximum tokens to generate (default: 2048)
 * @param {number} options.timeout - Request timeout in milliseconds (default: 120000)
 * @returns {Promise<{ttft: number, latency: number, throughput: number, effectiveTps: number, outputTokens: number}>}
 */
export async function callLLMApi(baseUrl, apiKey, model, prompt, options = {}) {
  const { maxTokens = 2048, timeout = 120000 } = options

  // Production: use Vercel proxy to avoid CORS
  // Development: direct call
  const url = isProd ? '/api/proxy' : `${baseUrl}/chat/completions`

  // Build request body
  const requestBase = {
    model: model,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    max_tokens: maxTokens,
    stream_options: { include_usage: true }
  }

  const requestBody = isProd
    ? { ...requestBase, baseUrl, apiKey }
    : requestBase

  // Build headers
  const headers = isProd
    ? { 'Content-Type': 'application/json' }
    : {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }

  const startTime = performance.now()
  let ttft = null
  let firstTokenTime = null
  let finalTokens = 0

  // Set up AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  let streamResponse
  try {
    streamResponse = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout / 1000}s`)
    }
    throw error
  }

  clearTimeout(timeoutId)

  if (!streamResponse.ok) {
    const error = await streamResponse.json().catch(() => ({}))
    throw new Error(error.error || error.message || `HTTP ${streamResponse.status}: ${streamResponse.statusText}`)
  }

  const reader = streamResponse.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let generatedText = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      const trimmed = line.trim()

      if (!trimmed || trimmed === 'data: [DONE]') {
        continue
      }

      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6)

        try {
          const data = JSON.parse(jsonStr)

          // Try to get token usage from the stream
          // Some providers (e.g., MiniMax) send usage in a separate chunk with empty choices
          if (data.usage && data.usage.completion_tokens) {
            finalTokens = data.usage.completion_tokens
          }

          let content = data.choices?.[0]?.delta?.content

          if (!content) {
            content = data.choices?.[0]?.content
          }

          if (!content) {
            content = data.content
          }

          if (content) {
            generatedText += content
            const now = performance.now()

            if (ttft === null) {
              ttft = now - startTime
              firstTokenTime = now
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  const endTime = performance.now()
  const totalLatency = endTime - startTime

  // Improved token estimation if usage is not provided
  if (finalTokens === 0) {
    finalTokens = estimateTokens(generatedText)
  }

  // Calculate steady throughput
  // If streaming time is too short (e.g. < 50ms), it's likely buffered or too fast to measure accurately
  const streamingTime = firstTokenTime ? (endTime - firstTokenTime) : 0
  let throughput = 0
  if (streamingTime > 50 && finalTokens > 1) {
    throughput = (finalTokens - 1) / (streamingTime / 1000)
  } else if (finalTokens > 0 && totalLatency > 0) {
    // Fallback to effective TPS if streaming time is too small
    throughput = finalTokens / (totalLatency / 1000)
  }

  // Calculate effective TPS
  const effectiveTps = finalTokens > 0 && totalLatency > 0
    ? (finalTokens / (totalLatency / 1000))
    : 0

  return {
    ttft: ttft !== null ? Math.round(ttft) : Math.round(totalLatency),
    latency: Math.round(totalLatency),
    throughput: parseFloat(throughput.toFixed(2)),
    effectiveTps: parseFloat(effectiveTps.toFixed(2)),
    outputTokens: finalTokens,
  }
}
