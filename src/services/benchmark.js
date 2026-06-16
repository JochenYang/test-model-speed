import { callLLMApi } from './api.js'
import { aggregateMetric } from './aggregate.js'
import { BENCHMARK_CONFIG } from '../config/benchmark.js'

export class BenchmarkError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'BenchmarkError'
    this.details = details
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Run multi-round benchmark with warmup and aggregation.
 * @param {object} args
 * @param {object} [args.config] - benchmark config (defaults to BENCHMARK_CONFIG)
 * @param {string} args.baseUrl
 * @param {string} args.apiKey
 * @param {string} args.model
 * @param {string} args.prompt
 * @param {object} [args.apiOptions]
 * @returns {Promise<AggregateResult>}
 */
export async function runBenchmark(args) {
  const config = { ...BENCHMARK_CONFIG, ...(args.config || {}) }
  const { baseUrl, apiKey, model, prompt, apiOptions = {} } = args

  const samples = []
  const failedRuns = []

  for (let i = 0; i < config.warmupCount; i++) {
    try { await callLLMApi(baseUrl, apiKey, model, prompt, apiOptions) } catch { /* warmup failures ignored */ }
    await sleep(300)
  }

  for (let i = 0; i < config.runCount; i++) {
    try {
      const metrics = await callLLMApi(baseUrl, apiKey, model, prompt, apiOptions)
      samples.push(metrics)
    } catch (err) {
      if (err.status === 401 || err.status === 403 || err.status === 404) {
        const message = err.status === 404
          ? '模型 ID 不存在，请检查 models.dev 是否已更新或输入是否正确'
          : 'API Key 无效或模型无权访问'
        throw new BenchmarkError(message, { status: err.status, cause: err.cause, run: i })
      }
      failedRuns.push({ run: i, error: err.message, status: err.status, cause: err.cause })
    }
    await sleep(500)
  }

  if (samples.length === 0) {
    throw new BenchmarkError('所有轮次失败，请检查 API Key、模型 ID 和网络', { failedRuns })
  }

  const aggregate = {
    ttft:         aggregateMetric(samples.map((s) => s.ttft)),
    ttfb:         aggregateMetric(samples.map((s) => s.ttfb)),
    latency:      aggregateMetric(samples.map((s) => s.latency)),
    steadyTps:    aggregateMetric(samples.map((s) => s.steadyTps)),
    effectiveTps: aggregateMetric(samples.map((s) => s.effectiveTps)),
  }

  return {
    aggregate,
    successRate: samples.length / config.runCount,
    failedRuns,
    tokenSource: samples[samples.length - 1].tokenSource,
    config,
    benchmarkVersion: '2.0',
    timestamp: new Date().toISOString(),
  }
}
