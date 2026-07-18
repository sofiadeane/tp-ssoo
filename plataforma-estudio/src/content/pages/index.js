// Agrega el contenido pedagógico de cada módulo bajo su id (debe coincidir
// con el `id` de content/modules.js). Agregar un módulo nuevo = crear su
// archivo acá al lado + una línea nueva en este objeto + una entrada en
// content/modules.js — no hay que tocar ningún componente.
import mapaGeneral from './mapa-general.js'
import guiaDespliegue from './guia-despliegue.js'
import comunicacion from './comunicacion.js'
import sincronizacion from './sincronizacion.js'
import cpu from './cpu.js'
import kernelScheduler from './kernel-scheduler.js'
import kernelMemory from './kernel-memory.js'
import io from './io.js'
import swap from './swap.js'
import memoryStick from './memory-stick.js'
import otrasEstructuras from './otras-estructuras.js'
import resumenProyecto from './resumen-proyecto.js'

export const PAGES = {
  'mapa-general': mapaGeneral,
  'guia-despliegue': guiaDespliegue,
  comunicacion,
  sincronizacion,
  cpu,
  'kernel-scheduler': kernelScheduler,
  'kernel-memory': kernelMemory,
  io,
  swap,
  'memory-stick': memoryStick,
  'otras-estructuras': otrasEstructuras,
  'resumen-proyecto': resumenProyecto,
}
