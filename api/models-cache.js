/**
 * Vercel Edge Function — proxies models.dev api.json with 24h cache.
 *
 * Rationale:
 * - models.dev updates every ~3 days. 24h s-maxage is a sweet spot between
 *   freshness and origin load.
 * - stale-while-revalidate=43200 (12h) lets the next request after expiry
 *   serve stale while fetching new data in the background.
 * - CF-specific cache directives piggyback on Vercel's edge network.
 */

export const runtime = 'edge'
export const config = { regions: ['hnd1', 'sin1'] }

const MODELS_DEV_API = 'https://models.dev/api.json'
const CACHE_HEADER = 'public, s-maxage=86400, stale-while-revalidate=43200'

export async function GET() {
  try {
    const upstream = await fetch(MODELS_DEV_API, {
      headers: { 'User-Agent': 'model-speed-tester' },
      cf: { cacheTtl: 86400, cacheEverything: true },
    })
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: 'upstream error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const body = await upstream.text()
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': CACHE_HEADER,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
