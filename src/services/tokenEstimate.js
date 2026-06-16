import { encode } from 'gpt-tokenizer'

/**
 * Estimate token count using gpt-tokenizer (cl100k_base).
 * Falls back to character-based estimation on import failure.
 * @param {string} text
 * @returns {{tokens:number, source:'tokenizer'|'estimated'}}
 */
export function estimateTokensWithSource(text) {
  if (!text || text.length === 0) return { tokens: 0, source: 'tokenizer' }
  try {
    const tokens = encode(text).length
    return { tokens, source: 'tokenizer' }
  } catch (err) {
    return { tokens: fallbackEstimate(text), source: 'estimated' }
  }
}

/**
 * Backward-compatible wrapper that returns just the count.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  return estimateTokensWithSource(text).tokens
}

function fallbackEstimate(text) {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]+/g) || []).join('').length
  const textWithoutChinese = text.replace(/[\u4e00-\u9fa5]/g, '')
  const englishWords = textWithoutChinese.split(/\s+/).filter((w) => w.length > 0)
  const punctuationCount = (text.match(/[\p{P}]/gu) || []).length
  return Math.max(1, Math.ceil(
    chineseChars * 0.55 +
    englishWords.length * 1.3 +
    punctuationCount * 0.3,
  ))
}
