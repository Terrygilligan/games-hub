import GlobalFooterBar from './shared/GlobalFooterBar'

interface FooterProps {
  itemKey?: string
}

export default function Footer({ itemKey = 'games-hub' }: FooterProps) {
  return (
    <footer className="border-t border-slate-200 px-4 pb-8 pt-6 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-8">
      <GlobalFooterBar itemKey={itemKey} />
    </footer>
  )
}
