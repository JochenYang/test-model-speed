<div align="center">

**LLM API Speed Testing Tool**
Supports Major Domestic Model Providers

![Demo](public/image/test.png)

[English](README.md) | [中文](README_CN.md)

</div>

---

## Features

- **Multi-language Support**: Chinese and English UI, switchable anytime
- **Multi-provider Support**: DashScope (Alibaba), Volcengine, Zhipu AI, Minimax (Domestic/Intl), Kimi
- **Per-provider API Key Storage**: Each provider's API key is saved separately
- **Accurate Metrics**: TTFT (Time To First Token), Steady TPS, Effective TPS
- **History**: LocalStorage persistence, supports search/filter
- **Export**: CSV/JSON export support
- **Modern UI**: Built with shadcn/ui components

## Metrics Explained

| Metric        | Description                                               |
| ------------- | --------------------------------------------------------- |
| TTFT          | Time To First Token - latency from request to first token |
| Total Time    | Complete response time from request to final token        |
| Steady TPS    | Pure generation speed excluding first token (tokens/s)    |
| Effective TPS | User-perceived speed including first token (tokens/s)     |

## Supported Providers

| Provider            | Models                                                            |
| ------------------- | ----------------------------------------------------------------- |
| DashScope (Alibaba) | Sourced from [models.dev](https://models.dev/alibaba), auto-updated |
| Volcengine          | Sourced from [models.dev](https://models.dev/volcengine), auto-updated |
| Zhipu AI            | Sourced from [models.dev](https://models.dev/zhipuai), auto-updated |
| Minimax (Domestic)  | Sourced from [models.dev](https://models.dev/minimax), auto-updated |
| Minimax (Intl)      | Sourced from [models.dev](https://models.dev/minimax), auto-updated |
| Kimi                | Sourced from [models.dev](https://models.dev/moonshotai), auto-updated |
| Custom              | Any OpenAI-compatible API                                         |

## Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev
```

Open http://localhost:5173 in your browser.

```bash
# Build for production
npm run build
```

Build output is in the `dist` directory.

## Usage

1. Select a provider (or "Custom" for your own API)
2. Select a model (or enter custom model name)
3. Enter your API Key (can be saved locally)
4. Optionally: Enter custom test prompt
5. Click "Start Test"
6. View test results and history

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- shadcn/ui (Radix UI)
- Sonner (Toast notifications)
- Lucide React

## Implementation Principles (v2)

1. **Multi-round Measurement**: Each test runs 1 warmup + 3 measured rounds by default; outputs AVG / P50 / P95 / StdDev for every metric.
2. **Strict TTFT Semantics**: `ttfb` (network only) and `ttft` (model only) are reported as separate fields.
3. **Token Accuracy**: Official `usage` → gpt-tokenizer (cl100k_base) → character-based fallback. `tokenSource` is always reported.
4. **Network Baseline**: 3 OPTIONS probes run before measurement; P50 RTT + jitter surface a `good / fair / poor / unknown` badge in the UI.
5. **Model Data Source**: [models.dev](https://models.dev) feeds the model list, with 24h edge cache + 6h client cache + built-in fallback.

## Implementation Principles (legacy v1)

1. **TTFT Measurement**: Uses streaming response (SSE), recording the time from request start to the first valid content chunk.
2. **Metric Calculation**: Uses a single streaming request with `stream_options: { include_usage: true }`.
   - If the API supports `usage` information (e.g., Alibaba, Volcengine, Minimax), official token counts are used.
   - If not supported, an intelligent estimation based on character count is applied.
3. **API Compatibility**: Based on the standard OpenAI `/v1/chat/completions` specification to ensure broad compatibility.

## License

MIT License - see [LICENSE](LICENSE) file for details.
