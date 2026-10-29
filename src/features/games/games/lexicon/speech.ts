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

export function stopSpeaking() {
  if (ttsSupported) window.speechSynthesis.cancel()
}
