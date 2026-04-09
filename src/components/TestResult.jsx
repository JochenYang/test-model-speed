import { Clock, Zap, FileText, XCircle, Loader2, Gauge, Activity, AlertTriangle } from 'lucide-react'
import { t } from '../config/i18n'
import { Card, CardContent } from './ui/card'

const METRIC_LABELS = {
  ttft: { zh: 'TTFT', en: 'TTFT' },
  latency: { zh: '总耗时', en: 'Latency' },
  throughput: { zh: '稳定吞吐', en: 'Steady TPS' },
  effectiveTps: { zh: '有效吞吐', en: 'Effective TPS' },
}

function metricUnit(metric) {
  if (metric === 'ttft' || metric === 'latency') return 'ms'
  return 'tokens/s'
}

function formatValue(metric, value) {
  if (!Number.isFinite(value)) return '-'
  if (metric === 'ttft' || metric === 'latency') return Math.round(value)
  return Number(value).toFixed(2)
}

export default function TestResult({
  status,
  result,
  error,
  language,
  intermediateResults = [],
  currentRun = 0,
  runCount = 1,
  warmupCount = 0,
  totalRuns = 1,
  currentPhase = 'measure',
}) {
  if (status === 'ready') {
    return null
  }

  // Get title based on run status
  const getTitle = () => {
    if (status === 'success' && result?.isAverage) {
      return t('result.finalTitle', language).replace('{count}', runCount)
    }
    if (status === 'testing' && currentRun > 0) {
      if (currentPhase === 'warmup') {
        return language === 'zh'
          ? `预热中 ${currentRun}/${warmupCount}`
          : `Warming up ${currentRun}/${warmupCount}`
      }
      const measuredCurrent = Math.max(1, currentRun - warmupCount)
      return t('result.intermediateTitle', language)
        .replace('{current}', measuredCurrent)
        .replace('{total}', runCount)
    }
    return t('result.title', language)
  }

  // Check if there's a failed run
  const hasFailedRun = status === 'error' && intermediateResults.length > 0

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">
          {getTitle()}
        </h2>

        {status === 'testing' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-slate-900 mr-2" size={24} />
            <span className="text-slate-600">
              {language === 'zh'
                ? `执行第 ${currentRun}/${totalRuns} 轮...`
                : `Running ${currentRun}/${totalRuns}...`}
            </span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-red-700">
                {t('result.error.title', language)}
              </p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              {hasFailedRun && (
                <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                  <AlertTriangle size={16} />
                  <span>
                    {language === 'zh'
                      ? `已完成 ${intermediateResults.length}/${runCount} 次测试后失败`
                      : `Failed after ${intermediateResults.length}/${runCount} completed runs`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'success' && result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* TTFT - Time To First Token */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <Gauge className="text-purple-500 flex-shrink-0" size={24} />
                <div>
                  <p className="text-sm text-slate-500">{t('result.ttft.label', language)}</p>
                  <p className="text-xl font-bold text-slate-900">
                    {result.ttft} <span className="text-sm font-normal">{t('result.ttft.unit')}</span>
                  </p>
                </div>
              </div>

              {/* Total Latency */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <Clock className="text-blue-500 flex-shrink-0" size={24} />
                <div>
                  <p className="text-sm text-slate-500">{t('result.latency.label', language)}</p>
                  <p className="text-xl font-bold text-slate-900">
                    {result.latency} <span className="text-sm font-normal">{t('result.latency.unit')}</span>
                  </p>
                </div>
              </div>

              {/* Steady Throughput */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <Zap className="text-amber-500 flex-shrink-0" size={24} />
                <div>
                  <p className="text-sm text-slate-500">{t('result.steadyTps.label', language)}</p>
                  <p className="text-xl font-bold text-slate-900">
                    {result.throughput} <span className="text-sm font-normal">{t('result.steadyTps.unit')}</span>
                  </p>
                </div>
              </div>

              {/* Effective TPS */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <Activity className="text-green-500 flex-shrink-0" size={24} />
                <div>
                  <p className="text-sm text-slate-500">{t('result.effectiveTps.label', language)}</p>
                  <p className="text-xl font-bold text-slate-900">
                    {result.effectiveTps} <span className="text-sm font-normal">{t('result.effectiveTps.unit')}</span>
                  </p>
                </div>
              </div>

              {/* Output Tokens */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <FileText className="text-indigo-500 flex-shrink-0" size={24} />
                <div>
                  <p className="text-sm text-slate-500">{t('result.outputTokens.label', language)}</p>
                  <p className="text-xl font-bold text-slate-900">{result.outputTokens}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500">{language === 'zh' ? '成功率' : 'Success Rate'}</p>
                <p className="text-lg font-semibold text-slate-900">{result.successRate ?? 100}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500">{language === 'zh' ? '有效轮次' : 'Measured Runs'}</p>
                <p className="text-lg font-semibold text-slate-900">{result.successRuns ?? runCount}/{runCount}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500">{language === 'zh' ? '预热轮次' : 'Warmup Runs'}</p>
                <p className="text-lg font-semibold text-slate-900">{result.warmupCount ?? warmupCount}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500">{language === 'zh' ? 'Token 来源' : 'Token Source'}</p>
                <p className="text-lg font-semibold text-slate-900">
                  {result.tokenSource === 'official'
                    ? (language === 'zh' ? '官方 usage' : 'Official usage')
                    : result.tokenSource === 'mixed'
                      ? (language === 'zh' ? '混合' : 'Mixed')
                      : (language === 'zh' ? '估算' : 'Estimated')}
                </p>
              </div>
            </div>

            {result.failedRuns > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                {language === 'zh'
                  ? `有 ${result.failedRuns} 轮测试失败，结果基于成功轮次统计。`
                  : `${result.failedRuns} runs failed. Statistics are based on successful runs.`}
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-3 py-2">{language === 'zh' ? '指标' : 'Metric'}</th>
                    <th className="px-3 py-2">AVG</th>
                    <th className="px-3 py-2">P50</th>
                    <th className="px-3 py-2">P95</th>
                    <th className="px-3 py-2">{language === 'zh' ? '标准差' : 'Std Dev'}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(METRIC_LABELS).map((metricKey) => (
                    <tr key={metricKey} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">
                        {METRIC_LABELS[metricKey][language]}
                        <span className="ml-2 text-xs text-slate-400">{metricUnit(metricKey)}</span>
                      </td>
                      <td className="px-3 py-2">{formatValue(metricKey, result[metricKey])}</td>
                      <td className="px-3 py-2">{formatValue(metricKey, result[`${metricKey}P50`])}</td>
                      <td className="px-3 py-2">{formatValue(metricKey, result[`${metricKey}P95`])}</td>
                      <td className="px-3 py-2">{formatValue(metricKey, result[`${metricKey}Std`])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
