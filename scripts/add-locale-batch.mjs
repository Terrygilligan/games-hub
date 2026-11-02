// One-shot locale insertion for fifteen + aim + daily keys.
// Same anchors as the manual edits: titles after the "connect-four" title
// line; game blocks inserted before the closing of the last block ("nav").
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/i18n/locales')

const D = {
  en: {
    titleAnchor:
      '      "connect-four": { "name": "Connect Four", "description": "Drop discs, connect four before the computer does." }',
    titles: `,
      "fifteen": { "name": "15 Puzzle", "description": "Slide the tiles into order — fewest moves wins." },
      "aim": { "name": "Aim Trainer", "description": "Hit as many targets as you can in 30 seconds." }`,
    block: `    "fifteen": {
      "moves": "Moves",
      "time": "Time",
      "best": "Best",
      "newGame": "New game",
      "instructions": "Slide the numbered tiles into order — tap a tile next to the gap, or use the arrow keys.",
      "tapToStart": "Tap to start",
      "hint": "Score = 1000 − (5 × moves) − seconds. Fewer, faster moves pay more.",
      "gameOver": "Solved!",
      "finalScore": "Final score",
      "newBest": "New personal best!",
      "playAgain": "Play again",
      "submitScore": "Submit score",
      "submitting": "Submitting…",
      "highScores": "High scores"
    },
    "aim": {
      "time": "Time",
      "hits": "Hits",
      "accuracy": "Accuracy",
      "best": "Best",
      "newGame": "New game",
      "instructions": "Tap each target as it appears — you have 30 seconds. Each hit scores 10 points.",
      "tapToStart": "Tap to start",
      "hint": "Steady beats fast — missed taps don't add points.",
      "gameOver": "Time's up!",
      "finalScore": "Final score",
      "newBest": "New personal best!",
      "playAgain": "Play again",
      "submitScore": "Submit score",
      "submitting": "Submitting…",
      "highScores": "High scores"
    },
    "daily": {
      "daily": "Daily",
      "hint": "Same puzzle for everyone today — separate daily leaderboard."
    },
    "nav": {`,
  },
  bg: {
    titleAnchor:
      '      "connect-four": { "name": "Свържи четири", "description": "Пускай дискове и свържи четири преди компютъра." }',
    titles: `,
      "fifteen": { "name": "Пъзел 15", "description": "Подреди плочките с най-малко ходове." },
      "aim": { "name": "Точен мерник", "description": "Улучи колкото можеш повече мишени за 30 секунди." }`,
    block: `    "fifteen": {
      "moves": "Ходове",
      "time": "Време",
      "best": "Рекорд",
      "newGame": "Нова игра",
      "instructions": "Плъзгай номерираните плочки в ред — натисни плочка до празното място или използвай стрелките.",
      "tapToStart": "Натисни за старт",
      "hint": "Точки = 1000 − (5 × ходове) − секунди. По-малко и по-бързи ходове носят повече.",
      "gameOver": "Подредено!",
      "finalScore": "Краен резултат",
      "newBest": "Нов личен рекорд!",
      "playAgain": "Играй отново",
      "submitScore": "Изпрати резултат",
      "submitting": "Изпращане…",
      "highScores": "Класация"
    },
    "aim": {
      "time": "Време",
      "hits": "Попадения",
      "accuracy": "Точност",
      "best": "Рекорд",
      "newGame": "Нова игра",
      "instructions": "Натискай всяка мишена, щом се появи — имаш 30 секунди. Всяко попадение носи 10 точки.",
      "tapToStart": "Натисни за старт",
      "hint": "Стабилността бие скоростта — пропуснатите удари не носят точки.",
      "gameOver": "Времето изтече!",
      "finalScore": "Краен резултат",
      "newBest": "Нов личен рекорд!",
      "playAgain": "Играй отново",
      "submitScore": "Изпрати резултат",
      "submitting": "Изпращане…",
      "highScores": "Класация"
    },
    "daily": {
      "daily": "Дневно",
      "hint": "Същият пъзел за всички днес — отделна дневна класация."
    },
    "nav": {`,
  },
  de: {
    titleAnchor:
      '      "connect-four": { "name": "Vier gewinnt", "description": "Wirf Steine ein und verbinde vier, bevor es der Computer tut." }',
    titles: `,
      "fifteen": { "name": "15-Puzzle", "description": "Schiebe die Kacheln in die richtige Reihenfolge — wenigste Züge gewinnen." },
      "aim": { "name": "Zieltrainer", "description": "Triff in 30 Sekunden so viele Ziele wie möglich." }`,
    block: `    "fifteen": {
      "moves": "Züge",
      "time": "Zeit",
      "best": "Rekord",
      "newGame": "Neues Spiel",
      "instructions": "Schiebe die nummerierten Kacheln in die richtige Reihenfolge — tippe eine Kachel neben der Lücke an oder nutze die Pfeiltasten.",
      "tapToStart": "Tippen zum Starten",
      "hint": "Punkte = 1000 − (5 × Züge) − Sekunden. Weniger, schnellere Züge zahlen mehr.",
      "gameOver": "Gelöst!",
      "finalScore": "Endstand",
      "newBest": "Neuer persönlicher Rekord!",
      "playAgain": "Nochmal spielen",
      "submitScore": "Punktestand einreichen",
      "submitting": "Wird eingereicht…",
      "highScores": "Bestenliste"
    },
    "aim": {
      "time": "Zeit",
      "hits": "Treffer",
      "accuracy": "Genauigkeit",
      "best": "Rekord",
      "newGame": "Neues Spiel",
      "instructions": "Tippe jedes Ziel an, sobald es erscheint — du hast 30 Sekunden. Jeder Treffer gibt 10 Punkte.",
      "tapToStart": "Tippen zum Starten",
      "hint": "Ruhig schlägt schnell — Fehltipps geben keine Punkte.",
      "gameOver": "Zeit um!",
      "finalScore": "Endstand",
      "newBest": "Neuer persönlicher Rekord!",
      "playAgain": "Nochmal spielen",
      "submitScore": "Punktestand einreichen",
      "submitting": "Wird eingereicht…",
      "highScores": "Bestenliste"
    },
    "daily": {
      "daily": "Täglich",
      "hint": "Gleiches Puzzle für alle heute — eigene Tages-Bestenliste."
    },
    "nav": {`,
  },
  es: {
    titleAnchor:
      '      "connect-four": { "name": "Conecta cuatro", "description": "Suelta fichas y conecta cuatro antes que la máquina." }',
    titles: `,
      "fifteen": { "name": "Puzle 15", "description": "Ordena las fichas con el menor número de jugadas." },
      "aim": { "name": "Puntería", "description": "Acierta tantos objetivos como puedas en 30 segundos." }`,
    block: `    "fifteen": {
      "moves": "Jugadas",
      "time": "Tiempo",
      "best": "Récord",
      "newGame": "Nueva partida",
      "instructions": "Desliza las fichas numeradas hasta ordenarlas — toca una ficha junto al hueco o usa las flechas.",
      "tapToStart": "Toca para empezar",
      "hint": "Puntos = 1000 − (5 × jugadas) − segundos. Menos jugadas y más rapidez pagan más.",
      "gameOver": "¡Resuelto!",
      "finalScore": "Puntuación final",
      "newBest": "¡Nuevo récord personal!",
      "playAgain": "Jugar de nuevo",
      "submitScore": "Enviar puntuación",
      "submitting": "Enviando…",
      "highScores": "Clasificación"
    },
    "aim": {
      "time": "Tiempo",
      "hits": "Aciertos",
      "accuracy": "Precisión",
      "best": "Récord",
      "newGame": "Nueva partida",
      "instructions": "Toca cada objetivo en cuanto aparezca — tienes 30 segundos. Cada acierto da 10 puntos.",
      "tapToStart": "Toca para empezar",
      "hint": "La firmeza gana a la velocidad — los fallos no dan puntos.",
      "gameOver": "¡Se acabó el tiempo!",
      "finalScore": "Puntuación final",
      "newBest": "¡Nuevo récord personal!",
      "playAgain": "Jugar de nuevo",
      "submitScore": "Enviar puntuación",
      "submitting": "Enviando…",
      "highScores": "Clasificación"
    },
    "daily": {
      "daily": "Diario",
      "hint": "El mismo puzle para todos hoy — clasificación diaria aparte."
    },
    "nav": {`,
  },
  fr: {
    titleAnchor:
      '      "connect-four": { "name": "Puissance 4", "description": "Lâche tes jetons et aligne quatre avant l\'ordinateur." }',
    titles: `,
      "fifteen": { "name": "Taquin", "description": "Remets les tuiles dans l'ordre en un minimum de coups." },
      "aim": { "name": "Tir de précision", "description": "Touche un maximum de cibles en 30 secondes." }`,
    block: `    "fifteen": {
      "moves": "Coups",
      "time": "Temps",
      "best": "Record",
      "newGame": "Nouvelle partie",
      "instructions": "Glisse les tuiles numérotées dans l'ordre — tape une tuile à côté du trou ou utilise les flèches.",
      "tapToStart": "Tape pour commencer",
      "hint": "Score = 1000 − (5 × coups) − secondes. Moins de coups et plus de vitesse rapportent plus.",
      "gameOver": "Résolu !",
      "finalScore": "Score final",
      "newBest": "Nouveau record personnel !",
      "playAgain": "Rejouer",
      "submitScore": "Envoyer le score",
      "submitting": "Envoi…",
      "highScores": "Classement"
    },
    "aim": {
      "time": "Temps",
      "hits": "Touches",
      "accuracy": "Précision",
      "best": "Record",
      "newGame": "Nouvelle partie",
      "instructions": "Tape chaque cible dès qu'elle apparaît — tu as 30 secondes. Chaque touche rapporte 10 points.",
      "tapToStart": "Tape pour commencer",
      "hint": "La régularité bat la vitesse — les clics manqués ne rapportent rien.",
      "gameOver": "Temps écoulé !",
      "finalScore": "Score final",
      "newBest": "Nouveau record personnel !",
      "playAgain": "Rejouer",
      "submitScore": "Envoyer le score",
      "submitting": "Envoi…",
      "highScores": "Classement"
    },
    "daily": {
      "daily": "Quotidien",
      "hint": "Le même puzzle pour tout le monde aujourd'hui — classement quotidien à part."
    },
    "nav": {`,
  },
  nl: {
    titleAnchor:
      '      "connect-four": { "name": "Vier op een rij", "description": "Laat schijven vallen en maak vier op een rij vóór de computer." }',
    titles: `,
      "fifteen": { "name": "Schuifpuzzel", "description": "Schuif de tegels in volgorde — zo min mogelijk zetten." },
      "aim": { "name": "Doeltrainer", "description": "Raak zoveel mogelijk doelen in 30 seconden." }`,
    block: `    "fifteen": {
      "moves": "Zetten",
      "time": "Tijd",
      "best": "Beste",
      "newGame": "Nieuw spel",
      "instructions": "Schuif de genummerde tegels in volgorde — tik een tegel naast de leegte of gebruik de pijltjes.",
      "tapToStart": "Tik om te starten",
      "hint": "Score = 1000 − (5 × zetten) − seconden. Minder en snellere zetten betalen meer.",
      "gameOver": "Opgelost!",
      "finalScore": "Eindscore",
      "newBest": "Nieuw persoonlijk record!",
      "playAgain": "Opnieuw spelen",
      "submitScore": "Score indienen",
      "submitting": "Indienen…",
      "highScores": "Ranglijst"
    },
    "aim": {
      "time": "Tijd",
      "hits": "Raken",
      "accuracy": "Nauwkeurigheid",
      "best": "Beste",
      "newGame": "Nieuw spel",
      "instructions": "Tik elk doel aan zodra het verschijnt — je hebt 30 seconden. Elke treffer levert 10 punten.",
      "tapToStart": "Tik om te starten",
      "hint": "Rustig verslaat snel — mistikken leveren niets op.",
      "gameOver": "Tijd voorbij!",
      "finalScore": "Eindscore",
      "newBest": "Nieuw persoonlijk record!",
      "playAgain": "Opnieuw spelen",
      "submitScore": "Score indienen",
      "submitting": "Indienen…",
      "highScores": "Ranglijst"
    },
    "daily": {
      "daily": "Dagelijks",
      "hint": "Vandaag dezelfde puzzel voor iedereen — aparte dagranglijst."
    },
    "nav": {`,
  },
}

const NAV_ANCHOR = '    },\n    "nav": {'
let ok = 0
for (const [lang, d] of Object.entries(D)) {
  const path = join(dir, `${lang}.json`)
  let text = readFileSync(path, 'utf8')
  if (!text.includes(d.titleAnchor)) {
    console.error(`${lang}: title anchor not found`)
    continue
  }
  if (text.split(NAV_ANCHOR).length !== 2) {
    console.error(`${lang}: nav anchor not unique`)
    continue
  }
  text = text.replace(d.titleAnchor, d.titleAnchor + d.titles)
  text = text.replace(NAV_ANCHOR, `    },\n${d.block}`)
  writeFileSync(path, text)
  console.log(`${lang}: inserted titles + fifteen/aim/daily blocks`)
  ok++
}
console.log(`done — ${ok}/6 locales updated`)
