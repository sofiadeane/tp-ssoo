// Contenedor genérico "glass panel" — la unidad visual base de todo el sitio,
// según informes/look-and-feel.md (tarjetas con esquinas redondeadas,
// bordes suaves, glassmorphism).
export default function Card({ children, className = '', accent }) {
  const accentBorder =
    accent === 'green'
      ? 'hover:border-accent-green/40'
      : accent === 'purple'
        ? 'hover:border-accent-purple/40'
        : ''

  return (
    <div
      className={`glass-panel rounded-xl2 p-5 sm:p-6 transition-colors ${accentBorder} ${className}`}
    >
      {children}
    </div>
  )
}
