import { MODULES } from './modules.js'
import { PAGES } from './pages/index.js'

const SECTION_LABELS = {
  intro: 'Introducción',
  concepts: 'Conceptos principales',
  howItWorks: 'Cómo funciona',
  stepByStep: 'Flujo paso a paso',
  details: 'Detalles importantes',
  commonErrors: 'Errores comunes',
  summary: 'Resumen',
}

function blockText(block) {
  switch (block.type) {
    case 'p':
      return block.text || ''
    case 'ul':
    case 'ol':
      return (block.items || []).join(' — ')
    case 'code':
      return block.text || ''
    case 'callout':
      return `${block.title || ''} ${block.text || ''}`
    case 'table':
      return [(block.headers || []).join(' '), ...(block.rows || []).map((r) => r.join(' '))].join(' ')
    default:
      return ''
  }
}

// Índice plano en memoria: un entry por bloque de contenido con texto.
// Se recalcula una sola vez al cargar el módulo (no hay build step de
// indexado ni dependencias externas de búsqueda — alcanza para ~13 páginas).
export const SEARCH_INDEX = MODULES.flatMap((mod) => {
  const page = PAGES[mod.id]
  if (!page) return []

  return Object.entries(SECTION_LABELS).flatMap(([key, label]) => {
    const blocks = page[key] || []
    return blocks
      .map((block) => ({
        moduleId: mod.id,
        moduleTitle: mod.title,
        sectionKey: key,
        sectionLabel: label,
        text: blockText(block),
      }))
      .filter((entry) => entry.text && entry.text.trim().length > 0)
  })
})

export function searchContent(query) {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return SEARCH_INDEX.filter(
    (entry) =>
      entry.text.toLowerCase().includes(q) ||
      entry.moduleTitle.toLowerCase().includes(q) ||
      entry.sectionLabel.toLowerCase().includes(q),
  ).slice(0, 12)
}
