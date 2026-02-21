import { useState, useEffect } from 'react'
import { Eye, EyeOff, Play, Loader2 } from 'lucide-react'
import { t, getProviderName } from '../config/i18n'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { getApiKey as getStoredApiKey, saveApiKey as storeApiKey, getSaveApiKeyPreference, setSaveApiKeyPreference } from '../services/storage'

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
  language,
}) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [customModelInput, setCustomModelInput] = useState('')
  const [customUrlInput, setCustomUrlInput] = useState('')
  const [useCustomModel, setUseCustomModel] = useState(false)
  const [saveApiKeyEnabled, setSaveApiKeyEnabled] = useState(true)

  const isTesting = testStatus === 'testing'
  const isCustomProvider = selectedProvider.id === 'custom'

  // Load saved preferences
  useEffect(() => {
    setSaveApiKeyEnabled(getSaveApiKeyPreference())
  }, [])

  // Load API key when provider changes
  useEffect(() => {
    if (selectedProvider) {
      const savedKey = getStoredApiKey(selectedProvider.id)
      // If has saved key, load it; otherwise clear the input
      onApiKeyChange(savedKey || '')
    }
  }, [selectedProvider, onApiKeyChange])

  // Handle API key change
  const handleApiKeyChange = (value) => {
    onApiKeyChange(value)
    // Save to localStorage per provider if enabled
    if (saveApiKeyEnabled && value && selectedProvider) {
      storeApiKey(selectedProvider.id, value)
    }
  }

  // Toggle save API key
  const handleSaveApiKeyToggle = (checked) => {
    setSaveApiKeyEnabled(checked)
    setSaveApiKeyPreference(checked)

    if (!checked && selectedProvider) {
      // Clear saved API key if user disables save
      storeApiKey(selectedProvider.id, '')
    } else if (checked && apiKey && selectedProvider) {
      // Save current API key if enabling
      storeApiKey(selectedProvider.id, apiKey)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">
        {language === 'zh' ? '测试配置' : 'Test Configuration'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Provider Select using shadcn Select */}
        <div>
          <Label className="mb-1 block">{t('form.provider', language)}</Label>
          <Select
            value={selectedProvider.id}
            onValueChange={(value) => {
              const provider = providers.find((p) => p.id === value)
              onProviderChange(provider)
              setUseCustomModel(false)
            }}
            disabled={isTesting}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {getProviderName(provider.id, language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Select or Custom URL */}
        <div>
          {isCustomProvider ? (
            <>
              <Label className="mb-1 block">{t('form.apiUrl', language)}</Label>
              <Input
                type="text"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder={t('form.placeholder.customUrl', language)}
                disabled={isTesting}
              />
            </>
          ) : (
            <>
              <Label className="mb-1 block">{t('form.model', language)}</Label>
              {useCustomModel ? (
                <Input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder={t('form.placeholder.customModel', language)}
                  disabled={isTesting}
                />
              ) : (
                <Select
                  value={selectedModel.id}
                  onValueChange={(value) => onModelChange({ id: value, name: value })}
                  disabled={isTesting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProvider.models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setUseCustomModel(!useCustomModel)
                  if (!useCustomModel) {
                    setCustomModelInput(selectedModel.id)
                  }
                }}
                disabled={isTesting}
                className="px-0 h-auto"
              >
                {useCustomModel
                  ? t('form.usePresetModel', language)
                  : t('form.useCustomModel', language)}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Custom Provider - Model Input */}
      {isCustomProvider && (
        <div className="mb-4">
          <Label className="mb-1 block">{t('form.modelName', language)}</Label>
          <Input
            type="text"
            value={customModelInput}
            onChange={(e) => setCustomModelInput(e.target.value)}
            placeholder={t('form.placeholder.customModel', language)}
            disabled={isTesting}
          />
        </div>
      )}

      {/* API Key */}
      <div className="mb-4">
        <Label className="mb-1 block">{t('form.apiKey', language)}</Label>
        <div className="relative">
          <Input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder={t('form.placeholder.apiKey', language)}
            disabled={isTesting}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowApiKey(!showApiKey)}
            disabled={isTesting}
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          >
            {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
          </Button>
        </div>
        {/* Save API Key checkbox */}
        <div className="mt-2 flex items-center gap-2">
          <Checkbox
            id="saveApiKey"
            checked={saveApiKeyEnabled}
            onCheckedChange={handleSaveApiKeyToggle}
          />
          <Label htmlFor="saveApiKey" className="text-sm font-normal cursor-pointer">
            {language === 'zh' ? '保存 API Key 到本地' : 'Save API Key to local'}
          </Label>
        </div>
      </div>

      {/* Custom Prompt */}
      <div className="mb-4">
        <Label className="mb-1 block">
          {t('form.customPrompt', language)}{' '}
          <span className="text-slate-400 font-normal">
            {t('form.optional', language)}
          </span>
        </Label>
        <Textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder={t('form.placeholder.prompt', language)}
          rows={3}
          disabled={isTesting}
        />
      </div>

      {/* Test Button */}
      <Button
        onClick={() => onTest(customUrlInput, customModelInput)}
        disabled={
          isTesting ||
          !apiKey.trim() ||
          (isCustomProvider &&
            (!customUrlInput.trim() || !customModelInput.trim()))
        }
        className="w-full"
        size="lg"
      >
        {isTesting ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            {t('form.testing', language)}
          </>
        ) : (
          <>
            <Play size={20} />
            {t('form.startTest', language)}
          </>
        )}
      </Button>
    </div>
  )
}
