// Mini-markup usado dentro de cualquier `text`/`items`/`title` de un bloque
// de contenido (ver content/pages/*.js). No es Markdown genérico — son 4
// patrones puntuales, elegidos para que el contenido sea fácil de leer bajo
// presión sin agregar una librería de parsing:
//
//   **texto**                         -> negrita simple.
//   `texto`                           -> "chip" de código/instrucción — para
//                                        opcodes (SET, MOV_IN), nombres de
//                                        función, claves de config, etc.
//                                        Es lo que hace que las instrucciones
//                                        "salten a la vista" en vez de
//                                        mezclarse con la prosa.
//   {{g:TERMINO|explicación corta}}   -> TERMINO en negrita + "(en criollo:
//                                        explicación corta)" al lado, para
//                                        términos técnicos que se explican
//                                        en el momento.
//   {{f:TERMINO|explicación larga}}   -> TERMINO en negrita + nota al pie
//                                        numerada (para explicaciones que
//                                        cortarían el ritmo de la frase si
//                                        fueran inline). Ver lib/footnotes.js
//                                        para cómo se numeran.
const INLINE_RE =
  /\{\{f:([^|{}]+)\|([^{}]+)\}\}|\{\{g:([^|{}]+)\|([^{}]+)\}\}|`([^`]+)`|\*\*([^*]+)\*\*/g

export function richText(text, footnoteNumbers) {
  if (!text || typeof text !== 'string') return text
  if (!text.includes('{{') && !text.includes('`') && !text.includes('**')) return text

  const numberOf = footnoteNumbers || new Map()
  const nodes = []
  let lastIndex = 0
  let match
  let key = 0
  INLINE_RE.lastIndex = 0

  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const [full, fTerm, fExpl, gTerm, gExpl, code, bold] = match

    if (fTerm !== undefined) {
      const n = numberOf.get(fExpl.trim())
      nodes.push(
        <span key={key++}>
          <strong className="text-text font-semibold">{fTerm}</strong>
          {n && (
            <sup>
              <a
                href={`#fn-${n}`}
                id={`fnref-${n}`}
                className="text-accent-purple-light no-underline hover:underline ml-0.5"
              >
                [{n}]
              </a>
            </sup>
          )}
        </span>,
      )
    } else if (gTerm !== undefined) {
      nodes.push(
        <span key={key++}>
          <strong className="text-text font-semibold">{gTerm}</strong>{' '}
          <span className="text-muted italic text-[0.93em]">(en criollo: {gExpl.trim()})</span>
        </span>,
      )
    } else if (code !== undefined) {
      nodes.push(
        <code
          key={key++}
          className="inline-block px-1.5 py-[1px] rounded-md bg-accent-purple/15 border border-accent-purple/30 text-accent-green font-mono text-[0.9em] whitespace-nowrap align-baseline"
        >
          {code}
        </code>,
      )
    } else if (bold !== undefined) {
      nodes.push(
        <strong key={key++} className="text-text font-semibold">
          {bold}
        </strong>,
      )
    }
    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}
