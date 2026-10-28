export type ThemePref = 'light' | 'dark' | 'system'
const THEME_KEY = 'utility-hub.theme'

export function getTheme(): ThemePref {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // storage unavailable — treat as system
  }
  return 'system'
}

function apply(pref: ThemePref) {
  const dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function setTheme(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {
    // storage unavailable — apply for this session only
  }
  apply(pref)
}

export function cycleTheme(): ThemePref {
  const order: ThemePref[] = ['system', 'light', 'dark']
  const next = order[(order.indexOf(getTheme()) + 1) % order.length]
  setTheme(next)
  return next
}
