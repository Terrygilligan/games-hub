const NEEDS_MANUAL_SAVE =
  /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (/Android/.test(navigator.userAgent) && /Firefox/.test(navigator.userAgent))

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  if (typeof anchor.download === 'string' && !NEEDS_MANUAL_SAVE) {
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return
  }

  // Fallback: iOS Safari / Firefox Android can't force-download blobs —
  // open in a new tab and tell the user how to save it manually.
  const opened = window.open(url, '_blank', 'noopener')
  window.alert(
    opened
      ? `Your browser opened "${filename}" instead of downloading it. ` +
          'Right-click (or tap and hold) the page and choose "Save As" to keep a copy.'
      : `Your browser blocked the download of "${filename}". ` +
          'Allow pop-ups for this site and try again.',
  )
  window.setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || 'document'
