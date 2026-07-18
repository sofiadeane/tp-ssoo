import { NavLink } from 'react-router-dom'
import { MODULES } from '../content/modules.js'
import { Icon } from './icons.jsx'

function NavItem({ to, icon, children, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors
         ${
           isActive
             ? 'bg-gradient-to-r from-accent-green/20 to-accent-purple/20 text-text border border-accent-green/30'
             : 'text-muted hover:text-text hover:bg-white/5'
         }`
      }
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      <span className="truncate">{children}</span>
    </NavLink>
  )
}

// onNavigate: se usa en mobile para cerrar el drawer al elegir un item.
export default function Sidebar({ onNavigate }) {
  return (
    <nav className="flex flex-col h-full gap-6 p-5">
      <div className="flex items-center gap-2.5 px-2 pt-1">
        <div className="h-9 w-9 rounded-xl2 bg-gradient-to-br from-accent-green to-accent-purple flex items-center justify-center text-black font-black text-sm">
          P&P
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-text leading-tight truncate">Plug &amp; Pray</p>
          <p className="text-xs text-muted leading-tight truncate">Plataforma de estudio</p>
        </div>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto pr-1">
        <NavItem to="/" icon="Home" onNavigate={onNavigate}>
          Inicio
        </NavItem>

        <p className="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted/70">
          Módulos
        </p>

        {MODULES.map((mod) => (
          <NavItem key={mod.id} to={`/${mod.id}`} icon={mod.icon} onNavigate={onNavigate}>
            {mod.title}
          </NavItem>
        ))}
      </div>
    </nav>
  )
}
