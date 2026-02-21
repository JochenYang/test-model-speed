# Model Speed Tester - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web application to test and compare LLM API response latency and throughput across 5 domestic providers (Alibaba, Volcano Engine, Zhipu, Minimax, Kimi).

**Architecture:** Single-page React application with Vite, Tailwind CSS for styling, LocalStorage for history. All API calls from client-side, no backend required.

**Tech Stack:** React 18 + Vite, Tailwind CSS, Lucide React

---

## Task Overview

| Task | Description | Files |
|------|-------------|-------|
| 1 | Initialize Vite + React + Tailwind project | package.json, vite.config.js, tailwind.config.js, index.html |
| 2 | Create provider and model configuration | src/config/providers.js |
| 3 | Create API service for LLM calls | src/services/api.js |
| 4 | Create LocalStorage service for history | src/services/storage.js |
| 5 | Build main App component structure | src/App.jsx |
| 6 | Build TestForm component | src/components/TestForm.jsx |
| 7 | Build TestResult component | src/components/TestResult.jsx |
| 8 | Build HistoryTable component | src/components/HistoryTable.jsx |
| 9 | Build Header and layout components | src/components/Header.jsx |
| 10 | Integrate all components in App | src/App.jsx |
| 11 | Add responsive styling | src/index.css |
| 12 | Test and verify | Manual testing |

---

## Task 1: Initialize Vite + React + Tailwind Project

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/index.css`

**Step 1: Create package.json**

```json
{
  "name": "model-speed-tester",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^6.0.5"
  }
}
```

**Step 2: Create vite.config.js**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**Step 3: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 4: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**Step 5: Create index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Model Speed Tester</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Step 6: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-slate-50 text-slate-900;
}
```

**Step 7: Create src/main.jsx**

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**Step 8: Create src/App.jsx**

```javascript
function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <h1 className="text-3xl font-bold text-center py-8">
        Model Speed Tester
      </h1>
    </div>
  )
}

export default App
```

**Step 9: Install dependencies**

Run: `npm install`

Expected: Dependencies installed successfully

---

## Task 2: Create Provider and Model Configuration

**Files:**
- Create: `src/config/providers.js`

**Step 1: Write the configuration file**

```javascript
// Provider configuration with base URLs and models
export const providers = [
  {
    id: 'aliyun',
    name: '阿里百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen3.5-plus', name: 'qwen3.5-plus' },
      { id: 'qwen3-max', name: 'qwen3-max' },
    ],
  },
  {
    id: 'volcano',
    name: '火山引擎',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [
      { id: 'doubao-seed-2-0-pro-260215', name: 'doubao-seed-2-0-pro-260215' },
      { id: 'doubao-seed-2-0-lite-260215', name: 'doubao-seed-2-0-lite-260215' },
      { id: 'doubao-seed-2-0-code-preview-260215', name: 'doubao-seed-2-0-code-preview-260215' },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4.5', name: 'glm-4.5' },
      { id: 'glm-4.6', name: 'glm-4.6' },
      { id: 'glm-4.7', name: 'glm-4.7' },
      { id: 'glm-5', name: 'glm-5' },
    ],
  },
  {
    id: 'minimax',
    name: 'minimax',
    baseUrl: 'https://api.minimax.chat/v1',
    models: [
      { id: 'Minimax-M2', name: 'Minimax-M2' },
      { id: 'Minimax-M2.1', name: 'Minimax-M2.1' },
      { id: 'Minimax-m2.5', name: 'Minimax-m2.5' },
      { id: 'Minimax-M2.5-highspeed', name: 'Minimax-M2.5-highspeed' },
    ],
  },
  {
    id: 'kimi',
    name: 'kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'kimi-for-coding', name: 'kimi-for-coding' },
    ],
  },
]

export const defaultPrompt = '你好，请用一句话介绍你自己'
```

---

## Task 3: Create API Service for LLM Calls

**Files:**
- Create: `src/services/api.js`

**Step 1: Write the API service**

