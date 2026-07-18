# TP SSOO — Plug & Pray: informes de defensa + plataforma de estudio

Este repo contiene el material de estudio para defender el TP de Sistemas Operativos "Plug & Pray"
(UTN FRBA, cátedra R2D2). El código fuente del TP en sí vive en el repo del grupo
(`sisoputnfrba/tp-2026-1c-R2D2`); acá solo está la documentación derivada y la plataforma web para
repasarla.

## Contenido

- **[`informes/`](./informes)** — 12 informes técnicos (uno por módulo: CPU, Kernel Scheduler,
  Kernel Memory, IO, Swap, Memory Stick, comunicaciones, sincronización, etc.), un banco de quizzes,
  la guía de despliegue de la cátedra, y las guías de estilo/contenido usadas para generar el sitio.
- **[`plataforma-estudio/`](./plataforma-estudio)** — sitio estático (React + Vite) que reorganiza
  esos informes en páginas de estudio con quiz interactivo, buscador y botón de descarga del markdown
  original. Sin backend, pensado para GitHub Pages. Ver
  [`plataforma-estudio/README.md`](./plataforma-estudio/README.md) para instrucciones de desarrollo y
  [`plataforma-estudio/DECISIONS.md`](./plataforma-estudio/DECISIONS.md) para las decisiones de
  arquitectura.

## Publicar el sitio en GitHub Pages

1. En este repo: **Settings → Pages → Build and deployment → Source** → elegí **"GitHub Actions"**.
2. El workflow en `.github/workflows/deploy-plataforma-estudio.yml` buildea y publica
   automáticamente en cada push a `main` que toque `plataforma-estudio/`.
