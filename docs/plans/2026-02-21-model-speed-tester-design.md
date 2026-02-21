# Model Speed Tester - Design Document

## 1. Project Overview

**Project Name**: Model Speed Tester
**Type**: Web Application (Single Page)
**Core Functionality**: A tool to test and compare response latency and throughput of various domestic LLM providers (Alibaba, Volcano Engine, Zhipu, Minimax, Kimi).
**Target Users**: Developers and businesses who need to evaluate and compare LLM API performance.

---

## 2. UI/UX Design

### 2.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      Header                                 │
│            "Model Speed Tester" + Version                   │
├─────────────────────────────────────────────────────────────┤
│                    Test Configuration                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │  Provider   │ │    Model    │ │    API Key          │  │
│  │  [Dropdown] │ │  [Dropdown] │ │  [Password Input]   │  │
│  └─────────────┘ └─────────────┘ └─────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Custom Prompt (Optional)                          │    │
│  │  [Textarea - leave empty to use default]           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                    [ Start Test ] Button                    │
├─────────────────────────────────────────────────────────────┤
│                    Test Results                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Status: Ready / Testing / Completed / Error        │    │
│  │  Response Time: XXXX ms                            │    │
│  │  Throughput: X.XX tokens/s                         │    │
│  │  Output Tokens: XXX                                 │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                    Test History                             │
│  [Export CSV] [Export JSON] [Clear All] [Search: ____]   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Time      │ Provider │ Model        │ Latency │ T/s   │ │
│  │───────────┼──────────┼──────────────┼─────────┼───────│ │
│  │ 2026-...  │ 阿里百炼 │ qwen3.5-plus │ 1234ms │ 45.67 │ │
│  │ ...       │ ...      │ ...          │ ...    │ ...   │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Responsive Breakpoints

- **Mobile**: < 640px (single column, stacked layout)
- **Tablet**: 640px - 1024px (two columns)
- **Desktop**: > 1024px (full layout)

### 2.3 Visual Design

- **Color Palette**:
  - Primary: `#3B82F6` (blue)
  - Secondary: `#64748B` (slate)
  - Success: `#22C55E` (green)
  - Error: `#EF4444` (red)
  - Background: `#F8FAFC` (light) / `#1E293B` (dark)
  - Card Background: `#FFFFFF` (light) / `#334155` (dark)

- **Typography**:
  - Font Family: System UI / Inter
  - Headings: 24px (h1), 20px (h2), 16px (h3)
  - Body: 14px
  - Monospace (for results): JetBrains Mono / monospace

- **Spacing**: 4px, 8px, 12px, 16px, 24px, 32px scale

- **Effects**:
  - Card shadow: `0 1px 3px rgba(0,0,0,0.1)`
  - Hover transitions: 150ms ease
  - Loading spinner during test

### 2.4 Components

| Component | States | Behavior |
|-----------|--------|----------|
| Provider Select | default, hover, focus, disabled | Change triggers model list update |
| Model Select | default, hover, focus, disabled, loading | Filtered by selected provider |
| API Key Input | default, focus, filled, error | Password type with toggle visibility |
| Prompt Textarea | default, focus, filled | Optional, shows placeholder hint |
| Start Button | default, hover, active, disabled, loading | Disabled during test |
| Result Card | ready, testing, success, error | Animated progress during test |
| History Table | default, empty | Sortable by time, searchable |
| Export Buttons | default, hover, active | Downloads file immediately |

---

## 3. Functionality Specification

### 3.1 Core Features

1. **Provider Selection**
   - Dropdown with 5 providers: 阿里百炼, 火山引擎, 智谱, minimax, kimi
   - Each provider has pre-configured base URL

2. **Model Selection**
   - Dropdown populated based on selected provider
   - Also supports manual input for custom models
   - Pre-configured models:

   | Provider | Models |
   |----------|--------|
   | 阿里百炼 | qwen3.5-plus, qwen3-max |
   | 火山引擎 | doubao-seed-2-0-pro-260215, doubao-seed-2-0-lite-260215, doubao-seed-2-0-code-preview-260215 |
   | 智谱 | glm-4.5, glm-4.6, glm-4.7, glm-5 |
   | minimax | Minimax-M2, Minimax-M2.1, Minimax-m2.5, Minimax-M2.5-highspeed |
   | kimi | kimi-for-coding |

3. **API Key Input**
   - Password input field
   - Toggle visibility button
   - Validation: non-empty, starts with expected prefix (provider-specific)

4. **Custom Prompt**
   - Optional textarea
   - Default prompt if empty: "你好，请用一句话介绍你自己"

5. **Speed Test Execution**
   - Uses OpenAI Compatible API format (`/v1/chat/completions`)
   - Measures:
     - **Response Time**: Time to first token (TTFT) in milliseconds
     - **Throughput**: Output tokens per second
     - **Output Tokens**: Total tokens generated
   - Streaming disabled for accurate timing

6. **Test History**
   - Stored in LocalStorage
   - Fields: timestamp, provider, model, latency (ms), throughput (tokens/s), outputTokens
   - Search/filter by provider or model
   - Delete individual records or clear all

7. **Export**
   - CSV export: All history records
   - JSON export: All history records with full metadata

### 3.2 API Configuration

| Provider | Base URL | Auth Header |
|----------|----------|-------------|
| 阿里百炼 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `Authorization: Bearer <key>` |
| 火山引擎 | `https://ark.cn-beijing.volces.com/api/v3` | `Authorization: Bearer <key>` |
| 智谱 | `https://open.bigmodel.cn/api/paas/v4` | `Authorization: Bearer <key>` |
| minimax | `https://api.minimax.chat/v1` | `Authorization: Bearer <key>` |
| kimi | `https://api.moonshot.cn/v1` | `Authorization: Bearer <key>` |

### 3.3 Data Flow

```
User Input → Validate → Build Request → Call API → Measure Timing → Parse Response → Save to History → Display Results
```

### 3.4 Edge Cases

- **Invalid API Key**: Show error message, don't save to history
- **Network Timeout**: 30 second timeout, show error
- **Rate Limiting**: Detect 429, show "Rate limited, try again later"
- **Empty Response**: Handle gracefully, show 0 tokens
- **LocalStorage Full**: Warn user, offer to clear old records

---

## 4. Technical Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State**: React hooks (useState, useEffect)
- **Storage**: LocalStorage
- **Deployment**: Static (GitHub Pages)

---

## 5. Acceptance Criteria

- [ ] User can select provider from dropdown
- [ ] User can select model from filtered list
- [ ] User can enter API key (masked by default)
- [ ] User can optionally enter custom prompt
- [ ] Test button triggers API call and shows loading state
- [ ] Results display latency (ms) and throughput (tokens/s)
- [ ] Results are saved to LocalStorage automatically
- [ ] History table shows all past tests
- [ ] User can search/filter history
- [ ] User can delete individual or all history records
- [ ] User can export history as CSV or JSON
- [ ] Error states are handled gracefully with user-friendly messages
- [ ] UI is responsive on mobile, tablet, and desktop
