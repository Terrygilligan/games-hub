import { useTranslation, getLangPref, setLang, LANGS } from '../i18n'
import type { LangPref } from '../i18n'

export default function LangSelect() {
  const { t, lang } = useTranslation()
  return (
    <select
      value={getLangPref()}
      onChange={(e) => setLang(e.target.value as LangPref)}
      aria-label={t('common.language')}
      title={t('common.language')}
      className="h-10 rounded-lg bg-transparent px-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 focus:outline-none dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <option value="auto">
        {t('common.auto')} · {lang.toUpperCase()}
      </option>
      {LANGS.map((l) => (
        <option key={l} value={l}>
          {l.toUpperCase()}
        </option>
      ))}
    </select>
  )
}
