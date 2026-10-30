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

// App Check (reCAPTCHA Enterprise) — deferred to idle so the ~160KB bundle
// never blocks render. Inert until enforcement is enabled in the Firebase
// console → App Check; feedback writes still work either way.
const APPCHECK_SITE_KEY = '6Le8sxotAAAAAMtXi1w6zoGwCE3r6bGFKh3Phf-G'
let appCheckStarted = false
const startAppCheck = (app: FirebaseApp) => {
  if (appCheckStarted) return
  appCheckStarted = true
  const init = () =>
    import('@firebase/app-check')
      .then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
        try {
          initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(APPCHECK_SITE_KEY),
            isTokenAutoRefreshEnabled: true,
          })
        } catch {
          // already initialized
        }
      })
      .catch(() => {})
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(init, { timeout: 5000 })
  } else {
    setTimeout(init, 3000)
  }
}

export function getFirebaseApp(): Promise<FirebaseApp | null> {
  if (!isFirebaseConfigured()) return Promise.resolve(null)
  appPromise ??= import('@firebase/app')
    .then(({ initializeApp }) => {
      const app = initializeApp(firebaseConfig)
      startAppCheck(app)
      return app
    })
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
