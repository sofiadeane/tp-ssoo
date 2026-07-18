import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// HashRouter (no BrowserRouter): GitHub Pages no sabe reescribir rutas del
// lado del servidor, así que las rutas van después de "#" y el navegador
// nunca necesita pedirle al servidor una ruta que no existe como archivo.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
