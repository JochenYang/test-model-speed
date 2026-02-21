/**
 * Language configuration and translations
 * Supports Chinese (zh) and English (en)
 */

export const languages = [
  { code: 'zh', name: '中文', nativeName: '中文' },
  { code: 'en', name: 'English', nativeName: 'English' },
]

export const translations = {
  // Header
  header: {
    title: {
      zh: '模型速度测试工具',
      en: 'Model Speed Tester',
    },
    subtitle: {
      zh: 'LLM API 速度测试工具',
      en: 'LLM API Speed Testing Tool',
    },
  },

  // Test Form
  form: {
    provider: {
      zh: '提供商',
      en: 'Provider',
    },
    model: {
      zh: '模型',
      en: 'Model',
    },
    apiUrl: {
      zh: 'API 地址',
      en: 'API URL',
    },
    modelName: {
      zh: '模型名称',
      en: 'Model Name',
    },
    useCustomModel: {
      zh: '使用自定义模型',
      en: 'Use Custom Model',
    },
    usePresetModel: {
      zh: '使用预设模型',
      en: 'Use Preset Model',
    },
    apiKey: {
      zh: 'API Key',
      en: 'API Key',
    },
    customPrompt: {
      zh: '自定义提示词',
      en: 'Custom Prompt',
    },
    optional: {
      zh: '（可选）',
      en: '(Optional)',
    },
    placeholder: {
      apiKey: {
        zh: '请输入 API Key',
        en: 'Enter API Key',
      },
      prompt: {
        zh: '留空使用默认测试提示词',
        en: 'Leave empty to use default test prompt',
      },
      customUrl: {
        zh: 'https://api.example.com/v1',
        en: 'https://api.example.com/v1',
      },
      customModel: {
        zh: '例如：gpt-4o, claude-3-opus',
        en: 'e.g. gpt-4o, claude-3-opus',
      },
    },
    startTest: {
      zh: '开始测试',
      en: 'Start Test',
    },
    testing: {
      zh: '测试中...',
      en: 'Testing...',
    },
    error: {
      noApiKey: {
        zh: '请输入 API Key',
        en: 'Please enter API Key',
      },
      noCustomInfo: {
        zh: '请输入 API 地址和模型名称',
        en: 'Please enter API URL and Model name',
      },
    },
  },

  // Test Result
  result: {
    title: {
      zh: '测试结果',
      en: 'Test Results',
    },
    ttft: {
      label: {
        zh: '首Token延迟 (TTFT)',
        en: 'Time to First Token (TTFT)',
      },
      unit: 'ms',
    },
    latency: {
      label: {
        zh: '总耗时',
        en: 'Total Latency',
      },
      unit: 'ms',
    },
    steadyTps: {
      label: {
        zh: '稳定吞吐 (TPS)',
        en: 'Steady TPS',
      },
      unit: 'tokens/s',
    },
    effectiveTps: {
      label: {
        zh: '有效吞吐',
        en: 'Effective TPS',
      },
      unit: 'tokens/s',
    },
    outputTokens: {
      label: {
        zh: '输出Token数',
        en: 'Output Tokens',
      },
      unit: '',
    },
    error: {
      title: {
        zh: '测试失败',
        en: 'Test Failed',
      },
    },
  },

  // History
  history: {
    title: {
      zh: '测试历史',
      en: 'Test History',
    },
    search: {
      zh: '搜索提供商或模型...',
      en: 'Search provider or model...',
    },
    noHistory: {
      zh: '暂无测试记录',
      en: 'No test history',
    },
    export: {
      zh: '导出',
      en: 'Export',
    },
    clear: {
      zh: '清空',
      en: 'Clear',
    },
    confirmClear: {
      zh: '确定要清空所有历史记录吗？',
      en: 'Are you sure you want to clear all history?',
    },
    columns: {
      time: {
        zh: '时间',
        en: 'Time',
      },
      provider: {
        zh: '提供商',
        en: 'Provider',
      },
      model: {
        zh: '模型',
        en: 'Model',
      },
      ttft: {
        zh: 'TTFT',
        en: 'TTFT',
      },
      latency: {
        zh: '耗时',
        en: 'Latency',
      },
      tps: {
        zh: 'TPS',
        en: 'TPS',
      },
      tokens: {
        zh: 'Token',
        en: 'Token',
      },
      action: {
        zh: '操作',
        en: 'Action',
      },
    },
  },

  // Providers
  providers: {
    aliyun: { zh: '阿里百炼', en: 'DashScope' },
    volcano: { zh: '火山引擎', en: 'Volcengine' },
    zhipu: { zh: '智谱AI', en: 'Zhipu AI' },
    minimax: { zh: 'MiniMax', en: 'MiniMax' },
    kimi: { zh: 'Kimi', en: 'Kimi' },
    custom: { zh: '自定义', en: 'Custom' },
  },

  // Toast messages
  toast: {
    testSuccess: {
      zh: '测试完成！',
      en: 'Test completed!',
    },
    exportSuccess: {
      zh: '导出成功',
      en: 'Export successful',
    },
    clearSuccess: {
      zh: '已清空历史记录',
      en: 'History cleared',
    },
    deleteSuccess: {
      zh: '已删除记录',
      en: 'Record deleted',
    },
    apiKeySaved: {
      zh: 'API Key 已保存',
      en: 'API Key saved',
    },
  },
}

// Get nested translation value
export function t(key, lang = 'zh') {
  const keys = key.split('.')
  let value = translations

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return key // Return key if translation not found
    }
  }

  // Handle nested language object
  if (value && typeof value === 'object' && lang in value) {
    return value[lang]
  }

  return value
}

// Get provider name by language
export function getProviderName(providerId, lang = 'zh') {
  return t(`providers.${providerId}`, lang)
}
