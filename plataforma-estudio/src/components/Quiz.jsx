import { useState } from 'react'
import { QUIZZES } from '../content/quizzes.js'
import { Icon } from './icons.jsx'
import Card from './Card.jsx'

function QuizQuestion({ index, question }) {
  const [selected, setSelected] = useState(null)
  const answered = selected !== null

  return (
    <Card className="space-y-4">
      <p className="font-semibold text-text leading-snug">
        <span className="text-accent-purple-light">{index + 1}.</span> {question.question}
      </p>

      <div className="space-y-2.5">
        {question.options.map((opt, i) => {
          const isSelected = selected === i
          const showState = answered
          const stateClasses = !showState
            ? 'border-border hover:border-accent-purple/50 hover:bg-white/[0.03]'
            : opt.correct
              ? 'border-accent-green/60 bg-accent-green/10'
              : isSelected
                ? 'border-danger/60 bg-danger/10'
                : 'border-border opacity-60'

          return (
            <div key={i}>
              <button
                type="button"
                disabled={answered}
                onClick={() => setSelected(i)}
                className={`w-full text-left rounded-xl2 border px-4 py-3 text-sm transition-colors flex items-start gap-3
                  ${stateClasses} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {showState && (
                  <Icon
                    name={opt.correct ? 'CheckCircle2' : isSelected ? 'XCircle' : 'Info'}
                    className={`h-4 w-4 mt-0.5 shrink-0 ${
                      opt.correct ? 'text-accent-green' : isSelected ? 'text-danger' : 'text-muted'
                    }`}
                  />
                )}
                <span className={showState && !opt.correct && !isSelected ? 'text-muted' : 'text-text'}>
                  {opt.text}
                </span>
              </button>

              {showState && (isSelected || opt.correct) && (
                <p className="text-xs text-muted leading-relaxed mt-1.5 ml-4 pl-3 border-l-2 border-border">
                  {opt.explanation}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function Quiz({ quizId }) {
  const quiz = QUIZZES[quizId]
  if (!quiz) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon name="Sparkles" className="h-5 w-5 text-accent-purple-light" />
        <h3 className="text-lg font-bold text-text">{quiz.title}</h3>
      </div>
      <p className="text-sm text-muted -mt-2">
        Elegí una opción por pregunta. Vas a ver al toque si es correcta y por qué las demás no lo son.
      </p>
      <div className="space-y-4">
        {quiz.questions.map((q, i) => (
          <QuizQuestion key={i} index={i} question={q} />
        ))}
      </div>
    </div>
  )
}
