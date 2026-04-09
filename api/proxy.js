/**
 * Vercel Serverless Function - API Proxy
 * 解决 CORS 跨域问题
 */

export const runtime = 'edge'

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
  const safeHeaders = {}

  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = String(rawKey || '').trim()
    if (!key) continue
    if (blocked.has(key.toLowerCase())) continue
    safeHeaders[key] = String(rawValue ?? '')
  }

  return safeHeaders
}

export async function POST(request) {
  const body = await request.json()

  const { baseUrl, apiKey, model, messages, stream, endpointPath, extraHeaders } = body

  if (!baseUrl || !apiKey || !model || !messages) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const normalizedBaseUrl = String(baseUrl).replace(/\/+$/, '')
    const normalizedPath = normalizeEndpointPath(endpointPath)
    const safeHeaders = sanitizeHeaders(extraHeaders)

    const response = await fetch(`${normalizedBaseUrl}${normalizedPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...safeHeaders,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: stream || false,
        max_tokens: body.max_tokens,
        stream_options: body.stream_options,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(errorText, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // 如果是流式响应
    if (stream) {
      const readableStream = new ReadableStream({
        async start(controller) {
          const reader = response.body.getReader()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
          controller.close()
        },
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // 非流式响应
    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
