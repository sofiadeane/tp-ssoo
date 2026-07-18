// Mapa centralizado de nombre-de-ícono (string, usado en content/modules.js)
// a componente de lucide-react. Si agregás un módulo con un ícono nuevo,
// importalo acá una sola vez.
import {
  Home,
  Map,
  Rocket,
  Radio,
  Lock,
  Cpu,
  ListOrdered,
  Database,
  Usb,
  HardDrive,
  CircuitBoard,
  Layers,
  BookOpen,
  Search,
  Menu,
  X,
  Download,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'

export const ICONS = {
  Home,
  Map,
  Rocket,
  Radio,
  Lock,
  Cpu,
  ListOrdered,
  Database,
  Usb,
  HardDrive,
  CircuitBoard,
  Layers,
  BookOpen,
  Search,
  Menu,
  X,
  Download,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
  Sparkles,
}

export function Icon({ name, className }) {
  const Cmp = ICONS[name] || Info
  return <Cmp className={className} strokeWidth={1.75} />
}
