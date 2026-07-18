import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './components/Home.jsx'
import ModulePage from './components/ModulePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/:moduleId" element={<ModulePage />} />
      </Route>
    </Routes>
  )
}
