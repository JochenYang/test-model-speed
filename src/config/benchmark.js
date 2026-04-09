/**
 * Fixed benchmark configuration.
 * Advanced config is intentionally hidden from UI to keep tests comparable.
 */
export const BENCHMARK_CONFIG = {
  maxTokens: 2048,
  timeoutMs: 120000,
  runCount: 3,
  warmupCount: 1,
  defaultEndpointPath: '/chat/completions',
}

