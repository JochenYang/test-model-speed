import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { METRICS, filterByRange, listSeries, buildChartData } from '../lib/historyChart'
import { t } from '../config/i18n'
import { Button } from './ui/button'

const RANGES = [
  { key: '7d', i18nKey: 'chart.ranges.last7d' },
  { key: '30d', i18nKey: 'chart.ranges.last30d' },
  { key: 'all', i18nKey: 'chart.ranges.all' },
]

// Stable color palette per series index (deterministic across renders).
const PALETTE = [
  '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c',
  '#0891b2', '#db2777', '#65a30d', '#7c3aed', '#0d9488',
]

function colorFor(index) {
  return PALETTE[index % PALETTE.length]
}

function formatTickTime(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatTooltipTime(ts) {
  return new Date(ts).toLocaleString()
}

export default function HistoryChart({ history, language = 'zh' }) {
  const [metricKey, setMetricKey] = useState('ttft')
  const [rangeKey, setRangeKey] = useState('30d')

  const filtered = useMemo(
    () => filterByRange(history, rangeKey),
    [history, rangeKey],
  )
  const data = useMemo(() => buildChartData(filtered, metricKey), [filtered, metricKey])
  const series = useMemo(() => listSeries(filtered), [filtered])

  const empty = !history || history.length === 0
  const tooFew = data.length < 1

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold">{t('chart.title', language)}</h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric selector */}
          <div className="flex gap-1">
            {METRICS.map((m) => (
              <Button
                key={m.key}
                size="sm"
                variant={m.key === metricKey ? 'default' : 'outline'}
                onClick={() => setMetricKey(m.key)}
              >
                {t(`chart.metrics.${m.key}`, language)}
              </Button>
            ))}
          </div>

          {/* Range selector */}
          <div className="flex gap-1 ml-2">
            {RANGES.map((r) => (
              <Button
                key={r.key}
                size="sm"
                variant={r.key === rangeKey ? 'default' : 'outline'}
                onClick={() => setRangeKey(r.key)}
              >
                {t(r.i18nKey, language)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {empty || tooFew ? (
        <div className="text-center py-12 text-slate-400">
          {empty ? t('chart.empty', language) : t('chart.tooFew', language)}
        </div>
      ) : (
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={['dataMin', 'dataMax']}
                scale="time"
                tickFormatter={formatTickTime}
                stroke="#94a3b8"
                fontSize={12}
              />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                labelFormatter={formatTooltipTime}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}
              />
              <Legend />
              {series.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={colorFor(i)}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
