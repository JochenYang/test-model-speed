import { describe, it, expect, vi, beforeEach } from 'vitest'
import { probeNetwork, networkStatus } from '../networkProbe.js'

describe('probeNetwork', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn()
    localStorage.clear()
  })

  it('returns baseline with rtt and jitter from 3 successful probes', async () => {
    let n = 0
    globalThis.fetch.mockImplementation(async () => {
      n++
      await new Promise((r) => setTimeout(r, 10 * n))
      return { ok: true, status: 200 }
    })

    const r = await probeNetwork('https://example.com')
    expect(r).not.toBeNull()
    expect(r.rtt).toBeGreaterThan(0)
    expect(r.samples.length).toBe(3)
    expect(r.jitter).toBeGreaterThanOrEqual(0)
    expect(r.measuredAt).toBeTruthy()
  })

  it('returns null when all probes fail and no cache', async () => {
    globalThis.fetch.mockRejectedValue(new Error('net down'))
    const r = await probeNetwork('https://example.com')
    expect(r).toBeNull()
  })
})

describe('networkStatus', () => {
  it('classifies good when rtt < 100', () => {
    expect(networkStatus({ rtt: 50, jitter: 5, samples: [50], measuredAt: '' })).toBe('good')
  })
  it('classifies fair when 100 <= rtt < 300', () => {
    expect(networkStatus({ rtt: 150, jitter: 5, samples: [150], measuredAt: '' })).toBe('fair')
  })
  it('classifies poor when rtt >= 300', () => {
    expect(networkStatus({ rtt: 500, jitter: 5, samples: [500], measuredAt: '' })).toBe('poor')
  })
  it('classifies unknown when baseline is null', () => {
    expect(networkStatus(null)).toBe('unknown')
  })
})
