import Callout from './Callout.jsx'
import { richText } from '../lib/richText.jsx'

// Renderiza un bloque de contenido pedagógico. Los datos de cada módulo
// (content/pages/*.js) son arrays de objetos { type, ... } — este es el
// ÚNICO lugar que sabe convertir eso en JSX. Si agregás un tipo de bloque
// nuevo, agregalo acá una sola vez y todos los módulos pueden usarlo.
//
// Tipos soportados: p, ul, ol, code, callout, table.
// Todo texto (menos `code`, que se muestra literal) pasa por richText() para
// soportar **negrita**, `código`, {{g:...}} (glosa) y {{f:...}} (nota al pie)
// — ver src/lib/richText.jsx.
export default function ContentBlock({ block, footnoteNumbers }) {
  const rt = (text) => richText(text, footnoteNumbers)

  switch (block.type) {
    case 'p':
      return <p className="text-muted leading-relaxed">{rt(block.text)}</p>

    case 'ul':
      return (
        <ul className="list-disc list-outside pl-5 space-y-1.5 text-muted leading-relaxed">
          {block.items.map((item, i) => (
            <li key={i}>{rt(item)}</li>
          ))}
        </ul>
      )

    case 'ol':
      return (
        <ol className="list-decimal list-outside pl-5 space-y-1.5 text-muted leading-relaxed">
          {block.items.map((item, i) => (
            <li key={i}>{rt(item)}</li>
          ))}
        </ol>
      )

    case 'code':
      return (
        <pre className="rounded-xl2 border border-border bg-black/40 p-4 overflow-x-auto text-sm">
          <code className="text-accent-green font-mono whitespace-pre">{block.text}</code>
        </pre>
      )

    case 'callout':
      return (
        <Callout tone={block.tone || 'info'} title={block.title && rt(block.title)}>
          {rt(block.text)}
        </Callout>
      )

    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl2 border border-border">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-panel">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-4 py-2.5 font-semibold text-text border-b border-border">
                    {rt(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-0 odd:bg-white/[0.02]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-muted align-top">
                      {rt(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    default:
      return null
  }
}
