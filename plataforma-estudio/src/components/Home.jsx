import { Link } from 'react-router-dom'
import { MODULES } from '../content/modules.js'
import { QUIZZES } from '../content/quizzes.js'
import Card from './Card.jsx'
import { Icon } from './icons.jsx'

const totalQuizzes = Object.keys(QUIZZES).length
const totalQuestions = Object.values(QUIZZES).reduce((acc, q) => acc + q.questions.length, 0)

const STATS = [
  { label: 'Módulos para estudiar', value: MODULES.length, accent: 'green' },
  { label: 'Quizzes disponibles', value: totalQuizzes, accent: 'purple' },
  { label: 'Preguntas totales', value: totalQuestions, accent: 'green' },
]

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-16">
      <Card className="bg-gradient-to-br from-accent-green/10 via-panel to-accent-purple/10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-green mb-3">
          TP Sistemas Operativos · Grupo R2D2
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Plataforma de estudio — Plug &amp; Pray
        </h1>
        <p className="text-muted text-base max-w-2xl leading-relaxed mb-6">
          Repasá cada módulo del TP con contenido reorganizado para aprender rápido: conceptos,
          flujo paso a paso, errores comunes y un quiz para autoevaluarte. Toda la información sale
          de los informes técnicos del proyecto — podés descargar el original en cada página.
        </p>
        <Link
          to="/mapa-general"
          className="inline-flex items-center gap-2 rounded-full bg-accent-green text-black font-semibold text-sm px-5 py-2.5 hover:brightness-95 transition"
        >
          Empezar por el Mapa General
          <Icon name="ChevronRight" className="h-4 w-4" />
        </Link>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATS.map((s) => (
          <Card key={s.label}>
            <p
              className={`text-3xl font-extrabold ${
                s.accent === 'green' ? 'text-accent-green' : 'text-accent-purple-light'
              }`}
            >
              {s.value}
            </p>
            <p className="text-sm text-muted mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Todos los módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((mod) => (
            <Link key={mod.id} to={`/${mod.id}`}>
              <Card className="h-full hover:border-accent-purple/40 group" accent="purple">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-9 w-9 rounded-xl2 bg-white/5 flex items-center justify-center group-hover:bg-accent-purple/20 transition-colors">
                    <Icon name={mod.icon} className="h-4.5 w-4.5 text-accent-purple-light" />
                  </div>
                  <p className="font-semibold text-text">{mod.title}</p>
                </div>
                <p className="text-sm text-muted leading-relaxed">{mod.tagline}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
