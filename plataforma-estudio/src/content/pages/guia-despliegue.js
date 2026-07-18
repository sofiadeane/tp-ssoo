// Contenido pedagógico: Guía de Despliegue y Pruebas.
// Fuente: informes/00-guia-despliegue.md (podés descargarlo desde la página).
// A diferencia de los otros módulos, esta guía NO es conceptual: es un
// runbook operativo con los pasos y comandos exactos para levantar la VM de
// la cátedra y correr la batería de pruebas.
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'Esta guía es el runbook de despliegue del Grupo R2D2 (1C 2026): describe cómo preparar la {{g:VM|una máquina virtual: una "computadora" simulada por software adentro de tu computadora real, para no romper nada del sistema anfitrión}} de la cátedra (UTNSO), clonar el proyecto con `so-deploy`, y los comandos exactos de terminal para correr cada prueba integradora antes del final.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Para qué sirve',
      text: 'No es material de teoría — es la checklist operativa para el día de la prueba: qué escribir en cada terminal, en qué orden, y qué reiniciar entre partes.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'Setup de la VM (Oracle VirtualBox): crear una VM nueva con SO Linux / distribución Ubuntu, asignarle RAM, e instalar el `Server.vmi` como disco virtual.',
    },
    {
      type: 'ul',
      items: [
        'Network: Attached to Bridged Adapter, y en General > Advanced dejar Shared Clipboard en Bidireccional.',
        'Al iniciar la VM, subir la escala de la vista (View > Virtual Screen) para que se lea bien.',
        'Login: escribir `utnso` + Enter dos veces.',
        'Repo de la materia: https://github.com/sisoputnfrba/tp-2026-1c-R2D2',
      ],
    },
    {
      type: 'p',
      text: 'Conexión por {{g:SSH|una forma de conectarte a otra computadora por consola, a través de la red, de forma segura}} desde la VM: obtener la IP local de la VM y conectarse desde la terminal.',
    },
    {
      type: 'code',
      text: 'ip a\n# buscar la ip que siempre empieza con 192.168\nssh utnso@192.168.XXX.YYY\n# confirmar tipeando "yes"\n# contraseña: utnso',
    },
    {
      type: 'p',
      text: 'Clonar el repo + las commons con `so-deploy`:',
    },
    {
      type: 'code',
      text: 'git clone https://github.com/sisoputnfrba/so-deploy.git\ncd so-deploy\n./deploy.sh -r=release -p=utils -p=kernel_scheduler -p=kernel_memory -p=cpu -p=memory_stick -p=swap -p=io "tp-2026-1c-R2D2"\ncd ~/so-deploy/tp-2026-1c-R2D2 && git submodule update --init --recursive',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Datos que va a pedir el proceso',
      text: 'Durante el clonado te va a pedir: 1) la contraseña de `utnso`, 2) tu usuario de GitHub, y 3) tu Personal Access Token (`PAT`) de GitHub asociado al repo. El token es una credencial personal — no lo compartas ni lo pegues en ningún documento o repo público, pedilo/generalo desde tu cuenta de GitHub.',
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'La batería de pruebas de la cátedra se organiza en 6 pruebas, cada una levantando una combinación distinta de módulos y configs. Todas comparten el mismo orden lógico de encendido: `KM` → `KS` → `memory_stick` → `swap` → `io` → `cpu`.',
    },
    {
      type: 'table',
      headers: ['Prueba', 'Qué evalúa'],
      rows: [
        ['1. Prueba Base', 'Circuito completo de un proceso: creación, planificación (`PLANI_PRE`), IO en modo `SLEEP`, reinicio intermedio de todos los módulos, y continuación con IO en modo `STDIN_STDOUT`.'],
        ['2. Planificación Corto Plazo ({{g:PCP|Prueba de Planificación de Corto Plazo}})', 'Algoritmo de planificación de corto plazo corriendo en loop continuo (`PCP.prc`).'],
        ['3. Memoria', 'Gestión de memoria con múltiples `memory_stick` simultáneos (`ms1` a `ms4`) y comparación entre estrategias de asignación (`BEST` vs. `WORST` fit).'],
        ['4. Planificación Mediano Plazo ({{g:PMP|Prueba de Planificación de Mediano Plazo}})', 'Planificación de mediano plazo con varios `memory_stick` y tres instancias de IO (`SLEEP`, `STDIN`, `STDOUT`) en simultáneo.'],
        ['5. Herencia de Prioridades ({{g:PHP|Prueba de Herencia de Prioridades}})', 'Mecanismo de herencia de prioridades entre procesos (`PHP.prc`).'],
        ['6. Estabilidad General', 'Prueba de estabilidad del sistema completo. Las especificaciones, configs e instrucciones de esta etapa las da el ayudante evaluador de manera presencial durante el final.'],
      ],
    },
  ],

  stepByStep: [
    {
      type: 'p',
      text: '1. Prueba Base — Parte 1:',
    },
    {
      type: 'table',
      headers: ['Terminal', 'Módulo', 'Comando'],
      rows: [
        ['TERMINAL 1', '`KM`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_memory && ./bin/kernel_memory kernel_memory.config'],
        ['TERMINAL 2 (P1)', '`KS`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_scheduler && ./bin/kernel_scheduler scheduler.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/PLANI_PRE_0.prc'],
        ['TERMINAL 3', '`memory_stick`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick && ./bin/memory_stick memory_stick.config 256'],
        ['TERMINAL 4', '`swap`', 'cd ~/so-deploy/tp-2026-1c-R2D2/swap && ./bin/swap swap.config'],
        ['TERMINAL 5 (P1)', '`io`', 'cd ~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config SLEEP'],
        ['TERMINAL 6', '`cpu`', 'cd ~/so-deploy/tp-2026-1c-R2D2/cpu && ./bin/cpu cpu.config 0'],
      ],
    },
    {
      type: 'p',
      text: '1. Prueba Base — Parte 2 (después del reinicio intermedio, ver Detalles):',
    },
    {
      type: 'table',
      headers: ['Terminal', 'Módulo', 'Comando'],
      rows: [
        ['TERMINAL 2 (P2)', '`KS`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_scheduler && ./bin/kernel_scheduler scheduler.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/MEMORIA_PRE_0.prc'],
        ['TERMINAL 5 (P1 + P2, se necesitan ambas)', '`io`', 'cd ~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config STDIN_STDOUT'],
      ],
    },
    {
      type: 'p',
      text: '2. Planificación Corto Plazo (PCP) → loop:',
    },
    {
      type: 'table',
      headers: ['Terminal', 'Módulo', 'Comando'],
      rows: [
        ['TERMINAL 1', '`KM`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_memory && ./bin/kernel_memory kernel_memory2.config'],
        ['TERMINAL 6', '`KS`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_scheduler && ./bin/kernel_scheduler scheduler2.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/PCP.prc'],
        ['TERMINAL 2', '`memory_stick`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick && ./bin/memory_stick memory_stick.config 256'],
        ['TERMINAL 3', '`swap`', 'cd ~/so-deploy/tp-2026-1c-R2D2/swap && ./bin/swap swap.config'],
        ['TERMINAL 4', '`io`', 'cd ~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config SLEEP'],
        ['TERMINAL 5', '`cpu`', 'cd ~/so-deploy/tp-2026-1c-R2D2/cpu && ./bin/cpu cpu.config 0'],
      ],
    },
    {
      type: 'p',
      text: '3. Prueba Memoria — primera vuelta (`BEST` fit):',
    },
    {
      type: 'table',
      headers: ['Terminal', 'Módulo', 'Comando'],
      rows: [
        ['TERMINAL 1', '`KM`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_memory && ./bin/kernel_memory kernel_memory_3_best.config'],
        ['TERMINAL 9', '`KS`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_scheduler && ./bin/kernel_scheduler scheduler3.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/PLANI_MEM.prc'],
        ['TERMINAL 2', '`ms1`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick/ms1 && ../bin/memory_stick memory_stick.config 16'],
        ['TERMINAL 3', '`ms2`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick/ms2 && ../bin/memory_stick memory_stick.config 32'],
        ['TERMINAL 4', '`ms3`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick/ms3 && ../bin/memory_stick memory_stick.config 64'],
        ['TERMINAL 5', '`ms4`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick/ms4 && ../bin/memory_stick memory_stick.config 128'],
        ['TERMINAL 6', '`swap`', 'cd ~/so-deploy/tp-2026-1c-R2D2/swap && ./bin/swap swap.config'],
        ['TERMINAL 7', '`io`', 'cd ~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config SLEEP'],
        ['TERMINAL 8', '`cpu`', 'cd ~/so-deploy/tp-2026-1c-R2D2/cpu && ./bin/cpu cpu.config 0'],
      ],
    },
    {
      type: 'p',
      text: '3. Prueba Memoria — segunda corrida (`WORST` fit, ver Detalles):',
    },
    {
      type: 'code',
      text: 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_memory && ./bin/kernel_memory kernel_memory_3_worse.config\n\ncd .. && cd memory_stick_2 && ./bin/memory_stick && ./bin/memory_stick',
    },
    {
      type: 'p',
      text: '4. Planificación Mediano Plazo (PMP):',
    },
    {
      type: 'table',
      headers: ['Terminal', 'Módulo', 'Comando'],
      rows: [
        ['TERMINAL 1', '`KM`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_memory && ./bin/kernel_memory kernel_memory4.config'],
        ['TERMINAL 2', '`KS`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_scheduler && ./bin/kernel_scheduler scheduler4.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/PMP.prc'],
        ['TERMINAL 3', '`ms1`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick/ms1 && ../bin/memory_stick memory_stick.config 16'],
        ['TERMINAL 4', '`ms2`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick/ms2 && ../bin/memory_stick memory_stick.config 16'],
        ['TERMINAL 5', '`ms3`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick/ms3 && ../bin/memory_stick memory_stick.config 32'],
        ['TERMINAL 6', '`ms4`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick/ms4 && ../bin/memory_stick memory_stick.config 64'],
        ['TERMINAL 7', '`swap`', 'cd ~/so-deploy/tp-2026-1c-R2D2/swap && ./bin/swap swap.config'],
        ['TERMINAL 8', '`io` — `SLEEP`', 'cd ~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config SLEEP'],
        ['TERMINAL 9', '`io` — `STDIN`', 'cd ~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config STDIN'],
        ['TERMINAL 10', '`io` — `STDOUT`', 'cd ~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config STDOUT'],
        ['TERMINAL 11', '`cpu`', 'cd ~/so-deploy/tp-2026-1c-R2D2/cpu && ./bin/cpu cpu.config 0'],
      ],
    },
    {
      type: 'p',
      text: '5. Herencia de Prioridades (PHP):',
    },
    {
      type: 'table',
      headers: ['Terminal', 'Módulo', 'Comando'],
      rows: [
        ['TERMINAL 1', '`KM`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_memory && ./bin/kernel_memory kernel_memory5.config'],
        ['TERMINAL 7', '`KS`', 'cd ~/so-deploy/tp-2026-1c-R2D2/kernel_scheduler && ./bin/kernel_scheduler scheduler5.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/PHP.prc'],
        ['TERMINAL 2', '`ms1`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick/ms1 && ../bin/memory_stick memory_stick.config 16'],
        ['TERMINAL 3', '`ms2`', 'cd ~/so-deploy/tp-2026-1c-R2D2/memory_stick/ms2 && ../bin/memory_stick memory_stick.config 16'],
        ['TERMINAL 4', '`swap`', 'cd ~/so-deploy/tp-2026-1c-R2D2/swap && ./bin/swap swap.config'],
        ['TERMINAL 5', '`io`', 'cd ~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config SLEEP'],
        ['TERMINAL 6', '`cpu`', 'cd ~/so-deploy/tp-2026-1c-R2D2/cpu && ./bin/cpu cpu.config 0'],
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: '6. Estabilidad General',
      text: 'No tiene tabla de comandos propia: las especificaciones, configuraciones de entorno e instrucciones precisas de ejecución las provee directamente el ayudante evaluador de manera presencial durante el final.',
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'Reinicio intermedio (Prueba Base)',
      text: 'Entre la Parte 1 y la Parte 2 de la Prueba Base hay que reiniciar todos los módulos del sistema antes de continuar. La Parte 2 reutiliza el mismo `KS` y el mismo `io` (`STDIN_STDOUT`), pero con otro `.prc` (`MEMORIA_PRE_0`).',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Segunda corrida de la Prueba de Memoria',
      text: 'Para comparar estrategias de asignación hay que reiniciar todos los procesos cambiando la variable `ALLOCATION_STRATEGY` a `WORST` en `kernel_memory.config`, y volver a levantar `KM` con `kernel_memory_3_worse.config`.',
    },
  ],

  commonErrors: [],

  summary: [
    {
      type: 'ul',
      items: [
        'Crear la VM (Ubuntu, Bridged Adapter, Shared Clipboard Bidireccional) y loguearse con `utnso` / `utnso`.',
        'Conectarse por SSH: `ip a` → `ssh utnso@192.168.XXX.YYY`.',
        'Clonar `so-deploy`, correr `./deploy.sh` con los módulos del repo, y hacer `git submodule update --init --recursive`. Vas a necesitar tu usuario y `PAT` de GitHub (credencial personal, no compartir).',
        'Orden de encendido en todas las pruebas: `KM` → `KS` → `memory_stick` → `swap` → `io` → `cpu`.',
        'Prueba Base: correr Parte 1, reiniciar todo, correr Parte 2 (mismo `KS`/`io`, distinto `.prc`).',
        'Prueba Memoria: correr primero con `BEST` fit, después reiniciar todo cambiando `ALLOCATION_STRATEGY` a `WORST` y volver a correr.',
        'PMP necesita tres IO en paralelo (`SLEEP`, `STDIN`, `STDOUT`); PCP corre en loop continuo; PHP evalúa herencia de prioridades.',
        'Estabilidad General no tiene comandos predefinidos: las instrucciones las da el ayudante evaluador el día del final.',
      ],
    },
  ],
}

// Fuente: informes/00-guia-despliegue.md
