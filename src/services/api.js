/**
 * LLM API service for speed testing
 * Uses streaming to accurately measure TTFT, throughput, and effective TPS
 */

const isProd = import.meta.env.PROD

/**
 * Call LLM API with streaming and measure performance
 * @param {string} baseUrl - Provider base URL
 * @param {string} apiKey - API key
 * @param {string} model - Model name
 * @param {string} prompt - User prompt
 * @returns {Promise<{ttft: number, latency: number, throughput: number, effectiveTps: number, outputTokens: number}>}
 */
export async function callLLMApi(baseUrl, apiKey, model, prompt) {
  // Production: use Vercel proxy to avoid CORS
  // Development: direct call
  const url = isProd ? '/api/proxy' : `${baseUrl}/chat/completions`

  // Build request body
  const requestBase = {
    model: model,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    max_tokens: 512,
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

  const streamResponse = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  })

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

  // Improved token estimation - corrected formula
  // Chinese: ~0.5-0.7 tokens per character, English: ~0.25 tokens per character (1 token ≈ 4 chars)
  if (finalTokens === 0) {
    const text = generatedText
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const otherChars = text.length - chineseChars
    // Correction: divide by character count per token, not multiply
    finalTokens = Math.max(1, Math.ceil(chineseChars / 1.5 + otherChars / 4))
  }

  // Calculate steady throughput - time from first token to last token
  const streamingTime = firstTokenTime ? (endTime - firstTokenTime) : 0
  let throughput = 0
  // Use 100ms as minimum threshold for more accurate measurement
  if (streamingTime > 100 && finalTokens > 0) {
    throughput = finalTokens / (streamingTime / 1000)
  } else if (finalTokens > 0 && totalLatency > 0) {
    // Fallback to total latency if streaming time is too small
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
