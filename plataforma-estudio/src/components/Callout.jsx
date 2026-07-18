import { Icon } from './icons.jsx'

const TONES = {
  info: {
    icon: 'Info',
    border: 'border-accent-purple/40',
    iconColor: 'text-accent-purple-light',
    bg: 'bg-accent-purple/10',
  },
  warning: {
    icon: 'AlertTriangle',
    border: 'border-danger/40',
    iconColor: 'text-danger',
    bg: 'bg-danger/10',
  },
  success: {
    icon: 'CheckCircle2',
    border: 'border-accent-green/40',
    iconColor: 'text-accent-green',
    bg: 'bg-accent-green/10',
  },
}

// Caja destacada usada para "Detalles importantes" (info) y "Errores
// comunes" (warning). `success` queda disponible para resúmenes/logros.
export default function Callout({ tone = 'info', title, children }) {
  const t = TONES[tone] || TONES.info
  return (
    <div className={`rounded-xl2 border ${t.border} ${t.bg} p-4 sm:p-5 flex gap-3`}>
      <Icon name={t.icon} className={`h-5 w-5 shrink-0 mt-0.5 ${t.iconColor}`} />
      <div className="min-w-0">
        {title && <p className="font-semibold text-text mb-1">{title}</p>}
        <div className="text-sm text-muted leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
