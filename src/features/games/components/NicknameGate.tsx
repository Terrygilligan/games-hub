import { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { getDict, useTranslation } from '../../i18n'
import { getPlayerId, MAX_NICKNAME_LENGTH } from '../services/playerIdentity'
import { isNameTaken } from '../services/leaderboardService'

// Shared nickname field for all game victory modals — wraps the input with:
//  • a ? button → explainer modal (device-local, shared across games, unreserved)
//  • a soft duplicate check on submit — warns + offers "submit anyway"
interface Props {
  gameId: string
  defaultNickname: string
  submitting: boolean
  submitLabel: string
  submittingLabel: string
  onSubmit: (nickname: string) => void
}

export default function NicknameGate({
  gameId,
  defaultNickname,
  submitting,
  submitLabel,
  submittingLabel,
  onSubmit,
}: Props) {
  const { lang, t } = useTranslation()
  const [nickname, setNickname] = useState(defaultNickname)
  const [infoOpen, setInfoOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [taken, setTaken] = useState(false)

  const canSubmit = nickname.trim().length > 0 && !submitting && !checking
  const steps = getDict(lang).games.nickname.infoSteps as string[]

  const attemptSubmit = async () => {
    const name = nickname.trim()
    if (!name || submitting || checking) return
    setChecking(true)
    const taken_ = await isNameTaken(gameId, name, getPlayerId())
    setChecking(false)
    if (taken_) setTaken(true)
    else onSubmit(name)
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center gap-2">
        <input
          type="text"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value)
            setTaken(false)
          }}
          maxLength={MAX_NICKNAME_LENGTH}
          placeholder={t('games.nickname.placeholder')}
          aria-label={t('games.nickname.label')}
          className="h-11 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 text-center text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label={t('games.nickname.info')}
          title={t('games.nickname.info')}
          className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-sky-300"
        >
          <HelpCircle size={16} />
        </button>
      </div>

      {taken && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left">
          <p className="text-xs font-medium text-amber-400">
            {t('games.nickname.nameTaken')}
          </p>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={() => setTaken(false)}
              className="h-8 flex-1 rounded-lg bg-slate-700 text-xs font-medium text-white transition hover:bg-slate-600"
            >
              {t('games.nickname.changeName')}
            </button>
            <button
              type="button"
              onClick={() => onSubmit(nickname.trim())}
              className="h-8 flex-1 rounded-lg bg-amber-500/20 text-xs font-medium text-amber-300 transition hover:bg-amber-500/30"
            >
              {t('games.nickname.submitAnyway')}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void attemptSubmit()}
        className="h-11 w-full rounded-lg bg-sky-600 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-40"
      >
        {checking ? t('games.nickname.checking') : submitting ? submittingLabel : submitLabel}
      </button>

      {infoOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-left text-slate-100">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold">{t('games.nickname.info')}</p>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                aria-label={t('footer.close')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>
            <ol className="mt-4 space-y-2.5">
              {(Array.isArray(steps) ? steps : []).map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] font-bold text-sky-400">
                    {i + 1}
                  </span>
                  <p className="flex-1 text-sm leading-relaxed text-slate-400">{step}</p>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-sky-600 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              {t('games.nickname.gotIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
