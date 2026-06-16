import { describe, it, expect } from 'vitest'
import { migrateResult } from '../storage.js'

describe('migrateResult', () => {
  it('migrates v1 record to v2 with completionTokens + unknown source', () => {
    const v1 = {
      ttft: 100, latency: 1000, throughput: 50, effectiveTps: 50,
      outputTokens: 50, timestamp: '2026-01-01T00:00:00Z',
      provider: 'aliyun', model: 'qwen3-max',
    }
    const v2 = migrateResult(v1)
    expect(v2.schemaVersion).toBe('v2')
    expect(v2.completionTokens).toBe(50)
    expect(v2.tokenSource).toBe('unknown')
    expect(v2.aggregate).toBeNull()
  })

  it('passes through v2 record unchanged', () => {
    const v2 = {
      schemaVersion: 'v2',
      ttft: 100, latency: 1000, throughput: 50, effectiveTps: 50,
      completionTokens: 50, tokenSource: 'official',
      aggregate: { ttft: { samples: 3 } },
      networkBaseline: { rtt: 50, jitter: 5 },
      benchmarkVersion: '2.0',
    }
    const r = migrateResult(v2)
    expect(r).toBe(v2)
  })
})
