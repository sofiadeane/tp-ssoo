# Plataforma de estudio — Plug & Pray

Sitio estático (sin backend, sin auth, sin analytics) para repasar el TP de Sistemas Operativos
"Plug & Pray". Cada módulo tiene contenido reorganizado para aprender rápido, un quiz (cuando hay
banco de preguntas disponible) y un botón para descargar el informe técnico original.

Ver [`DECISIONS.md`](./DECISIONS.md) para el porqué de cada decisión de arquitectura.

## Requisitos

- Node.js 18 o superior.

## Desarrollo local

```bash
cd plataforma-estudio
npm install
npm run dev
```

Abre el link que imprime Vite (por defecto `http://localhost:5173`).

## Build de producción

```bash
npm run build
```

Genera la carpeta `dist/` con el sitio listo para servir de forma estática. Podés previsualizarlo
localmente con:

```bash
npm run preview
```

## Estructura del proyecto

```
plataforma-estudio/
├── public/
│   └── informes/          # copias exactas de los .md originales (botón de descarga)
├── src/
│   ├── content/
│   │   ├── modules.js      # registro central: sidebar, rutas, quiz asociado por módulo
│   │   ├── quizzes.js       # banco de preguntas (transcripto de informes/quizes.md)
│   │   ├── searchIndex.js   # índice plano para el buscador
│   │   └── pages/           # un archivo de datos por módulo (contenido pedagógico)
│   ├── components/          # Layout, Sidebar, ModulePage, Quiz, ContentBlock, etc.
│   └── App.jsx / main.jsx   # routing (HashRouter) y punto de entrada
└── DECISIONS.md
```

### Agregar un módulo nuevo

1. Copiá el `.md` fuente a `public/informes/`.
2. Creá `src/content/pages/mi-modulo.js` (usá `io.js` como plantilla del esquema de bloques).
3. Agregalo al mapa de `src/content/pages/index.js`.
4. Agregá una entrada en `src/content/modules.js` (título, ícono, archivo, quiz si corresponde).

No hace falta tocar ningún componente — el sidebar, las rutas y el buscador se generan solos a
partir de esos dos archivos.

### Agregar un quiz nuevo

Agregá una key nueva en `src/content/quizzes.js` siguiendo el mismo esquema (`title` + `questions`,
cada pregunta con `question` y `options` con `{text, correct, explanation}`), y referenciá esa key
como `quizId` en la entrada correspondiente de `modules.js`.

## Despliegue a GitHub Pages

El repo incluye un workflow de GitHub Actions en `.github/workflows/deploy-plataforma-estudio.yml`
que buildea y publica automáticamente en cada push a `main` que modifique algo dentro de
`plataforma-estudio/`.

**Activación (una sola vez):**

1. En GitHub: **Settings → Pages → Build and deployment → Source** → elegí **"GitHub Actions"**.
2. Hacé push de un cambio dentro de `plataforma-estudio/` a `main` (o corré el workflow manualmente
   desde la pestaña Actions con "Run workflow").
3. El sitio queda publicado en `https://<usuario-u-org>.github.io/<nombre-del-repo>/`.

No hace falta configurar nada de `base` en `vite.config.js` — ya está seteado como ruta relativa
(`base: './'`), así que funciona en cualquier subpath sin tocar código.

### Deploy manual (alternativa sin Actions)

Si preferís no usar el workflow, podés buildear localmente y publicar el contenido de `dist/` con
cualquier método de tu preferencia (`gh-pages` CLI, subir a una carpeta `docs/`, etc.) — el build es
100% estático, no requiere ningún proceso corriendo del lado del servidor.
