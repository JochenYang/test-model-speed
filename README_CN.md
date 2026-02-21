# 模型速度测试工具

LLM API 速度测试工具 - 支持国内主流模型提供商

![演示图](public/image/test.png)

## 功能特性

- **多语言支持**：中文/英文 UI，随时切换
- **多提供商支持**：阿里百炼 (DashScope)、火山引擎 (Volcengine)、智谱 AI、MiniMax、Kimi
- **API Key 分提供商存储**：每个提供商的 API Key 独立保存
- **精确指标**：TTFT（首 Token 延迟）、稳定吞吐，有效吞吐
- **历史记录**：LocalStorage 持久化，支持搜索/筛选
- **数据导出**：支持 CSV/JSON 导出
- **现代 UI**：基于 shadcn/ui 组件库构建

## 指标说明

| 指标 | 说明 |
|------|------|
| TTFT | 首 Token 延迟 - 从请求到第一个 Token 的时间 |
| 总耗时 | 完整响应时间，从请求到最后一个 Token |
| 稳定吞吐 | 纯生成速度，不含首 Token (tokens/s) |
| 有效吞吐 | 用户感知速度，含首 Token (tokens/s) |

## 支持的提供商和模型

| 提供商 | 模型 |
|--------|------|
| 阿里百炼 (DashScope) | qwen3.5-plus, qwen3-max |
| 火山引擎 (Volcengine) | doubao-seed-2-0-pro, doubao-seed-2-0-lite, doubao-seed-2-0-code |
| 智谱 AI | glm-4.5, glm-4.6, glm-4.7, glm-5 |
| MiniMax | Minimax-M2, M2.1, M2.5, M2.5-highspeed |
| Kimi | kimi-for-coding |
| 自定义 | 任意 OpenAI 兼容 API |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

在浏览器中打开 http://localhost:5173

```bash
# 构建生产版本
npm run build
```

构建产物在 `dist` 目录。

## 使用方法

1. 选择提供商（选择"自定义"使用自己的 API）
2. 选择模型（或输入自定义模型名）
3. 输入 API Key（可选择本地保存）
4. 可选：输入自定义测试提示词
5. 点击"开始测试"
6. 查看测试结果和历史记录

## 技术栈

- React 18 + Vite
- Tailwind CSS
- shadcn/ui (Radix UI)
- Sonner (Toast 通知)
- Lucide React

## 许可证

MIT
