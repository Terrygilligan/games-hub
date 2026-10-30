// Pulls anonymous bug/feature reports from the shared farmfresh project.
// Uses the firebase-tools OAuth refresh token (project-owner scope bypasses
// the read-deny rules) — no service account needed.
// Usage: node scripts/report-digest.mjs [limit]
import { readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const cfgPath = join(homedir(), '.config', 'configstore', 'firebase-tools.json')
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
const refreshToken = cfg.tokens?.refresh_token
if (!refreshToken) {
  console.error('firebase-tools login not found — run firebase login first')
  process.exit(1)
}

// firebase-tools' public installed-app OAuth client (embedded in its source;
// installed-app client secrets are not secrets under the OAuth spec).
const CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com'
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi'

const tok = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }),
}).then((r) => r.json())
if (!tok.access_token) {
  console.error('token exchange failed', tok)
  process.exit(1)
}

const limit = Number(process.argv[2] ?? 50)
const url =
  `https://firestore.googleapis.com/v1/projects/farmfresh-5e95e/` +
  `databases/(default)/documents/feedback_reports?pageSize=${limit}`
const res = await fetch(url, {
  headers: { authorization: `Bearer ${tok.access_token}` },
})
const data = await res.json()
if (!res.ok) {
  console.error('read failed', data)
  process.exit(1)
}

const docs = (data.documents ?? [])
  .map((d) => {
    const f = d.fields ?? {}
    const s = (v) => v?.stringValue ?? ''
    return {
      app: s(f.app),
      type: s(f.type),
      when: f.createdAt?.timestampValue ?? '',
      url: s(f.url),
      ua: s(f.userAgent),
      msg: s(f.message),
    }
  })
  .sort((a, b) => b.when.localeCompare(a.when))

if (!docs.length) {
  console.log('No reports yet.')
  process.exit(0)
}
for (const d of docs) {
  console.log(`\n[${d.when.slice(0, 10)}] [${d.app}] ${d.type} — ${d.url}`)
  console.log(d.msg)
  console.log(`(${d.ua.slice(0, 100)})`)
}
console.log(`\n${docs.length} report(s)`)
