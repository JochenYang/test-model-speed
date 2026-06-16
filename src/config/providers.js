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

export const defaultPrompt = `请用中文写一段关于人工智能未来发展的文章，要求：
1. 包含至少 5 个段落
2. 每个段落至少有 50 字以上
3. 讨论技术进步、社会影响、伦理挑战等方面
4. 最后总结人工智能对人类未来的意义`
