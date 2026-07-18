import { Icon } from './icons.jsx'

// Descarga el .md original tal cual está en public/informes/ — sin
// convertirlo, sin modificarlo. `import.meta.env.BASE_URL` respeta el base
// path configurado en vite.config.js (relativo, para que funcione en
// cualquier subpath de GitHub Pages).
export default function DownloadButton({ fileName }) {
  if (!fileName) return null
  const href = `${import.meta.env.BASE_URL}informes/${fileName}`

  return (
    <a
      href={href}
      download={fileName}
      className="inline-flex items-center gap-2 rounded-full bg-black/60 hover:bg-black/80 border border-border
                 text-text text-sm font-medium px-5 py-2.5 transition-colors"
    >
      <Icon name="Download" className="h-4 w-4 text-accent-green" />
      Descargar Markdown Original
    </a>
  )
}
