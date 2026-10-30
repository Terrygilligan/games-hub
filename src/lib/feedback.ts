// Anonymous bug/feature reports — write-only `feedback_reports` collection:
// no account needed, reports aren't publicly readable (rules deny read).
import { getDb } from './firebase'

const COLLECTION = 'feedback_reports'

export type ReportType = 'bug' | 'feature'

export async function submitReport(type: ReportType, message: string): Promise<boolean> {
  const db = await getDb()
  const text = message.trim().slice(0, 2000)
  if (!db || !text) return false
  try {
    const { addDoc, collection, serverTimestamp } = await import('@firebase/firestore')
    await addDoc(collection(db, COLLECTION), {
      type,
      message: text,
      url: window.location.href.slice(0, 500),
      userAgent: navigator.userAgent.slice(0, 500),
      lang: navigator.language.slice(0, 32),
      app: 'games-hub',
      createdAt: serverTimestamp(),
    })
    return true
  } catch {
    return false
  }
}
