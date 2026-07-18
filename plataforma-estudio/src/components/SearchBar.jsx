import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchContent } from '../content/searchIndex.js'
import { Icon } from './icons.jsx'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  const results = searchContent(query)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function goTo(entry) {
    navigate(`/${entry.moduleId}?section=${entry.sectionKey}`)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2.5">
        <Icon name="Search" className="h-4 w-4 text-muted shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          type="text"
          placeholder="Buscar un tema, concepto o sección…"
          className="bg-transparent outline-none text-sm text-text placeholder:text-muted w-full"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute mt-2 w-full glass-panel rounded-xl2 overflow-hidden z-30 shadow-2xl">
          {results.length === 0 ? (
            <p className="text-sm text-muted px-4 py-3">Sin resultados para "{query}".</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-border">
              {results.map((entry, i) => (
                <li key={i}>
                  <button
                    onClick={() => goTo(entry)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <p className="text-sm font-medium text-text">
                      {entry.moduleTitle}{' '}
                      <span className="text-muted font-normal">— {entry.sectionLabel}</span>
                    </p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{entry.text}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
