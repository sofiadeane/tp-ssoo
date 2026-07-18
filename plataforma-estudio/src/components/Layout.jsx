import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import SearchBar from './SearchBar.jsx'
import { Icon } from './icons.jsx'

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  // Cerrar el drawer mobile y volver arriba al cambiar de página. Si la
  // navegación trae un ?section=, es el buscador pidiendo un scroll a un
  // bloque puntual (ver ModulePage.jsx) — no lo pisamos con el scroll a
  // top, que corre primero por ser el efecto del padre.
  useEffect(() => {
    setMobileOpen(false)
    if (!new URLSearchParams(location.search).get('section')) {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.search])

  return (
    <div className="min-h-screen bg-bg text-text flex">
      {/* Sidebar desktop: fija y siempre visible */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-panel/60">
        <Sidebar />
      </aside>

      {/* Sidebar mobile: drawer + overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-panel border-r border-border shadow-2xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 md:ml-72 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-bg/85 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 px-4 sm:px-8 py-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-text"
              aria-label="Abrir menú"
            >
              <Icon name="Menu" className="h-5 w-5" />
            </button>
            <SearchBar />
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
