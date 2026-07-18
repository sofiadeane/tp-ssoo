import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' hace que los assets se referencien con rutas relativas, para que
// el build funcione en GitHub Pages sin importar bajo qué subpath se sirva
// (project page, user page, o previsualización local) sin tocar este archivo.
export default defineConfig({
  plugins: [react()],
  base: './',
})
