// Registro central de módulos del sitio.
//
// Esta es la ÚNICA fuente de verdad para: sidebar, rutas, título de cada
// página, qué archivo .md original se descarga, y qué quiz (si existe) se
// muestra al final. Agregar un módulo nuevo = agregar una entrada acá +
// crear su archivo en content/pages/. No hay que tocar componentes.
//
// Campos:
// - id: usado en la URL (#/{id}) y como key en todos lados.
// - title: texto mostrado en el sidebar y como <h1> de la página.
// - shortLabel: texto corto para el sidebar si title es muy largo (opcional).
// - icon: nombre de un ícono de lucide-react (ver src/components/Sidebar.jsx).
// - sourceFile: nombre del .md original en public/informes/, para el botón
//   de descarga. `null` si la página no tiene un .md 1:1 (ninguna lo es hoy,
//   pero se deja previsto).
// - quizId: key en content/quizzes.js. `null` si el tema no tiene banco de
//   preguntas propio en quizes.md.
// - relatedQuiz: { moduleId, note } — solo se usa cuando quizId es null, para
//   mostrar "no hay quiz específico acá, pero podés repasar con el de X".
//   OJO: moduleId tiene que ser un `id` de este mismo array (es a dónde
//   navega el link), no la key de content/quizzes.js — pueden diferir (ej.
//   el módulo 'mapa-general' usa el quiz 'arquitectura-general').

export const MODULES = [
  {
    id: 'mapa-general',
    title: 'Mapa General',
    icon: 'Map',
    sourceFile: '01-mapa-rapido.md',
    quizId: 'arquitectura-general',
    relatedQuiz: null,
    tagline: 'Arquitectura del sistema y flujo de una instrucción de punta a punta.',
  },
  {
    id: 'guia-despliegue',
    title: 'Guía de despliegue',
    icon: 'Rocket',
    sourceFile: '00-guia-despliegue.md',
    quizId: null,
    relatedQuiz: null,
    tagline: 'Cómo levantar los 6 módulos y correr cada prueba de la cátedra.',
  },
  {
    id: 'comunicacion',
    title: 'Comunicación',
    icon: 'Radio',
    sourceFile: '02-comunicaciones.md',
    quizId: null,
    relatedQuiz: {
      moduleId: 'resumen-proyecto',
      note: 'No hay un banco de preguntas específico de Comunicación, pero el quiz de Escenarios Integradores del Resumen del Proyecto toca directamente la comunicación entre módulos por sockets.',
    },
    tagline: 'Protocolo de paquetes, sockets, handshakes.',
  },
  {
    id: 'sincronizacion',
    title: 'Sincronización',
    icon: 'Lock',
    sourceFile: '03-semaforos-sincronizacion.md',
    quizId: null,
    relatedQuiz: {
      moduleId: 'kernel-scheduler',
      note: 'No hay un banco de preguntas específico de Sincronización, pero el quiz de Kernel Scheduler incluye la pregunta clave sobre Herencia de Prioridades.',
    },
    tagline: 'Mutex, semáforos, herencia de prioridad y el deadlock histórico.',
  },
  {
    id: 'cpu',
    title: 'CPU',
    icon: 'Cpu',
    sourceFile: '04-cpu.md',
    quizId: 'cpu',
    relatedQuiz: null,
    tagline: 'Ciclo de instrucción, traducción de direcciones, interrupciones.',
  },
  {
    id: 'kernel-scheduler',
    title: 'Kernel Scheduler',
    icon: 'ListOrdered',
    sourceFile: '05-kernel-scheduler.md',
    quizId: 'kernel-scheduler',
    relatedQuiz: null,
    tagline: 'Los 3 niveles de planificación, algoritmos, compactación.',
  },
  {
    id: 'kernel-memory',
    title: 'Kernel Memory',
    icon: 'Database',
    sourceFile: '06-kernel-memory.md',
    quizId: 'memoria',
    relatedQuiz: null,
    tagline: 'Segmentación (no paginación), huecos, compactación, swap.',
  },
  {
    id: 'io',
    title: 'IO',
    icon: 'Usb',
    sourceFile: '07-io.md',
    quizId: 'io',
    relatedQuiz: null,
    tagline: 'Dispositivo genérico, protocolo STDIN/STDOUT/SLEEP.',
  },
  {
    id: 'swap',
    title: 'Swap',
    icon: 'HardDrive',
    sourceFile: '08-swap.md',
    quizId: 'swap',
    relatedQuiz: null,
    tagline: 'Simulador de bloques en disco para procesos suspendidos.',
  },
  {
    id: 'memory-stick',
    title: 'Memory Stick',
    icon: 'CircuitBoard',
    sourceFile: '09-memory-stick.md',
    quizId: null,
    relatedQuiz: {
      moduleId: 'mapa-general',
      note: 'No hay un banco de preguntas específico de Memory Stick, pero el quiz de Arquitectura General (en Mapa General) incluye la pregunta sobre qué módulo representa el hardware de almacenamiento principal.',
    },
    tagline: 'Memoria física pura (no es un filesystem) — las 4 instancias ms1-ms4.',
  },
  {
    id: 'otras-estructuras',
    title: 'Otras estructuras',
    icon: 'Layers',
    sourceFile: '10-otras-estructuras-de-control.md',
    quizId: null,
    relatedQuiz: {
      moduleId: 'kernel-scheduler',
      note: 'No hay un banco de preguntas específico de este tema, pero el quiz de Kernel Scheduler pregunta directamente sobre el PCB y los cambios de estado.',
    },
    tagline: 'PCB, tabla de segmentos, huecos, tabla de IO — quién guarda qué.',
  },
  {
    id: 'resumen-proyecto',
    title: 'Resumen del proyecto',
    icon: 'BookOpen',
    sourceFile: '11-resumen-armado-proyecto.md',
    quizId: 'resumen-proyecto',
    relatedQuiz: null,
    tagline: 'Quién hizo qué, y qué problemas surgieron y cómo se resolvieron.',
  },
]

export function getModule(id) {
  return MODULES.find((m) => m.id === id)
}
