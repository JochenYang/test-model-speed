import { describe, it, expect } from 'vitest'
import { estimateTokensWithSource } from '../tokenEstimate.js'

describe('estimateTokensWithSource', () => {
  it('returns 0 for empty string', () => {
    const r = estimateTokensWithSource('')
    expect(r.tokens).toBe(0)
  })

  it('estimates Chinese text within ±15% of cl100k_base', () => {
    const text = '人工智能正在改变世界，它带来了前所未有的机遇与挑战。'
    const r = estimateTokensWithSource(text)
    expect(r.source).toBe('tokenizer')
    expect(r.tokens).toBeGreaterThan(10)
    expect(r.tokens).toBeLessThan(40)
  })

  it('estimates English text within reasonable range', () => {
    const text = 'The quick brown fox jumps over the lazy dog. ' +
      'Pack my box with five dozen liquor jugs.'
    const r = estimateTokensWithSource(text)
    expect(r.source).toBe('tokenizer')
    expect(r.tokens).toBeGreaterThan(15)
    expect(r.tokens).toBeLessThan(40)
  })
})
