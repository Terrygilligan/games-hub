// Lightweight i18n: JSON dictionaries keyed by dot-path (e.g. 'games.hub.title').
// English ('en') is the source of truth — missing keys fall back to it, then to
// the raw key. Detection: stored 'utility-hub.lang' pref, else first supported
// navigator language, else 'en'. Language changes are reactive: setLang()
// dispatches LANG_EVENT on window and useTranslation() re-renders subscribers.
import { useSyncExternalStore } from 'react'
import en from './locales/en.json'
import bg from './locales/bg.json'
import de from './locales/de.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import nl from './locales/nl.json'

export type Lang = 'en' | 'bg' | 'de' | 'es' | 'fr' | 'nl'
export type LangPref = Lang | 'auto'

export const LANGS: Lang[] = ['en', 'bg', 'de', 'es', 'fr', 'nl']
const SUPPORTED: Lang[] = ['bg', 'de', 'es', 'fr', 'nl']
const LANG_KEY = 'utility-hub.lang'

export function getLangPref(): LangPref {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored === 'auto' || (LANGS as string[]).includes(stored ?? '')) {
      return stored as LangPref
    }
  } catch {
    // storage unavailable — fall through to auto
  }
  return 'auto'
}

const detect = (): Lang => {
  const prefs = navigator.languages ?? [navigator.language]
  for (const p of prefs) {
    const short = p.slice(0, 2).toLowerCase() as Lang
    if (SUPPORTED.includes(short)) return short
  }
  return 'en'
}

const resolveLang = (): Lang => {
  const pref = getLangPref()
  return pref === 'auto' ? detect() : pref
}

export const LANG_EVENT = 'utility-hub:lang'

export let LANG: Lang = resolveLang()

const syncDocumentLang = () => {
  document.documentElement.lang = LANG
}
syncDocumentLang()

export function setLang(pref: LangPref) {
  try {
    localStorage.setItem(LANG_KEY, pref)
  } catch {
    // storage unavailable — new pref won't persist, still switch for this session
  }
  LANG = resolveLang()
  syncDocumentLang()
  window.dispatchEvent(new Event(LANG_EVENT))
}

type Dict = typeof en
const dicts: Record<Lang, Dict> = { en, bg, de, es, fr, nl }

// Non-string dictionary access (e.g. word-pair arrays) — t() only resolves
// leaf strings, so structured game data is read straight from the dict.
export function getDict(lang: Lang): Dict {
  return dicts[lang]
}

const resolve = (dict: Dict, key: string): string | undefined => {
  let node: unknown = dict
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : undefined
}

const translate = (lang: Lang, key: string, vars?: Record<string, string | number>): string => {
  const str = resolve(dicts[lang], key) ?? resolve(dicts.en, key) ?? key
  return vars
    ? str.replace(/\{(\w+)\}/g, (match, name: string) =>
        Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match)
    : str
}

export function t(key: string, vars?: Record<string, string | number>): string {
  return translate(LANG, key, vars)
}

export function useTranslation() {
  const lang = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(LANG_EVENT, onStoreChange)
      return () => window.removeEventListener(LANG_EVENT, onStoreChange)
    },
    () => LANG,
  )
  return {
    lang,
    t: (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
  }
}