```javascript
/**
 * LLM API service for speed testing
 * Measures response time (TTFT), throughput, and output tokens
 */

/**
 * Call LLM API and measure performance
 * @param {string} baseUrl - Provider base URL
 * @param {string} apiKey - API key
 * @param {string} model - Model name
 * @param {string} prompt - User prompt
 * @returns {Promise<{latency: number, throughput: number, outputTokens: number}>}
 */
export async function callLLMApi(baseUrl, apiKey, model, prompt) {
  const url = `${baseUrl}/chat/completions`

  const startTime = performance.now()
  let firstTokenTime = null
  let totalTokens = 0

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'user', content: prompt }
      ],
      stream: false, // Disable streaming for accurate timing
    }),
  })

  const endTime = performance.now()

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  // Extract usage information
  const outputTokens = data.usage?.completion_tokens || 0
  const latency = endTime - startTime
  const throughput = outputTokens > 0 ? (outputTokens / (latency / 1000)) : 0

  return {
    latency: Math.round(latency),
    throughput: parseFloat(throughput.toFixed(2)),
    outputTokens,
  }
}
```

---

## Task 4: Create LocalStorage Service for History

**Files:**
- Create: `src/services/storage.js`

**Step 1: Write the storage service**

```javascript
/**
 * LocalStorage service for test history
 */

const STORAGE_KEY = 'model-speed-tester-history'

/**
 * Get all history records
 * @returns {Array}
 */
export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Failed to read history:', error)
    return []
  }
}

/**
 * Save a test result to history
 * @param {Object} result - Test result object
 */
export function saveResult(result) {
  try {
    const history = getHistory()
    const newRecord = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      provider: result.provider,
      model: result.model,
      latency: result.latency,
      throughput: result.throughput,
      outputTokens: result.outputTokens,
    }
    history.unshift(newRecord) // Add to beginning
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    return newRecord
  } catch (error) {
    console.error('Failed to save result:', error)
    throw new Error('Failed to save result. Storage may be full.')
  }
}

/**
 * Delete a single history record
 * @param {string} id - Record ID
 */
export function deleteRecord(id) {
  try {
    const history = getHistory()
    const filtered = history.filter(item => item.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to delete record:', error)
    throw new Error('Failed to delete record')
  }
}

/**
 * Clear all history
 */
export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear history:', error)
    throw new Error('Failed to clear history')
  }
}

/**
 * Export history as CSV
 * @returns {string}
 */
export function exportCSV() {
  const history = getHistory()
  const headers = ['Time', 'Provider', 'Model', 'Latency (ms)', 'Throughput (tokens/s)', 'Output Tokens']
  const rows = history.map(item => [
    new Date(item.timestamp).toLocaleString(),
    item.provider,
    item.model,
    item.latency,
    item.throughput,
    item.outputTokens,
  ])

  return [headers, ...rows].map(row => row.join(',')).join('\n')
}

/**
 * Export history as JSON
 * @returns {string}
 */
export function exportJSON() {
  const history = getHistory()
  return JSON.stringify(history, null, 2)
}
```

---

## Task 5: Build Main App Component Structure

**Files:**
- Modify: `src/App.jsx`

**Step 1: Update App.jsx with component structure**

