import { useState, useEffect } from 'react'
import { providers, defaultPrompt } from './config/providers'
import { BENCHMARK_CONFIG } from './config/benchmark'
import { callLLMApi } from './services/api'
import { getHistory, saveResult, deleteRecord, clearHistory, exportCSV, exportJSON, getLanguage, saveLanguage } from './services/storage'
import Header from './components/Header'
import Footer from './components/Footer'
import TestForm from './components/TestForm'
import TestResult from './components/TestResult'
import HistoryTable from './components/HistoryTable'
import { ToastProvider, useToast, triggerToast } from './components/Toast'
import { getProviderName } from './config/i18n'

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function percentile(values, p) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.ceil((p / 100) * sorted.length) - 1
  const index = Math.min(sorted.length - 1, Math.max(0, rank))
  return sorted[index]
}

function stdDev(values) {
  if (values.length < 2) return 0
  const avg = average(values)
  const variance = average(values.map(v => (v - avg) ** 2))
  return Math.sqrt(variance)
}

function buildMetricStats(results, key) {
  const values = results.map(item => Number(item[key] || 0))
  return {
    avg: average(values),
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    std: stdDev(values),
  }
}

function parseCustomHeaders(headersText) {
  if (!headersText || !headersText.trim()) return {}

  let parsed
  try {
    parsed = JSON.parse(headersText)
  } catch {
    throw new Error('INVALID_CUSTOM_HEADERS')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('INVALID_CUSTOM_HEADERS')
  }

  const sanitized = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (!String(key || '').trim()) continue
    sanitized[String(key).trim()] = String(value ?? '')
  }
  return sanitized
}

function summarizeTokenSource(results) {
  const sources = new Set(results.map(item => item.tokenSource))
  if (sources.size === 1) {
    return sources.has('official') ? 'official' : 'estimated'
  }
  return 'mixed'
}

