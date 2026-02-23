/**
 * Provider and model configuration
 * Contains configurations for 5 domestic LLM providers
 */

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
    name: 'minimax(国内版)',
    baseUrl: 'https://api.minimaxi.com/v1',
    models: [
      { id: 'Minimax-M2', name: 'Minimax-M2' },
      { id: 'Minimax-M2.1', name: 'Minimax-M2.1' },
      { id: 'Minimax-m2.5', name: 'Minimax-m2.5' },
      { id: 'Minimax-M2.5-highspeed', name: 'Minimax-M2.5-highspeed' },
    ],
  },
  {
    id: 'minimax_intl',
    name: 'minimax(国际版)',
    baseUrl: 'https://api.minimax.io/v1',
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
  {
    id: 'custom',
    name: '自定义',
    baseUrl: '',
    models: [],
    isCustom: true,
  },
]

// Default prompt used for testing model speed
export const defaultPrompt = `请用中文写一段关于人工智能未来发展的文章，要求：
1. 包含至少 5 个段落
2. 每个段落至少有 50 字以上
3. 讨论技术进步、社会影响、伦理挑战等方面
4. 最后总结人工智能对人类未来的意义`