```javascript
import { useState, useEffect } from 'react'
import { providers, defaultPrompt } from './config/providers'
import { callLLMApi } from './services/api'
import { getHistory, saveResult, deleteRecord, clearHistory, exportCSV, exportJSON } from './services/storage'
import Header from './components/Header'
import TestForm from './components/TestForm'
import TestResult from './components/TestResult'
import HistoryTable from './components/HistoryTable'

function App() {
  const [selectedProvider, setSelectedProvider] = useState(providers[0])
  const [selectedModel, setSelectedModel] = useState(providers[0].models[0])
  const [apiKey, setApiKey] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [testStatus, setTestStatus] = useState('ready') // ready, testing, success, error
  const [testResult, setTestResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [history, setHistory] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory())
  }, [])

  // Handle provider change
  const handleProviderChange = (provider) => {
    setSelectedProvider(provider)
    setSelectedModel(provider.models[0])
  }

  // Handle test execution
  const handleTest = async () => {
    if (!apiKey.trim()) {
      setErrorMessage('请输入 API Key')
      setTestStatus('error')
      return
    }

    setTestStatus('testing')
    setErrorMessage('')
    setTestResult(null)

    const prompt = customPrompt.trim() || defaultPrompt

    try {
      const result = await callLLMApi(
        selectedProvider.baseUrl,
        apiKey,
        selectedModel.id,
        prompt
      )

      const fullResult = {
        ...result,
        provider: selectedProvider.name,
        model: selectedModel.id,
      }

      // Save to history
      const savedRecord = saveResult(fullResult)
      setHistory(getHistory())
      setTestResult(fullResult)
      setTestStatus('success')
    } catch (error) {
      setErrorMessage(error.message || '测试失败，请重试')
      setTestStatus('error')
    }
  }

  // Handle delete record
  const handleDeleteRecord = (id) => {
    deleteRecord(id)
    setHistory(getHistory())
  }

  // Handle clear all
  const handleClearAll = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      clearHistory()
      setHistory([])
    }
  }

  // Handle export
  const handleExport = (type) => {
    const data = type === 'csv' ? exportCSV() : exportJSON()
    const blob = new Blob([data], { type: type === 'csv' ? 'text/csv' : 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-history.${type}`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter history
  const filteredHistory = history.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return item.provider.toLowerCase().includes(query) ||
           item.model.toLowerCase().includes(query)
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pb-8">
        <TestForm
          providers={providers}
          selectedProvider={selectedProvider}
          onProviderChange={handleProviderChange}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          customPrompt={customPrompt}
          onCustomPromptChange={setCustomPrompt}
          onTest={handleTest}
          testStatus={testStatus}
        />

        <TestResult
          status={testStatus}
          result={testResult}
          error={errorMessage}
        />

        <HistoryTable
          history={filteredHistory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onDelete={handleDeleteRecord}
          onClearAll={handleClearAll}
          onExport={handleExport}
        />
      </main>
    </div>
  )
}

export default App
```

---

## Task 6: Build TestForm Component

**Files:**
- Create: `src/components/TestForm.jsx`

**Step 1: Write TestForm component**

```javascript
import { useState } from 'react'
import { Eye, EyeOff, Play, Loader2 } from 'lucide-react'

