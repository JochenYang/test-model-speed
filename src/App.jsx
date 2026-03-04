import { useState, useEffect } from 'react'
import { providers, defaultPrompt } from './config/providers'
import { callLLMApi } from './services/api'
import { getHistory, saveResult, deleteRecord, clearHistory, exportCSV, exportJSON, getLanguage, saveLanguage } from './services/storage'
import Header from './components/Header'
import Footer from './components/Footer'
import TestForm from './components/TestForm'
import TestResult from './components/TestResult'
import HistoryTable from './components/HistoryTable'
import { ToastProvider, useToast, triggerToast } from './components/Toast'
import { getProviderName } from './config/i18n'

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
    setSelectedModel(provider.models[0])
  }

  // Handle test execution
  const handleTest = async (customUrl, customModel, useCustomModel) => {
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

    const prompt = customPrompt.trim() || defaultPrompt

    // Use custom URL and model if custom provider selected
    const baseUrl = isCustomProvider ? customUrl.trim() : selectedProvider.baseUrl
    const modelId = (isCustomProvider || useCustomModel)
      ? (customModel?.trim() || selectedModel.id)
      : selectedModel.id

    try {
      const result = await callLLMApi(baseUrl, apiKey, modelId, prompt)

      const providerName = isCustomProvider
        ? getProviderName('custom', language)
        : getProviderName(selectedProvider.id, language)

      const fullResult = {
        ...result,
        provider: providerName,
        model: modelId,
      }

      // Save to history
      const savedRecord = saveResult(fullResult)
      setHistory(getHistory())
      setTestResult(fullResult)
      setTestStatus('success')

      triggerToast('success',
        language === 'zh' ? '测试完成！' : 'Test completed!',
        `${providerName} - ${modelId}`
      )
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
    return item.provider.toLowerCase().includes(query) || item.model.toLowerCase().includes(query)
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
