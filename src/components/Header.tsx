import { Link } from 'react-router-dom'
import { Gamepad2 } from 'lucide-react'
import { useTranslation } from '../i18n'
import LangSelect from './LangSelect'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const { t } = useTranslation()
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-8">
      <Link to="/" className="flex items-center gap-2.5 font-semibold text-slate-900 dark:text-slate-100">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <Gamepad2 size={20} />
        </span>
        {t('common.appName')}
      </Link>
      <div className="flex items-center gap-1">
        <LangSelect />
        <ThemeToggle />
      </div>
    </header>
  )
}
