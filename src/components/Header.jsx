import { Gauge, Github } from 'lucide-react'
import { languages } from '../config/i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export default function Header({ language, onLanguageChange }) {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo Icon */}
            <div className="relative">
              <div className="p-2.5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-lg">
                <Gauge className="text-white" size={26} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {language === 'zh' ? '模型速度测试工具' : 'Model Speed Tester'}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {language === 'zh' ? 'LLM API 速度测试工具' : 'LLM API Speed Testing Tool'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* GitHub Link */}
            <a
              href="https://github.com/JochenYang/test-model-speed"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="GitHub"
            >
              <Github className="w-5 h-5 text-slate-600" />
            </a>

            {/* Language Switcher */}
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger className="w-[130px] h-9 bg-slate-50 border-slate-200 hover:bg-slate-100 transition-colors">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </header>
  )
}
