# 模型速度测试工具架构说明

## 1. 目标边界

- 产品目标：提供可重复、可比对的 LLM 速度测试结果。
- 当前策略：移除可变的高级参数输入，统一固定测速配置，减少“参数不同导致结果不可比”。
- 自定义模型目标：支持任意 OpenAI 兼容接口接入（自定义 URL、Path、Headers、Model）。

## 2. 固定测速配置

配置文件：`src/config/benchmark.js`

- `maxTokens: 2048`
- `timeoutMs: 120000`
- `runCount: 3`（计入统计）
- `warmupCount: 1`（不计入统计）
- `defaultEndpointPath: /chat/completions`

说明：
- 预热轮次用于降低冷启动影响。
- 最终统计只基于有效轮次（成功的测量轮次）。

## 3. 核心模块职责

### 3.1 UI 编排层

文件：`src/App.jsx`

- 管理全局状态（当前 provider/model、测试状态、历史记录）。
- 调度测试流程（预热 -> 测量 -> 聚合统计）。
- 处理错误与提示（包括“部分失败”场景）。
- 将聚合结果持久化到本地历史。

### 3.2 输入层（测试表单）

文件：`src/components/TestForm.jsx`

- 负责采集测试输入（provider/model/apiKey/prompt）。
- 自定义 provider 支持：
  - Base URL
  - Endpoint Path
  - Model
  - 自定义 Headers(JSON)
- 自动记忆并回填自定义 provider 配置。
- 不再暴露高级测速参数输入。

### 3.3 API 调用与指标计算层

文件：`src/services/api.js`

- 统一执行流式请求并解析 SSE。
- 指标输出：
  - `ttft`
  - `latency`
  - `throughput`
  - `effectiveTps`
  - `outputTokens`
- Token 计数策略：
  - 优先使用官方 `usage.completion_tokens`
  - 无官方 usage 时使用估算
- 输出 `tokenSource`（`official` / `estimated`）。

### 3.4 生产代理层

文件：`api/proxy.js`

- 生产环境代理转发请求，规避浏览器 CORS 问题。
- 支持自定义 endpoint path 与附加 headers。
- 对敏感/冲突 header 做基础过滤（如 Authorization、Content-Type）。

### 3.5 本地存储层

文件：`src/services/storage.js`

- 存储内容：
  - API Key（按 provider）
  - 语言偏好
  - 测试历史
  - 自定义 provider 配置
- 历史记录扩展字段：
  - `runCount/warmupCount`
  - `successRate/failedRuns`
  - `tokenSource`
  - P50/P95 指标

## 4. 统计口径

### 4.1 聚合规则

每个核心指标均计算：
- AVG
- P50
- P95
- Std Dev

覆盖指标：
- TTFT
- Latency
- Steady TPS
- Effective TPS

### 4.2 失败策略

- 测量轮中若部分失败，不直接整轮作废。
- 在至少 1 轮成功时，仍给出统计结果，并标注：
  - 成功率
  - 失败轮次数
  - “结果基于成功轮次”提示
- 若全部测量轮失败，则报错结束。

## 5. 关键调用链

1. 用户在 `TestForm` 点击开始测试
2. `App.handleTest` 执行预热与测量循环
3. `callLLMApi` 发起流式请求并计算单轮指标
4. `App` 聚合统计并更新 `TestResult`
5. `saveResult` 写入历史，`HistoryTable` 展示

## 6. 风险与后续建议

- 并发风险：当前是串行测量，稳定但耗时较长；若加并发需考虑限流与重试。
- 安全风险：API Key 仍是本地存储，建议后续增加“仅会话保存”模式。
- 可观测性：可进一步增加每轮原始日志导出，便于复盘异常波动。
