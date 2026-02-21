import { Clock, Zap, FileText, XCircle, Loader2, Gauge, Activity } from 'lucide-react'
import { t } from '../config/i18n'
import { Card, CardContent } from './ui/card'

export default function TestResult({ status, result, error, language }) {
  if (status === 'ready') {
    return null
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">
          {t('result.title', language)}
        </h2>

        {status === 'testing' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-slate-900 mr-2" size={24} />
            <span className="text-slate-600">
              {language === 'zh' ? '测试中...' : 'Testing...'}
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
            </div>
          </div>
        )}

        {status === 'success' && result && (
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
        )}
      </CardContent>
    </Card>
  )
}
