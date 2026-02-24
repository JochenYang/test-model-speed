/**
 * LLM API service for speed testing
 * Uses streaming to accurately measure TTFT, throughput, and effective TPS
 * Uses proxy to avoid CORS issues
 */

// Production: use Vercel serverless proxy
// Development: direct call (requires CORS plugin in browser)
const PROXY_URL = import.meta.env.PROD ? '/api/proxy' : null

/**
 * Call LLM API with streaming and measure performance
 * @param {string} baseUrl - Provider base URL
 * @param {string} apiKey - API key
 * @param {string} model - Model name
 * @param {string} prompt - User prompt
 * @returns {Promise<{ttft: number, latency: number, throughput: number, effectiveTps: number, outputTokens: number}>}
 */
export async function callLLMApi(baseUrl, apiKey, model, prompt) {
  const startTime = performance.now()
  let ttft = null
  let firstTokenTime = null
  let finalTokens = 0

  const endpoint = PROXY_URL || baseUrl

  const requestOptions = PROXY_URL
    ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl,
          apiKey,
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        }),
      }
    : {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          max_tokens: 512,
        }),
      }

  const streamResponse = await fetch(endpoint, requestOptions)

  if (!streamResponse.ok) {
    const error = await streamResponse.json().catch(() => ({}))
    throw new Error(error.error || `HTTP ${streamResponse.status}: ${streamResponse.statusText}`)
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

  // Approximate token count if not provided
  if (finalTokens === 0) {
    finalTokens = Math.max(1, Math.ceil(generatedText.length * 1.2))
  }

  // Calculate steady throughput
  const streamingTime = firstTokenTime ? (endTime - firstTokenTime) : 0
  const throughput = streamingTime > 0 && finalTokens > 1
    ? ((finalTokens - 1) / (streamingTime / 1000))
    : 0

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
