import { useEffect } from 'react'
import { useParams, useSearchParams, Navigate, Link } from 'react-router-dom'
import { getModule } from '../content/modules.js'
import { PAGES } from '../content/pages/index.js'
import ContentBlock from './ContentBlock.jsx'
import DownloadButton from './DownloadButton.jsx'
import Quiz from './Quiz.jsx'
import Callout from './Callout.jsx'
import Card from './Card.jsx'
import { Icon } from './icons.jsx'

// Orden fijo del flujo pedagógico pedido: Intro → Conceptos → Cómo funciona
// → Flujo paso a paso → Detalles → Errores comunes → Resumen. Una sección se
// omite si el módulo no cargó contenido para ella (array vacío o ausente).
const SECTIONS = [
  { key: 'intro', label: 'Introducción' },
  { key: 'concepts', label: 'Conceptos principales' },
  { key: 'howItWorks', label: 'Cómo funciona' },
  { key: 'stepByStep', label: 'Flujo paso a paso' },
  { key: 'details', label: 'Detalles importantes' },
  { key: 'commonErrors', label: 'Errores comunes' },
  { key: 'summary', label: 'Resumen' },
]

export default function ModulePage() {
  const { moduleId } = useParams()
  const [searchParams] = useSearchParams()
  const mod = getModule(moduleId)
  const page = PAGES[moduleId]

  // Soporta el deep-link del buscador (?section=details) haciendo scroll
  // hasta el bloque correspondiente una vez que la página está montada.
  useEffect(() => {
    const section = searchParams.get('section')
    if (!section) return
    const el = document.getElementById(section)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [searchParams, moduleId])

  if (!mod || !page) return <Navigate to="/" replace />

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">{mod.title}</h1>
        <p className="text-muted text-base">{mod.tagline}</p>
      </header>

      {SECTIONS.map(({ key, label }) => {
        const blocks = page[key]
        if (!blocks || blocks.length === 0) return null
        return (
          <section key={key} className="space-y-3" id={key}>
            <h2 className="text-xl font-bold text-text flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
              {label}
            </h2>
            <div className="space-y-3">
              {blocks.map((block, i) => (
                <ContentBlock key={i} block={block} />
              ))}
            </div>
          </section>
        )
      })}

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-text flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-purple-light" />
          Quiz
        </h2>

        {mod.quizId && <Quiz key={mod.id} quizId={mod.quizId} />}

        {!mod.quizId && mod.relatedQuiz && (
          <Card>
            <Callout tone="info" title="No hay quiz específico para este tema">
              <p className="mb-3">{mod.relatedQuiz.note}</p>
              <Link
                to={`/${mod.relatedQuiz.moduleId}`}
                className="inline-flex items-center gap-1.5 text-accent-purple-light font-medium hover:underline"
              >
                Ir al quiz relacionado
                <Icon name="ChevronRight" className="h-4 w-4" />
              </Link>
            </Callout>
          </Card>
        )}

        {!mod.quizId && !mod.relatedQuiz && (
          <p className="text-sm text-muted">Este tema es de referencia operativa y no tiene quiz asociado.</p>
        )}
      </section>

      <div className="pt-2 border-t border-border">
        <p className="text-sm text-muted mb-3 mt-6">
          ¿Preferís leer el informe técnico original tal como lo usan en la defensa?
        </p>
        <DownloadButton fileName={mod.sourceFile} />
      </div>
    </div>
  )
}
