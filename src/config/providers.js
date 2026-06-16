/**
 * Provider adapter layer.
 * `models` are now loaded at runtime by `services/modelsService.js` from models.dev.
 * This file keeps only baseUrl + display metadata.
 */

export const providers = [
  {
    id: 'aliyun',
    name: '阿里百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [],
  },
  {
    id: 'volcano',
    name: '火山引擎',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    models: [],
  },
  {
    id: 'zhipu',
    name: '智谱',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: [],
  },
  {
    id: 'minimax',
    name: 'minimax(国内版)',
    baseUrl: 'https://api.minimaxi.com/v1',
    models: [],
  },
  {
    id: 'minimax_intl',
    name: 'minimax(国际版)',
    baseUrl: 'https://api.minimax.io/v1',
    models: [],
  },
  {
    id: 'kimi',
    name: 'kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: [],
  },
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    models: [],
    isCustom: true,
  },
]

export const defaultPrompt = `请用中文写一篇关于人工智能的小短文（150字左右），涵盖技术进步和潜在风险两个角度。`