export default function TestForm({
  providers,
  selectedProvider,
  onProviderChange,
  selectedModel,
  onModelChange,
  apiKey,
  onApiKeyChange,
  customPrompt,
  onCustomPromptChange,
  onTest,
  testStatus,
}) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [customModelInput, setCustomModelInput] = useState('')
  const [useCustomModel, setUseCustomModel] = useState(false)

  const isTesting = testStatus === 'testing'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">测试配置</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Provider Select */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            提供商
          </label>
          <select
            value={selectedProvider.id}
            onChange={(e) => {
              const provider = providers.find(p => p.id === e.target.value)
              onProviderChange(provider)
              setUseCustomModel(false)
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isTesting}
          >
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        {/* Model Select */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            模型
          </label>
          {useCustomModel ? (
            <input
              type="text"
              value={customModelInput}
              onChange={(e) => setCustomModelInput(e.target.value)}
              placeholder="输入自定义模型名称"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isTesting}
            />
          ) : (
            <select
              value={selectedModel.id}
              onChange={(e) => onModelChange({ id: e.target.value, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isTesting}
            >
              {selectedProvider.models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => {
              setUseCustomModel(!useCustomModel)
              if (!useCustomModel) {
                setCustomModelInput(selectedModel.id)
              }
            }}
            className="text-sm text-blue-600 hover:text-blue-700 mt-1"
            disabled={isTesting}
          >
            {useCustomModel ? '使用预设模型' : '使用自定义模型'}
          </button>
        </div>
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          API Key
        </label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="输入 API Key"
            className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isTesting}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            disabled={isTesting}
          >
            {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Custom Prompt */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          自定义 Prompt <span className="text-slate-400 font-normal">(可选)</span>
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="留空使用默认问题：你好，请用一句话介绍你自己"
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          disabled={isTesting}
        />
      </div>

      {/* Test Button */}
      <button
        onClick={onTest}
        disabled={isTesting || !apiKey.trim()}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
      >
        {isTesting ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            测试中...
          </>
        ) : (
          <>
            <Play size={20} />
            开始测试
          </>
        )}
      </button>
    </div>
  )
}
```

---

## Task 7: Build TestResult Component

**Files:**
- Create: `src/components/TestResult.jsx`

**Step 1: Write TestResult component**

```javascript
import { Clock, Zap, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function TestResult({ status, result, error }) {
  if (status === 'ready') {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">测试结果</h2>

      {status === 'testing' && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-blue-600 mr-2" size={24} />
          <span className="text-slate-600">正在测试...</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-red-700">测试失败</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {status === 'success' && result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <Clock className="text-blue-500" size={24} />
            <div>
              <p className="text-sm text-slate-500">响应时间</p>
              <p className="text-2xl font-bold text-slate-900">{result.latency} <span className="text-sm font-normal">ms</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <Zap className="text-amber-500" size={24} />
            <div>
              <p className="text-sm text-slate-500">吞吐量</p>
              <p className="text-2xl font-bold text-slate-900">{result.throughput} <span className="text-sm font-normal">tokens/s</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <FileText className="text-green-500" size={24} />
            <div>
              <p className="text-sm text-slate-500">输出 Tokens</p>
              <p className="text-2xl font-bold text-slate-900">{result.outputTokens}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Task 8: Build HistoryTable Component

**Files:**
- Create: `src/components/HistoryTable.jsx`

**Step 1: Write HistoryTable component**

```javascript
import { Search, Download, Trash2, FileJson, Table, Trash } from 'lucide-react'

export default function HistoryTable({
  history,
  searchQuery,
  onSearchChange,
  onDelete,
  onClearAll,
  onExport,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold">测试历史</h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索提供商或模型"
              className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Export Buttons */}
          <button
            onClick={() => onExport('csv')}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Table size={16} />
            CSV
          </button>
          <button
            onClick={() => onExport('json')}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileJson size={16} />
            JSON
          </button>
          <button
            onClick={onClearAll}
            disabled={history.length === 0}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash size={16} />
            清空
          </button>
        </div>
      </div>

      {/* History Table */}
      {history.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          暂无测试记录
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">时间</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">提供商</th>
                <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">模型</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">耗时</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">吞吐量</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Tokens</th>
                <th className="text-center py-3 px-2 text-sm font-medium text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-2 text-sm text-slate-600">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-2 text-sm text-slate-900">{item.provider}</td>
                  <td className="py-3 px-2 text-sm text-slate-600 font-mono">{item.model}</td>
                  <td className="py-3 px-2 text-sm text-slate-900 text-right">{item.latency} ms</td>
                  <td className="py-3 px-2 text-sm text-slate-900 text-right">{item.throughput}</td>
                  <td className="py-3 px-2 text-sm text-slate-900 text-right">{item.outputTokens}</td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

---

## Task 9: Build Header Component

**Files:**
- Create: `src/components/Header.jsx`

**Step 1: Write Header component**

```javascript
import { Gauge } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Gauge className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Model Speed Tester</h1>
            <p className="text-xs text-slate-500">LLM API 速度测试工具</p>
          </div>
        </div>
      </div>
    </header>
  )
}
```

---

## Task 10: Verify and Test

**Step 1: Build the project**

Run: `npm run build`

Expected: Build completes without errors

**Step 2: Start dev server**

Run: `npm run dev`

Expected: Dev server starts, open browser to test

**Step 3: Manual testing checklist**

- [ ] Select provider from dropdown, model updates
- [ ] Enter API key, toggle visibility works
- [ ] Custom prompt field works
- [ ] Click test button shows loading state
- [ ] After test, results display correctly
- [ ] Results saved to history
- [ ] Search filters history
- [ ] Delete single record works
- [ ] Clear all works
- [ ] Export CSV/JSON works
- [ ] Error states display properly

---

## Execution Notes

1. Run each task sequentially
2. Test after each task completion
3. Use meaningful commit messages
4. Keep all components in src/components/
5. Services in src/services/
6. Config in src/config/
