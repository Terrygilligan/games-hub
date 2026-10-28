import type { FirebaseApp } from '@firebase/app'
import type { Firestore } from '@firebase/firestore'

// Firebase web config comes from Vite env vars (.env.local / hosting env).
// The web apiKey is a public identifier by design — it is not a secret —
// but the values are still kept out of the repo; .env.example lists the keys.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}

let appPromise: Promise<FirebaseApp | null> | null = null
let dbPromise: Promise<Firestore | null> | null = null

export function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null)
  appPromise ??= import('@firebase/app')
    .then(({ initializeApp }) => initializeApp(firebaseConfig))
    .catch(() => null)
  return appPromise
}

// Lazily loaded so the Firestore/grpc bundle never hits the initial chunk.
export function getDb(): Promise<Firestore | null> {
  dbPromise ??= getFirebaseApp().then(async (app) => {
    if (!app) return null
    try {
      const { getFirestore } = await import('@firebase/firestore')
      return getFirestore(app)
    } catch {
      return null
    }
  })
  return dbPromise
}
