const POS_PREF = [
  'proper noun', 'noun', 'verb', 'adjective', 'adverb', 'pronoun',
  'preposition', 'conjunction', 'interjection', 'numeral', 'determiner',
  'contraction', 'phrase', 'initialism', 'abbreviation', 'acronym',
  'symbol', 'letter', 'particle',
]

const DEF_JUNK = /indicative of this usage|parser-output|font-size|\.mw-|display\s*:|visibility/

const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

interface WikiSection {
  partOfSpeech?: string
  definitions?: { definition?: string }[]
}

function pickWikiDef(json: Record<string, WikiSection[]>, lang: string, word: string): string | null {
  const native = json[lang] ?? []
  const rest = Object.entries(json)
    .filter(([k]) => k !== lang)
    .flatMap(([, v]) => v ?? [])
  const cands: { pos: string; txt: string }[] = []
  for (const s of [...native, ...rest])
    for (const d of s.definitions ?? []) {
      const txt = stripTags(d.definition ?? '')
      if (txt && txt.length < 160 && !DEF_JUNK.test(txt) && !txt.toLowerCase().includes(word.toLowerCase()))
        cands.push({ pos: (s.partOfSpeech ?? '').toLowerCase(), txt })
    }
  if (!cands.length) return null
  cands.sort((a, b) => {
    const rank = (p: string) => { const i = POS_PREF.indexOf(p); return i === -1 ? 50 : i }
    return rank(a.pos) - rank(b.pos)
  })
  const c = cands[0]
  return c.pos ? `(${c.pos}) ${c.txt}` : c.txt
}

async function wikiDef(lang: string, word: string): Promise<string | null> {
  const forms = [...new Set([word.toLowerCase(), word[0] + word.slice(1).toLowerCase()])]
  for (const form of forms) {
    try {
      const res = await fetch(
        `https://${lang}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(form)}`,
      )
      if (!res.ok) continue
      const def = pickWikiDef(await res.json(), lang, word)
      if (def) return def
    } catch {
      // offline / CORS — try next source
    }
  }
  return null
}

async function freeDictDef(word: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`)
    if (!res.ok) return null
    const data = await res.json()
    for (const e of data ?? [])
      for (const m of e.meanings ?? [])
        for (const d of m.definitions ?? [])
          if (d.definition && !d.definition.toLowerCase().includes(word.toLowerCase()))
            return `${m.partOfSpeech ? `(${m.partOfSpeech}) ` : ''}${d.definition.replace(/;$/, '')}`
  } catch {
    // fall through
  }
  return null
}

export async function fetchHint(lang: string, word: string): Promise<string | null> {
  if (lang !== 'en') {
    const native = await wikiDef(lang, word)
    if (native) return native
  }
  const en = await wikiDef('en', word)
  if (en) return en
  if (lang === 'en') return freeDictDef(word)
  return null
}
