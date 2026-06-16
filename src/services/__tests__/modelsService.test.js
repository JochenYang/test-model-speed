import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchMergedModels, applyFilters } from '../modelsService.js'

describe('applyFilters', () => {
  const models = [
    { id: 'a-stable', status: 'active', released_at: '2026-05-01' },
    { id: 'b-deprecated', status: 'deprecated', released_at: '2026-01-01' },
    { id: 'c-old', status: 'active', released_at: '2025-01-01' },
    { id: 'd-preview', status: 'beta', released_at: '2026-06-01' },
  ]

  it('hides deprecated, > 180 days old, and beta/preview by default (spec S3.2)', () => {
    const r = applyFilters(models, {})
    expect(r.map((m) => m.id)).toEqual(['a-stable'])
  })

  it('shows deprecated when showDeprecated is true (beta still hidden by default)', () => {
    const r = applyFilters(models, { showDeprecated: true })
    expect(r.map((m) => m.id)).toEqual(['a-stable', 'b-deprecated'])
  })

  it('shows beta when showBetaPreview is true', () => {
    const r = applyFilters(models, { showBetaPreview: true })
    expect(r.map((m) => m.id)).toEqual(['a-stable', 'd-preview'])
  })

  it('shows both deprecated and beta when both flags are true', () => {
    const r = applyFilters(models, { showDeprecated: true, showBetaPreview: true })
    expect(r.map((m) => m.id)).toEqual(['a-stable', 'b-deprecated', 'd-preview'])
  })
})

describe('fetchMergedModels', () => {
  beforeEach(() => { globalThis.fetch = vi.fn() })

  it('merges remote data with local providers and returns provider array', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        alibaba: {
          models: {
            'qwen3.5-plus': { id: 'qwen3.5-plus', name: 'Qwen3.5 Plus', released_at: '2026-02-16', status: 'active' },
            'qwen3.7-plus': { id: 'qwen3.7-plus', name: 'Qwen3.7 Plus', released_at: '2026-06-02', status: 'active' },
          },
        },
        minimax: {
          models: {
            'MiniMax-M3': { id: 'MiniMax-M3', name: 'MiniMax-M3', released_at: '2026-06-01', status: 'active' },
          },
        },
      }),
    })

    const localProviders = [
      { id: 'aliyun', name: '阿里百炼', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
      { id: 'minimax', name: 'minimax(国内)', baseUrl: 'https://api.minimaxi.com/v1' },
      { id: 'minimax_intl', name: 'minimax(国际)', baseUrl: 'https://api.minimax.io/v1' },
      { id: 'custom', name: '自定义', baseUrl: '', isCustom: true },
    ]
    const providerMap = { aliyun: 'alibaba', minimax: 'minimax', minimax_intl: 'minimax' }

    // Simulate prod mode endpoint
    const merged = await fetchMergedModels({ localProviders, providerMap, endpointUrl: '/api/models-cache' })

    const aliyun = merged.find((p) => p.id === 'aliyun')
    expect(aliyun.models.map((m) => m.id)).toEqual(['qwen3.5-plus', 'qwen3.7-plus'])

    const cn = merged.find((p) => p.id === 'minimax')
    const intl = merged.find((p) => p.id === 'minimax_intl')
    expect(cn.models[0].id).toBe('MiniMax-M3')
    expect(intl.models[0].id).toBe('MiniMax-M3')
    expect(merged.find((p) => p.id === 'custom').models).toEqual([])
  })

  it('hits models.dev directly in dev mode (npm run dev has no Vercel proxy)', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ alibaba: { models: { 'qwen3.5-plus': { id: 'qwen3.5-plus', released_at: '2026-02-16', status: 'active' } } } }),
    })

    await fetchMergedModels({
      localProviders: [{ id: 'aliyun', name: 'aliyun', baseUrl: '', models: [] }],
      providerMap: { aliyun: 'alibaba' },
      endpointUrl: 'https://models.dev/api.json',
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://models.dev/api.json',
      expect.objectContaining({ cache: 'no-cache' }),
    )
  })

  it('falls back to localStorage cache when fetch fails', async () => {
    globalThis.fetch.mockRejectedValue(new Error('network down'))
    localStorage.setItem('models.dev.cache.v1', JSON.stringify({
      at: Date.now(),
      data: { alibaba: { models: { 'qwen3.5-plus': { id: 'qwen3.5-plus', released_at: '2026-02-16', status: 'active' } } } },
    }))

    const merged = await fetchMergedModels({
      localProviders: [{ id: 'aliyun', name: 'aliyun', baseUrl: '', models: [] }],
      providerMap: { aliyun: 'alibaba' },
      endpointUrl: 'https://models.dev/api.json',
    })

    expect(merged[0].models[0].id).toBe('qwen3.5-plus')
    localStorage.removeItem('models.dev.cache.v1')
  })
})
