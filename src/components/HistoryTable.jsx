import { Search, Trash2, FileJson, Trash } from 'lucide-react'
import { t } from '../config/i18n'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

export default function HistoryTable({
  history,
  searchQuery,
  onSearchChange,
  onDelete,
  onClearAll,
  onExport,
  language,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold">{t('history.title', language)}</h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search using shadcn Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('history.search', language)}
              className="pl-9 w-[200px]"
            />
          </div>

          {/* Export Buttons using shadcn Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('csv')}
            disabled={history.length === 0}
          >
            <FileJson size={16} />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport('json')}
            disabled={history.length === 0}
          >
            <FileJson size={16} />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            disabled={history.length === 0}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash size={16} />
            {t('history.clear', language)}
          </Button>
        </div>
      </div>

      {/* History Table using shadcn Table */}
      {history.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          {t('history.noHistory', language)}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('history.columns.time', language)}</TableHead>
              <TableHead>{t('history.columns.provider', language)}</TableHead>
              <TableHead>{t('history.columns.model', language)}</TableHead>
              <TableHead className="text-right">{t('history.columns.ttft', language)}</TableHead>
              <TableHead className="text-right">{t('history.columns.latency', language)}</TableHead>
              <TableHead className="text-right">TPS</TableHead>
              <TableHead className="text-right">{t('history.columns.tokens', language)}</TableHead>
              <TableHead className="text-center">{t('history.columns.action', language)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-slate-600">
                  {new Date(item.timestamp).toLocaleString()}
                </TableCell>
                <TableCell className="font-medium">{item.provider}</TableCell>
                <TableCell className="font-mono text-slate-600">{item.model}</TableCell>
                <TableCell className="text-right">
                  {(item.ttft || item.latency)} ms
                </TableCell>
                <TableCell className="text-right">{item.latency} ms</TableCell>
                <TableCell className="text-right">{item.effectiveTps || 0}</TableCell>
                <TableCell className="text-right">{item.outputTokens}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(item.id)}
                    title={language === 'zh' ? '删除' : 'Delete'}
                  >
                    <Trash2 size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
