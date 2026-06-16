import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runBenchmark, BenchmarkError } from '../benchmark.js'
import { BENCHMARK_CONFIG } from '../../config/benchmark.js'

describe('runBenchmark', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  it('invokes onProgress for each warmup and measurement run', async () => {
    // probeNetwork (3 fetches) + warmup (1) + measured (2) = 6 fetches, each
    // needs a fresh ReadableStream (closed streams can't be re-read).
    globalThis.fetch.mockImplementation(async () => ({
      ok: true,
      body: makeSse(['hello', { usage: { completion_tokens: 5, prompt_tokens: 1 } }]),
    }))

    const progress = []
    await runBenchmark({
      config: { ...BENCHMARK_CONFIG, runCount: 2, warmupCount: 1 },
      baseUrl: 'https://example.com',
      apiKey: 'k',
      model: 'm',
      prompt: 'hi',
      onProgress: (p) => progress.push(p),
    })

    // warmup(1) + measured(2) = 3 progress events
    expect(progress).toHaveLength(3)
    expect(progress[0]).toMatchObject({ phase: 'warmup', run: 1, totalRuns: 3 })
    expect(progress[1]).toMatchObject({ phase: 'measure', run: 2, totalRuns: 3 })
    expect(progress[2]).toMatchObject({ phase: 'measure', run: 3, totalRuns: 3 })
  })

  it('runs warmupCount + runCount calls and aggregates', async () => {
    globalThis.fetch.mockImplementation(async () => ({
      ok: true,
      body: makeSse(['hello', { usage: { completion_tokens: 50, prompt_tokens: 10 } }]),
    }))

    const cfg = { ...BENCHMARK_CONFIG, runCount: 3, warmupCount: 1 }
    const r = await runBenchmark({
      config: cfg,
      baseUrl: 'https://example.com',
      apiKey: 'k',
      model: 'm',
      prompt: 'hi',
    })

    expect(globalThis.fetch).toHaveBeenCalledTimes(7)
    expect(r.aggregate.ttft.samples).toBe(3)
    expect(r.successRate).toBeGreaterThan(0)
    expect(r.failedRuns).toEqual([])
    expect('networkBaseline' in r).toBe(true)
  })

  it('continues on per-run failure and reports successRate', async () => {
    let n = 0
    globalThis.fetch.mockImplementation(async () => {
      n++
      if (n === 5) return { ok: false, status: 500, statusText: 'err', json: async () => ({}) }
      return { ok: true, body: makeSse(['ok', { usage: { completion_tokens: 5, prompt_tokens: 1 } }]) }
    })

    const r = await runBenchmark({
      config: { ...BENCHMARK_CONFIG, runCount: 3, warmupCount: 0 },
      baseUrl: 'https://example.com',
      apiKey: 'k',
      model: 'm',
      prompt: 'hi',
    })

    expect(r.successRate).toBeCloseTo(0.667, 2)
    expect(r.failedRuns.length).toBe(1)
    expect('networkBaseline' in r).toBe(true)
  })

  it('throws BenchmarkError when all runs fail', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'err',
      json: async () => ({}),
    })

    await expect(
      runBenchmark({
        config: { ...BENCHMARK_CONFIG, runCount: 2, warmupCount: 0 },
        baseUrl: 'https://example.com',
        apiKey: 'k',
        model: 'm',
        prompt: 'hi',
      }),
    ).rejects.toThrow(/所有轮次失败/)
  })
})

describe('runBenchmark — HTTP 401/403/404 immediate abort (S7)', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  it('throws BenchmarkError immediately on HTTP 401 (after 1 call, not 3)', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'bad key' }),
    })

    let err
    try {
      await runBenchmark({
        config: { ...BENCHMARK_CONFIG, runCount: 3, warmupCount: 0 },
        baseUrl: 'https://example.com',
        apiKey: 'bad',
        model: 'm',
        prompt: 'hi',
      })
    } catch (e) { err = e }

    expect(err).toBeInstanceOf(BenchmarkError)
    expect(err.message).toBe('API Key 无效或模型无权访问')
    expect(err.details).toMatchObject({ status: 401, cause: 'http_error', run: 0 })
    expect(globalThis.fetch).toHaveBeenCalledTimes(4)
  })

  it('throws BenchmarkError immediately on HTTP 403 with auth message', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ error: 'forbidden' }),
    })

    let err
    try {
      await runBenchmark({
        config: { ...BENCHMARK_CONFIG, runCount: 3, warmupCount: 0 },
        baseUrl: 'https://example.com',
        apiKey: 'k',
        model: 'm',
        prompt: 'hi',
      })
    } catch (e) { err = e }

    expect(err).toBeInstanceOf(BenchmarkError)
    expect(err.message).toBe('API Key 无效或模型无权访问')
    expect(err.details).toMatchObject({ status: 403, cause: 'http_error' })
    expect(globalThis.fetch).toHaveBeenCalledTimes(4)
  })

  it('throws BenchmarkError immediately on HTTP 404 with model-id message', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: 'model not found' }),
    })

    let err
    try {
      await runBenchmark({
        config: { ...BENCHMARK_CONFIG, runCount: 3, warmupCount: 0 },
        baseUrl: 'https://example.com',
        apiKey: 'k',
        model: 'no-such-model',
        prompt: 'hi',
      })
    } catch (e) { err = e }

    expect(err).toBeInstanceOf(BenchmarkError)
    expect(err.message).toBe('模型 ID 不存在，请检查 models.dev 是否已更新或输入是否正确')
    expect(err.details).toMatchObject({ status: 404, cause: 'http_error' })
    expect(globalThis.fetch).toHaveBeenCalledTimes(4)
  })

  it('does NOT abort on HTTP 500 — still goes through per-run failure path', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'err',
      json: async () => ({}),
    })

    await expect(
      runBenchmark({
        config: { ...BENCHMARK_CONFIG, runCount: 2, warmupCount: 0 },
        baseUrl: 'https://example.com',
        apiKey: 'k',
        model: 'm',
        prompt: 'hi',
      }),
    ).rejects.toThrow(/所有轮次失败/)

    expect(globalThis.fetch).toHaveBeenCalledTimes(5)
  })
})

function makeSse(chunks) {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(chunks.map((x) => `data: ${JSON.stringify(x)}\n\n`).join('') + 'data: [DONE]\n\n'))
      c.close()
    },
  })
}