function AppContent() {
  const [selectedProvider, setSelectedProvider] = useState(providers[0])
  const [selectedModel, setSelectedModel] = useState(providers[0].models[0])
  const [apiKey, setApiKey] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [testStatus, setTestStatus] = useState('ready')
  const [testResult, setTestResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [history, setHistory] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [language, setLanguage] = useState('zh')
  const [intermediateResults, setIntermediateResults] = useState([])
  const [currentRun, setCurrentRun] = useState(0)
  const [currentPhase, setCurrentPhase] = useState('warmup')

  const { showConfirm } = useToast()

  // Load saved data on mount
  useEffect(() => {
    setHistory(getHistory())

    // Load saved language
    const savedLanguage = getLanguage()
    setLanguage(savedLanguage)
  }, [])

  // Handle language change
  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    saveLanguage(lang)
  }

  // Handle provider change
  const handleProviderChange = (provider) => {
    setSelectedProvider(provider)
    setSelectedModel(provider.models[0] || { id: '', name: '' })
  }

  // Handle test execution
  const handleTest = async ({
    customUrl,
    customModel,
    useCustomModel,
    customPath,
    customHeaders,
  }) => {
    if (!apiKey.trim()) {
      setErrorMessage(language === 'zh' ? '请输入 API Key' : 'Please enter API Key')
      setTestStatus('error')
      triggerToast('error',
        language === 'zh' ? '错误' : 'Error',
        language === 'zh' ? '请输入 API Key' : 'Please enter API Key'
      )
      return
    }

    // Check custom provider requirements
    const isCustomProvider = selectedProvider.id === 'custom'
    if (isCustomProvider && (!customUrl?.trim() || !customModel?.trim())) {
      setErrorMessage(
        language === 'zh' ? '请输入 API 地址和模型名称' : 'Please enter API URL and Model name'
      )
      setTestStatus('error')
      triggerToast('error',
        language === 'zh' ? '错误' : 'Error',
        language === 'zh' ? '请输入 API 地址和模型名称' : 'Please enter API URL and Model name'
      )
      return
    }

    setTestStatus('testing')
    setErrorMessage('')
    setTestResult(null)
    setIntermediateResults([])
    setCurrentRun(0)
    setCurrentPhase('warmup')

    const prompt = customPrompt.trim() || defaultPrompt

    // Use custom URL and model if custom provider selected
    const baseUrl = isCustomProvider ? customUrl.trim() : selectedProvider.baseUrl
    const modelId = (isCustomProvider || useCustomModel)
      ? (customModel?.trim() || selectedModel.id)
      : selectedModel.id
    const endpointPath = isCustomProvider
      ? (customPath?.trim() || BENCHMARK_CONFIG.defaultEndpointPath)
      : BENCHMARK_CONFIG.defaultEndpointPath

    const providerName = isCustomProvider
      ? getProviderName('custom', language)
      : getProviderName(selectedProvider.id, language)

    const measuredResults = []
    const runFailures = []
    const measuredRunCount = BENCHMARK_CONFIG.runCount
    const warmupRunCount = BENCHMARK_CONFIG.warmupCount
    const totalRuns = measuredRunCount + warmupRunCount
    let parsedHeaders = {}

    try {
      parsedHeaders = isCustomProvider ? parseCustomHeaders(customHeaders || '') : {}
    } catch {
      const headerError = language === 'zh'
        ? '自定义请求头必须是有效 JSON 对象'
        : 'Custom headers must be a valid JSON object'
      setErrorMessage(headerError)
      setTestStatus('error')
      triggerToast('error', language === 'zh' ? '配置错误' : 'Invalid Config', headerError)
      return
    }

    try {
      for (let i = 0; i < totalRuns; i++) {
        const isWarmupRun = i < warmupRunCount
        setCurrentPhase(isWarmupRun ? 'warmup' : 'measure')
        setCurrentRun(i + 1)

        try {
          const result = await callLLMApi(baseUrl, apiKey, modelId, prompt, {
            maxTokens: BENCHMARK_CONFIG.maxTokens,
            timeout: BENCHMARK_CONFIG.timeoutMs,
            endpointPath,
            extraHeaders: parsedHeaders,
          })

          if (isWarmupRun) {
            continue
          }

          const fullResult = {
            ...result,
            provider: providerName,
            model: modelId,
          }

          measuredResults.push(fullResult)
          setIntermediateResults([...measuredResults])

          // Show latest measured run while executing
          setTestResult(fullResult)
        } catch (error) {
          runFailures.push({
            run: i + 1,
            isWarmup: isWarmupRun,
            message: error.message || 'Unknown error',
          })
        }
      }

      if (measuredResults.length === 0) {
        const measuredFailure = runFailures.find(item => !item.isWarmup)
        throw new Error(measuredFailure?.message || (language === 'zh' ? '测试失败，请重试' : 'Test failed, please try again'))
      }

      const ttftStats = buildMetricStats(measuredResults, 'ttft')
      const latencyStats = buildMetricStats(measuredResults, 'latency')
      const throughputStats = buildMetricStats(measuredResults, 'throughput')
      const effectiveTpsStats = buildMetricStats(measuredResults, 'effectiveTps')
      const outputTokensStats = buildMetricStats(measuredResults, 'outputTokens')

      const failedMeasuredRuns = measuredRunCount - measuredResults.length
      const avgResult = {
        ttft: Math.round(ttftStats.avg),
        latency: Math.round(latencyStats.avg),
        throughput: parseFloat(throughputStats.avg.toFixed(2)),
        effectiveTps: parseFloat(effectiveTpsStats.avg.toFixed(2)),
        outputTokens: Math.round(outputTokensStats.avg),
        ttftP50: Math.round(ttftStats.p50),
        ttftP95: Math.round(ttftStats.p95),
        ttftStd: parseFloat(ttftStats.std.toFixed(2)),
        latencyP50: Math.round(latencyStats.p50),
        latencyP95: Math.round(latencyStats.p95),
        latencyStd: parseFloat(latencyStats.std.toFixed(2)),
        throughputP50: parseFloat(throughputStats.p50.toFixed(2)),
        throughputP95: parseFloat(throughputStats.p95.toFixed(2)),
        throughputStd: parseFloat(throughputStats.std.toFixed(2)),
        effectiveTpsP50: parseFloat(effectiveTpsStats.p50.toFixed(2)),
        effectiveTpsP95: parseFloat(effectiveTpsStats.p95.toFixed(2)),
        effectiveTpsStd: parseFloat(effectiveTpsStats.std.toFixed(2)),
        provider: providerName,
        model: modelId,
        runCount: measuredRunCount,
        warmupCount: warmupRunCount,
        successRuns: measuredResults.length,
        failedRuns: failedMeasuredRuns,
        successRate: parseFloat(((measuredResults.length / measuredRunCount) * 100).toFixed(2)),
        tokenSource: summarizeTokenSource(measuredResults),
        endpointPath,
        failures: runFailures.filter(item => !item.isWarmup),
        isAverage: true,
      }

      // Save average result to history
      saveResult(avgResult)
      setHistory(getHistory())
      setTestResult(avgResult)
      setTestStatus('success')
      setCurrentPhase('measure')
      setCurrentRun(totalRuns)

      if (failedMeasuredRuns > 0) {
        triggerToast(
          'error',
          language === 'zh' ? '测试完成（部分失败）' : 'Completed (partial failures)',
          `${providerName} - ${modelId} (${measuredResults.length}/${measuredRunCount})`
        )
      } else {
        triggerToast(
          'success',
          language === 'zh' ? '测试完成！' : 'Test completed!',
          `${providerName} - ${modelId} (${language === 'zh' ? `平均 ${measuredRunCount} 次` : `avg of ${measuredRunCount}`})`
        )
      }
    } catch (error) {
      const errorMsg = error.message || (language === 'zh' ? '测试失败，请重试' : 'Test failed, please try again')
      setErrorMessage(errorMsg)
      setTestStatus('error')
      triggerToast('error',
        language === 'zh' ? '测试失败' : 'Test Failed',
        errorMsg
      )
    }
  }

  // Handle delete record
  const handleDeleteRecord = (id) => {
    deleteRecord(id)
    setHistory(getHistory())
    triggerToast('success',
      language === 'zh' ? '记录已删除' : 'Record deleted'
    )
  }

  // Handle clear all
  const handleClearAll = async () => {
    const confirmed = await showConfirm({
      title: language === 'zh' ? '确认清空' : 'Confirm Clear',
      message: language === 'zh'
        ? '确定要清空所有历史记录吗？此操作无法撤销。'
        : 'Are you sure you want to clear all history? This action cannot be undone.',
      confirmText: language === 'zh' ? '清空' : 'Clear',
      cancelText: language === 'zh' ? '取消' : 'Cancel',
    })

    if (confirmed) {
      clearHistory()
      setHistory([])
      triggerToast('success',
        language === 'zh' ? '历史记录已清空' : 'History cleared'
      )
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

    triggerToast('success',
      language === 'zh' ? '导出成功' : 'Export Successful',
      `test-history.${type}`
    )
  }

  // Filter history
  const filteredHistory = history.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return String(item.provider || '').toLowerCase().includes(query) || String(item.model || '').toLowerCase().includes(query)
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <Header language={language} onLanguageChange={handleLanguageChange} />

      <main className="max-w-6xl mx-auto px-4 py-8 pb-8">
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
          language={language}
        />

        <TestResult
          status={testStatus}
          result={testResult}
          error={errorMessage}
          language={language}
          intermediateResults={intermediateResults}
          currentRun={currentRun}
          runCount={BENCHMARK_CONFIG.runCount}
          warmupCount={BENCHMARK_CONFIG.warmupCount}
          totalRuns={BENCHMARK_CONFIG.warmupCount + BENCHMARK_CONFIG.runCount}
          currentPhase={currentPhase}
        />

        <HistoryTable
          history={filteredHistory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onDelete={handleDeleteRecord}
          onClearAll={handleClearAll}
          onExport={handleExport}
          language={language}
        />
      </main>

      <Footer />
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
