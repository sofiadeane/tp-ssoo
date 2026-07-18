// Recolecta las notas al pie ({{f:TERMINO|explicación}}, ver richText.jsx)
// de TODOS los bloques de una página, numeradas por orden de aparición.
// Se llama una sola vez por página (ModulePage.jsx) — no es costoso: como
// mucho son unas pocas decenas de bloques de texto.
const FOOTNOTE_RE = /\{\{f:[^|{}]+\|([^{}]+)\}\}/g

function textsOf(block) {
  switch (block.type) {
    case 'p':
    case 'code':
      return [block.text || '']
    case 'ul':
    case 'ol':
      return block.items || []
    case 'callout':
      return [block.title || '', block.text || '']
    case 'table':
      return [...(block.headers || []), ...(block.rows || []).flat()]
    default:
      return []
  }
}

export function collectFootnotes(page) {
  const numberOf = new Map()
  const list = []

  for (const blocks of Object.values(page)) {
    for (const block of blocks || []) {
      for (const text of textsOf(block)) {
        FOOTNOTE_RE.lastIndex = 0
        let m
        while ((m = FOOTNOTE_RE.exec(text))) {
          const note = m[1].trim()
          if (!numberOf.has(note)) {
            numberOf.set(note, list.length + 1)
            list.push(note)
          }
        }
      }
    }
  }

  return { list, numberOf }
}
