import { describe, it, expect, vi, beforeEach } from 'vitest'
import { callLLMApi } from '../api.js'

function buildSseStream(chunks) {
  const encoder = new TextEncoder()
  const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n'
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body))
      controller.close()
    },
  })
}

describe('callLLMApi — SSE shapes', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  it('TTFT is recorded on first content chunk (mixed stream)', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      body: buildSseStream([
        { choices: [{ delta: { content: 'Hi' } }] },
        { choices: [{ delta: { content: ' there' } }] },
        { usage: { prompt_tokens: 5, completion_tokens: 2 } },
      ]),
    })

    const r = await callLLMApi('https://example.com', 'k', 'm', 'hello')
    expect(r.tokenSource).toBe('official')
    expect(r.completionTokens).toBe(2)
    expect(r.ttft).toBeGreaterThanOrEqual(0)
    expect(r.chunkCount).toBe(1)
  })

  it('TTFT NOT triggered by usage-only chunk', async () => {
    let resolveBody
    const body = new ReadableStream({
      start(c) {
        resolveBody = (chunks) => {
          const enc = new TextEncoder()
          c.enqueue(enc.encode(chunks.map((x) => `data: ${JSON.stringify(x)}\n\n`).join('') + 'data: [DONE]\n\n'))
          c.close()
        }
      },
    })

    globalThis.fetch.mockResolvedValue({ ok: true, body })

    const promise = callLLMApi('https://example.com', 'k', 'm', 'hello')
    resolveBody([
      { choices: [{ delta: { content: 'A' } }] },
      { usage: { prompt_tokens: 1, completion_tokens: 1 } },
    ])

    const r = await promise
    expect(r.ttft).toBeGreaterThanOrEqual(0)
    expect(r.ttft).toBeLessThan(r.latency + 5)
  })

  it('falls back to tokenizer when no usage provided', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      body: buildSseStream([
        { choices: [{ delta: { content: '你好世界' } }] },
      ]),
    })

    const r = await callLLMApi('https://example.com', 'k', 'm', 'hi')
    expect(r.tokenSource).toBe('tokenizer')
    expect(r.completionTokens).toBeGreaterThan(0)
  })

  it('steadyTps uses completionTokens (no -1)', async () => {
    let enqueue1
    const body = new ReadableStream({
      start(c) {
        const enc = new TextEncoder()
        c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: 'hello world' } }] })}\n\n`))
        enqueue1 = (chunk) => {
          c.enqueue(enc.encode(`data: ${JSON.stringify(chunk)}\n\n`))
          c.enqueue(enc.encode('data: [DONE]\n\n'))
          c.close()
        }
      },
    })

    globalThis.fetch.mockResolvedValue({ ok: true, body })

    const promise = callLLMApi('https://example.com', 'k', 'm', 'hi')
    await new Promise((r) => setTimeout(r, 10))
    enqueue1({ usage: { prompt_tokens: 1, completion_tokens: 100 } })

    const r = await promise
    expect(r.completionTokens).toBe(100)
    expect(r.steadyTps).toBeGreaterThan(0)
  })

  it('throws with status on HTTP 401', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'bad key' }),
    })

    await expect(callLLMApi('https://example.com', 'k', 'm', 'hi'))
      .rejects.toMatchObject({ status: 401, cause: 'http_error' })
  })
})

describe('callLLMApi — SSE parse errors (S7)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  function buildRawSseStream(rawText) {
    const encoder = new TextEncoder()
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(rawText))
        controller.close()
      },
    })
  }

  it('counts malformed data: chunks in parseErrorCount and still succeeds', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      body: buildRawSseStream(
        'data: this is not json\n\n'
        + `data: ${JSON.stringify({ choices: [{ delta: { content: 'hi' } }] })}\n\n`
        + 'data: also not json {{ broken\n\n'
        + `data: ${JSON.stringify({ usage: { prompt_tokens: 1, completion_tokens: 1 } })}\n\n`
        + 'data: [DONE]\n\n',
      ),
    })

    const r = await callLLMApi('https://example.com', 'k', 'm', 'hi')
    expect(r.parseErrorCount).toBe(2)
    expect(r.completionTokens).toBe(1)
    expect(r.tokenSource).toBe('official')
  })

  it('returns parseErrorCount=N when ALL data: chunks are malformed (no throw)', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      body: buildRawSseStream(
        'data: broken { json\n\n'
        + 'data: still broken ::\n\n'
        + 'data: [DONE]\n\n',
      ),
    })

    const r = await callLLMApi('https://example.com', 'k', 'm', 'hi')
    expect(r.parseErrorCount).toBe(2)
    expect(r.completionTokens).toBe(0)
  })

  it('parseErrorCount is 0 on a clean stream', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      body: buildSseStream([
        { choices: [{ delta: { content: 'ok' } }] },
        { usage: { prompt_tokens: 1, completion_tokens: 1 } },
      ]),
    })

    const r = await callLLMApi('https://example.com', 'k', 'm', 'hi')
    expect(r.parseErrorCount).toBe(0)
  })
})
