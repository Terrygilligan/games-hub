import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronDown,
  ExternalLink,
  Gamepad2,
  Heart,
  LayoutGrid,
  Menu,
  Wrench,
  X,
} from 'lucide-react'
import LangSelect from './LangSelect'
import ThemeToggle from './ThemeToggle'
import Footer from './Footer'
import { useTranslation } from '../i18n'
import { fetchRating } from '../lib/ratings'
import { buildGameSchema } from '../lib/schema'
import { GAME_REGISTRY } from '../features/games/games'
import GameRating from '../features/games/components/GameRating'
import { ICONS } from '../features/games/components/GameCard'
import { useFavorites } from '../features/games/favorites'

const UTILITY_HUB_URL = 'https://online-utilities.com'
const COLLAPSE_KEY = 'games-hub.nav.collapsed'

const NAV_GROUPS: { labelKey: string; ids: string[] }[] = [
  { labelKey: 'games.nav.wordGames', ids: ['word-guess', 'word-ladder', 'lexicon', 'crossword'] },
  { labelKey: 'games.nav.puzzles', ids: ['sudoku', 'minesweeper', 'memory'] },
  { labelKey: 'games.nav.classic', ids: ['snake'] },
]

function readCollapsed(): Record<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? '{}')
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}

function Brand() {
  const { t } = useTranslation()
  return (
    <NavLink to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-sky-600 dark:bg-slate-800 dark:text-sky-400">
        <Gamepad2 size={18} />
      </span>
      <span className="text-base font-semibold tracking-tight">{t('common.appName')}</span>
    </NavLink>
  )
}

function NavItemLink({
  to,
  label,
  icon: Icon,
  end,
  onNavigate,
}: {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white'
            : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const favorites = useFavorites()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsed)

  const persist = (next: Record<string, boolean>) => {
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable
    }
  }

  useEffect(() => {
    const active = NAV_GROUPS.find((g) =>
      g.ids.some((id) => GAME_REGISTRY.find((x) => x.id === id)?.route === pathname),
    )
    if (!active) return
    setCollapsed((current) => {
      if (!current[active.labelKey]) return current
      const next = { ...current, [active.labelKey]: false }
      persist(next)
      return next
    })
  }, [pathname])

  const toggle = (label: string) =>
    setCollapsed((current) => {
      const next = { ...current, [label]: !current[label] }
      persist(next)
      return next
    })

  const favoriteGames = GAME_REGISTRY.filter(
    (g) => favorites.includes(g.id) && g.route,
  )

  return (
    <>
      <NavItemLink
        to="/"
        label={t('games.nav.allGames')}
        icon={LayoutGrid}
        end
        onNavigate={onNavigate}
      />

      {favoriteGames.length > 0 && (
        <div className="mt-3">
          <p className="flex w-full items-center gap-1.5 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <Heart size={11} />
            {t('games.nav.favorites')}
          </p>
          {favoriteGames.map((game) => (
            <NavItemLink
              key={game.id}
              to={game.route as string}
              label={t(game.titleKey)}
              icon={ICONS[game.icon] ?? Gamepad2}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      {NAV_GROUPS.map((group) => {
        const games = group.ids
          .map((id) => GAME_REGISTRY.find((g) => g.id === id))
          .filter((g): g is (typeof GAME_REGISTRY)[number] => Boolean(g?.route))
        if (!games.length) return null
        const isCollapsed = !!collapsed[group.labelKey]
        return (
          <div key={group.labelKey} className="mt-3">
            <button
              type="button"
              onClick={() => toggle(group.labelKey)}
              className="flex w-full items-center justify-between px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              {t(group.labelKey)}
              <ChevronDown
                size={13}
                className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
              />
            </button>
            {!isCollapsed &&
              games.map((game) => (
                <NavItemLink
                  key={game.id}
                  to={game.route as string}
                  label={t(game.titleKey)}
                  icon={ICONS[game.icon] ?? Gamepad2}
                  onNavigate={onNavigate}
                />
              ))}
          </div>
        )
      })}

      <a
        href={UTILITY_HUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
      >
        <Wrench size={18} />
        {t('games.nav.utilityHub')}
        <ExternalLink size={12} className="ml-auto text-slate-400" />
      </a>
    </>
  )
}

const itemKeyOf = (pathname: string): string =>
  pathname.startsWith('/games/') ? (pathname.split('/')[2] ?? 'games-hub') : 'games-hub'

const JSONLD_ID = 'games-hub-jsonld'

export default function Layout() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Per-route JSON-LD — WebApplication + aggregateRating for SEO snippets.
  useEffect(() => {
    const game = GAME_REGISTRY.find((g) => g.route === pathname)
    const name = game ? t(game.titleKey) : t('common.appName')
    let cancelled = false
    void fetchRating(itemKeyOf(pathname)).then((snap) => {
      if (cancelled) return
      let script = document.getElementById(JSONLD_ID) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = JSONLD_ID
        script.type = 'application/ld+json'
        document.head.appendChild(script)
      }
      script.textContent = JSON.stringify(
        buildGameSchema(
          name,
          window.location.href,
          snap?.average ?? 0,
          snap?.count ?? 0,
        ),
      )
    })
    return () => {
      cancelled = true
    }
  }, [pathname, t])

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:hidden print:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          <LangSelect />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t('games.nav.toggle')}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <nav className="max-h-[75vh] space-y-1 overflow-y-auto border-b border-slate-200 px-4 py-3 dark:border-slate-800 md:hidden print:hidden">
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </nav>
      )}

      <div className="mx-auto flex w-full max-w-6xl">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 px-4 py-6 dark:border-slate-800 md:flex print:hidden">
          <Brand />
          <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
            <NavLinks />
          </nav>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <LangSelect />
            <ThemeToggle />
          </div>
          <p className="mt-2 text-xs text-slate-500">{t('games.nav.installable')}</p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1">
            {pathname.startsWith('/games/') && (
              <GameRating itemKey={itemKeyOf(pathname)} />
            )}
            <Outlet />
          </main>
          <Footer itemKey={itemKeyOf(pathname)} />
          <div className="border-t border-slate-200 pb-6 pt-3 text-center dark:border-slate-800">
            <a
              href={UTILITY_HUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
            >
              <Wrench size={12} />
              {t('games.nav.utilityHub')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
