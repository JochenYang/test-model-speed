import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runBenchmark } from '../benchmark.js'
import { BENCHMARK_CONFIG } from '../../config/benchmark.js'

describe('runBenchmark', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
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

    expect(globalThis.fetch).toHaveBeenCalledTimes(4)
    expect(r.aggregate.ttft.samples).toBe(3)
    expect(r.successRate).toBeGreaterThan(0)
    expect(r.failedRuns).toEqual([])
  })

  it('continues on per-run failure and reports successRate', async () => {
    let n = 0
    globalThis.fetch.mockImplementation(async () => {
      n++
      if (n === 2) return { ok: false, status: 500, statusText: 'err', json: async () => ({}) }
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

function makeSse(chunks) {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode(chunks.map((x) => `data: ${JSON.stringify(x)}\n\n`).join('') + 'data: [DONE]\n\n'))
      c.close()
    },
  })
}
