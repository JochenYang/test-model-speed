/**
 * LLM API service for speed testing
 * Uses streaming to accurately measure TTFT, throughput, and effective TPS
 */

/**
 * Call LLM API with streaming and measure performance
 * Uses two requests: one for accurate token count, one for TTFT measurement
 * @param {string} baseUrl - Provider base URL
 * @param {string} apiKey - API key
 * @param {string} model - Model name
 * @param {string} prompt - User prompt
 * @returns {Promise<{ttft: number, latency: number, throughput: number, effectiveTps: number, outputTokens: number}>}
 */
export async function callLLMApi(baseUrl, apiKey, model, prompt) {
  const url = `${baseUrl}/chat/completions`

  // Step 1: Non-streaming request to get accurate token count
  const nonStreamResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream: false,
      max_tokens: 512,
    }),
  })

  if (!nonStreamResponse.ok) {
    const error = await nonStreamResponse.json().catch(() => ({}))
    throw new Error(error.message || `HTTP ${nonStreamResponse.status}: ${nonStreamResponse.statusText}`)
  }

  const nonStreamData = await nonStreamResponse.json()
  const accurateTokens = nonStreamData.usage?.completion_tokens || 0

  // Step 2: Streaming request to measure TTFT
  const startTime = performance.now()
  let ttft = null
  let firstTokenTime = null

  const streamResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream: true,
      max_tokens: 512,
    }),
  })

  if (!streamResponse.ok) {
    const error = await streamResponse.json().catch(() => ({}))
    throw new Error(error.message || `HTTP ${streamResponse.status}: ${streamResponse.statusText}`)
  }

  const reader = streamResponse.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

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
          let content = data.choices?.[0]?.delta?.content

          if (!content) {
            content = data.choices?.[0]?.content
          }

          if (!content) {
            content = data.content
          }

          if (content) {
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

  // Use accurate token count from non-streaming response
  const finalTokens = accurateTokens

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
