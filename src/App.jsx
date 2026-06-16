import { useState, useEffect } from 'react'
import { providers as staticProviders, defaultPrompt } from './config/providers'
import { BENCHMARK_CONFIG } from './config/benchmark'
import { runBenchmark } from './services/benchmark'
import { fetchMergedModels, getModelsCacheTimestamp } from './services/modelsService'
import { getHistory, saveResult, deleteRecord, clearHistory, exportCSV, exportJSON, getLanguage, saveLanguage } from './services/storage'
import Header from './components/Header'
import Footer from './components/Footer'
import TestForm from './components/TestForm'
import TestResult from './components/TestResult'
import HistoryTable from './components/HistoryTable'
import { ToastProvider, useToast, triggerToast } from './components/Toast'
import { getProviderName, t } from './config/i18n'

const PREFS_STORAGE_KEY = 'models.dev.prefs.v1'

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY)
    if (!raw) return { showDeprecated: false, showBetaPreview: false }
    const parsed = JSON.parse(raw)
    return {
      showDeprecated: Boolean(parsed.showDeprecated),
      showBetaPreview: parsed.showBetaPreview !== false,
    }
  } catch {
    return { showDeprecated: false, showBetaPreview: false }
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs))
  } catch { /* quota */ }
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

function AppContent() {
  const [providers, setProviders] = useState(staticProviders)
  const [selectedProvider, setSelectedProvider] = useState(staticProviders[0])
  const [selectedModel, setSelectedModel] = useState(
    staticProviders[0].models[0] || { id: '', name: '' },
  )
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
  const [prefs, setPrefs] = useState({ showDeprecated: false, showBetaPreview: false })
  const [modelsCachedAt, setModelsCachedAt] = useState(() => getModelsCacheTimestamp())
  const [modelsLoading, setModelsLoading] = useState(true)

  const { showConfirm } = useToast()

  // Load saved data on mount
  useEffect(() => {
    setHistory(getHistory())

    // Load saved language
    const savedLanguage = getLanguage()
    setLanguage(savedLanguage)

    // Load filter prefs
    setPrefs(loadPrefs())
  }, [])

  // Reload model catalog when prefs change (cheap: re-apply filters locally).
  useEffect(() => {
    let cancelled = false
    setModelsLoading(true)
    fetchMergedModels({ prefs })
      .then((merged) => {
        if (cancelled) return
        setProviders(merged)
        setModelsCachedAt(getModelsCacheTimestamp())

        // Re-anchor selected model: keep the same provider+model id if still present.
        setSelectedProvider((prev) => {
          const next = merged.find((p) => p.id === prev?.id) || merged[0]
          if (next?.id !== prev?.id) {
            setSelectedModel(next?.models?.[0] || { id: '', name: '' })
          } else if (prev?.models?.[0]?.id !== next?.models?.[0]?.id) {
            setSelectedModel(next?.models?.[0] || { id: '', name: '' })
          }
          return next
        })
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to load models:', err)
        triggerToast(
          'error',
          language === 'zh' ? '加载模型失败' : 'Load Models Failed',
          t('form.modelsLoadFailed', language),
        )
      })
      .finally(() => {
        if (!cancelled) setModelsLoading(false)
      })
    return () => { cancelled = true }
  }, [prefs, language])

  // Persist prefs on change
  useEffect(() => {
    savePrefs(prefs)
  }, [prefs])

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

    setCurrentPhase('warmup')
    setCurrentRun(0)

    try {
      const benchmarkResult = await runBenchmark({
        config: { ...BENCHMARK_CONFIG, runCount: measuredRunCount, warmupCount: warmupRunCount },
        baseUrl,
        apiKey,
        model: modelId,
        prompt,
        apiOptions: {
          maxTokens: BENCHMARK_CONFIG.maxTokens,
          timeout: BENCHMARK_CONFIG.timeoutMs,
          endpointPath,
          extraHeaders: parsedHeaders,
        },
      })

      const { aggregate, successRate, failedRuns: runFailures, tokenSource } = benchmarkResult
      const successRuns = Math.round(successRate * measuredRunCount)
      const failedMeasuredRuns = measuredRunCount - successRuns

      const avgResult = {
        ttft: Math.round(aggregate.ttft.avg),
        latency: Math.round(aggregate.latency.avg),
        throughput: parseFloat(aggregate.steadyTps.avg.toFixed(2)),
        effectiveTps: parseFloat(aggregate.effectiveTps.avg.toFixed(2)),
        outputTokens: 0,
        ttftP50: Math.round(aggregate.ttft.p50),
        ttftP95: Math.round(aggregate.ttft.p95),
        ttftStd: parseFloat(aggregate.ttft.stdDev.toFixed(2)),
        latencyP50: Math.round(aggregate.latency.p50),
        latencyP95: Math.round(aggregate.latency.p95),
        latencyStd: parseFloat(aggregate.latency.stdDev.toFixed(2)),
        throughputP50: parseFloat(aggregate.steadyTps.p50.toFixed(2)),
        throughputP95: parseFloat(aggregate.steadyTps.p95.toFixed(2)),
        throughputStd: parseFloat(aggregate.steadyTps.stdDev.toFixed(2)),
        effectiveTpsP50: parseFloat(aggregate.effectiveTps.p50.toFixed(2)),
        effectiveTpsP95: parseFloat(aggregate.effectiveTps.p95.toFixed(2)),
        effectiveTpsStd: parseFloat(aggregate.effectiveTps.stdDev.toFixed(2)),
        provider: providerName,
        model: modelId,
        runCount: measuredRunCount,
        warmupCount: warmupRunCount,
        successRuns,
        failedRuns: failedMeasuredRuns,
        successRate: parseFloat((successRate * 100).toFixed(2)),
        tokenSource: tokenSource === 'tokenizer' ? 'estimated' : tokenSource,
        endpointPath,
        failures: runFailures,
        aggregate,
        isAverage: true,
        benchmarkVersion: benchmarkResult.benchmarkVersion,
      }

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
          `${providerName} - ${modelId} (${successRuns}/${measuredRunCount})`
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
          prefs={prefs}
          onPrefsChange={setPrefs}
          modelsCachedAt={modelsCachedAt}
          modelsLoading={modelsLoading}
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
