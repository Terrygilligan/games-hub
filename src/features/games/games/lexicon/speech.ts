// Browser-native Web Speech API wrapper — module-local, no deps.
// Voices load async on some platforms, so we cache and refresh on
// `voiceschanged`. Speech only ever runs inside user-gesture handlers.
export const ttsSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window

let cachedVoices: SpeechSynthesisVoice[] = []

const refreshVoices = () => {
  cachedVoices = ttsSupported ? window.speechSynthesis.getVoices() : []
}
if (ttsSupported) {
  refreshVoices()
  window.speechSynthesis.onvoiceschanged = refreshVoices
}

export function speak(text: string, lang: string) {
  if (!ttsSupported) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = lang
  const voices = cachedVoices.length
    ? cachedVoices
    : window.speechSynthesis.getVoices()
  const voice = voices.find((v) => v.lang.toLowerCase().startsWith(lang))
  if (voice) utter.voice = voice
  window.speechSynthesis.speak(utter)
}

// Waits for any in-flight utterance (e.g. a spoken answer) to finish before
// speaking — unlike speak(), never cancels mid-word. Returns a cancel handle
// so callers can drop a deferred speak on unmount/state change.
export function speakWhenIdle(text: string, lang: string): () => void {
  if (!ttsSupported) return () => {}
  let cancelled = false
  const tick = () => {
    if (cancelled) return
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.setTimeout(tick, 120)
      return
    }
    speak(text, lang)
  }
  tick()
  return () => {
    cancelled = true
  }
}

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel()
}
