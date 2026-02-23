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

  const startTime = performance.now()
  let ttft = null
  let firstTokenTime = null
  let finalTokens = 0

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
      stream_options: { include_usage: true },
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
  let generatedText = '' // Fallback based on text length if usage is not provided

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
          
          // Try to get token usage from the stream (OpenAI compatible stream_options)
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

  // If usage was not provided in the stream, approximate it using char count 
  // (Chinese characters typically are ~1.5 tokens, English words ~1.3 tokens. using 1.2 as a rough multiplier for mixed text)
  if (finalTokens === 0) {
    // Basic approximation assuming average CJK text
    finalTokens = Math.max(1, Math.ceil(generatedText.length * 1.2))
  }

  // Calculate steady throughput (Tokens per second after the first token)
  const streamingTime = firstTokenTime ? (endTime - firstTokenTime) : 0
  const throughput = streamingTime > 0 && finalTokens > 1
    ? ((finalTokens - 1) / (streamingTime / 1000))
    : 0

  // Calculate effective TPS (Total tokens / Total latency)
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
