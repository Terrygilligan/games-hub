import { useEffect, useState } from 'react'
import { MessageSquare, Star } from 'lucide-react'
import { useTranslation } from '../../../i18n'
import { fetchRating, submitRating, submitReview } from '../../../lib/ratings'

interface Props {
  itemKey: string
}

const votedKey = (k: string) => `games-hub.rated.${k}`
const reviewedKey = (k: string) => `games-hub.reviewed.${k}`
const loadVote = (k: string): number => {
  try {
    return Number(localStorage.getItem(votedKey(k))) || 0
  } catch {
    return 0
  }
}

export default function GameRating({ itemKey }: Props) {
  const { t } = useTranslation()
  const [myVote, setMyVote] = useState(() => loadVote(itemKey))
  const [avg, setAvg] = useState(0)
  const [count, setCount] = useState(0)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [reviewed, setReviewed] = useState(() => {
    try {
      return !!localStorage.getItem(reviewedKey(itemKey))
    } catch {
      return false
    }
  })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setMyVote(loadVote(itemKey))
    let cancelled = false
    void fetchRating(itemKey).then((snap) => {
      if (!cancelled && snap) {
        setAvg(snap.average)
        setCount(snap.count)
      }
    })
    return () => {
      cancelled = true
    }
  }, [itemKey])

  const vote = (stars: number) => {
    if (myVote > 0) return
    setMyVote(stars)
    try {
      localStorage.setItem(votedKey(itemKey), String(stars))
    } catch {
      // storage unavailable
    }
    void submitRating(itemKey, stars).then((ok) => {
      if (ok)
        void fetchRating(itemKey).then((snap) => {
          if (snap) {
            setAvg(snap.average)
            setCount(snap.count)
          }
        })
    })
  }

  const sendReview = () => {
    const text = draft.trim()
    if (!text || reviewed || sending || myVote === 0) return
    setSending(true)
    void submitReview(itemKey, myVote, text).then((ok) => {
      setSending(false)
      if (ok) {
        setReviewed(true)
        setReviewOpen(false)
        try {
          localStorage.setItem(reviewedKey(itemKey), '1')
        } catch {
          // storage unavailable
        }
      }
    })
  }

  return (
    <div className="mx-auto mb-4 w-full max-w-2xl rounded-xl bg-slate-100 px-4 py-2.5 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {t('games.rating.rateGame')}
        </span>
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label={t('games.rating.rateGame')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n <= myVote}
              aria-label={`${n}`}
              disabled={myVote > 0}
              onClick={() => vote(n)}
              className="transition enabled:hover:scale-110 disabled:cursor-default"
            >
              <Star
                size={18}
                className={
                  n <= myVote
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 transition enabled:hover:text-amber-300 dark:text-slate-600'
                }
              />
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {count > 0
            ? `${avg.toFixed(1)} · ${count}`
            : t('games.rating.notRated')}
        </span>
        {!reviewed && (
          <button
            type="button"
            onClick={() => setReviewOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-xs text-sky-600 transition hover:underline dark:text-sky-400"
          >
            <MessageSquare size={12} />
            {t('games.rating.leaveReview')}
          </button>
        )}
      </div>

      {reviewOpen && !reviewed && (
        <div className="mt-2 flex flex-col gap-1.5">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t('footer.reviewPlaceholder')}
            className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={sendReview}
              disabled={!draft.trim() || sending || myVote === 0}
              className="h-8 rounded-lg bg-sky-600 px-4 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-40"
            >
              {t('footer.submitReview')}
            </button>
            {myVote === 0 && (
              <span className="text-[11px] text-slate-400">{t('games.rating.rateFirst')}</span>
            )}
          </div>
        </div>
      )}
      {reviewed && (
        <p className="mt-1 text-[11px] text-emerald-500">{t('footer.reviewThanks')}</p>
      )}
    </div>
  )
}
