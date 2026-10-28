import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cycleTheme, getTheme } from '../lib/theme'
import type { ThemePref } from '../lib/theme'

const ICONS: Record<ThemePref, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export default function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>(getTheme())
  const Icon = ICONS[pref]
  return (
    <button
      type="button"
      onClick={() => setPref(cycleTheme())}
      aria-label={`Theme: ${pref}`}
      title={`Theme: ${pref}`}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <Icon size={18} />
    </button>
  )
}
