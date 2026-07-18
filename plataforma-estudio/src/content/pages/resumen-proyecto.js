// Contenido pedagógico sobre cómo se armó el proyecto.
// Fuente: informes/11-resumen-armado-proyecto.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'Esta página no es un timeline de commits — para eso ya está GitHub. Es el relato de cómo se construyó el sistema: quién encaró qué parte y qué problemas fueron apareciendo durante el desarrollo, y cómo se resolvieron. Está reconstruido a partir de los mensajes de commit y sus diffs.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Ojo con las fuentes',
      text: 'Muchos commits dicen simplemente "fix X" o "bug Y" sin más detalle. En esos casos, el "qué pasó" es una reconstrucción razonable a partir del diff (inferencia), no un hecho documentado por quien lo escribió. Donde el propio commit trae una explicación en su mensaje, sí es un dato directo del historial.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'Quién se encargó de qué, reconstruido a partir de git shortlog y el contenido de los commits de cada persona.',
    },
    {
      type: 'table',
      headers: ['Persona', 'De qué se encargó'],
      rows: [
        [
          'Sofía Deane (sofiadeane)',
          'Integradora del equipo: mayoría de los commits totales, tocó casi todos los módulos en la etapa de estabilización. Compactación de memoria en kernel_memory, deadlock de mutex por herencia de prioridad, bug de EINTR en esperas de semáforo/sleep, bugs de comunicación scheduler↔io↔memstick, y coescribió el módulo CPU inicial junto con Rominna Aquino.',
        ],
        [
          'Priscila Zárate (priscilazarate)',
          'kernel_scheduler: manejo de hilos, identificador de módulos IO, planificación de largo y mediano plazo; también worst/best-fit en kernel_memory y un refactor temprano de utils (mover aceptar_conexiones a la librería compartida).',
        ],
        [
          'Florencia Molle',
          'Creó los módulos IO y SWAP desde cero, y después trabajó fuerte en CPU: la MMU con soporte para varios Memory Sticks (y el segfault correspondiente cuando la traducción falla), y el arreglo de bugs de IO + el ciclo de instrucción de CPU.',
        ],
        [
          'Sofía Miño (sofiaminocantero)',
          'Creó el módulo kernel_memory desde cero y, del lado de kernel_scheduler, el planificador de corto plazo y la primera versión de colas multinivel con herencia de prioridad; también revisó/mergeó las ramas de kernel-scheduler y colas multinivel de sus compañeros.',
        ],
        [
          'Rominna Aquino (its-romi/its.romi)',
          'Coescribió el módulo CPU inicial, hizo una ronda de debug de todos los módulos, e implementó suspensión y desuspensión (la parte de mediano plazo que interactúa con swap).',
        ],
      ],
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'Cronología general de cómo fue creciendo el sistema, por tema:',
    },
    {
      type: 'ul',
      items: [
        'Cada módulo arranca por separado (abril): los 4 módulos "de proceso" (CPU, IO y SWAP, kernel_scheduler, kernel_memory) nacieron como commits independientes de cada persona, todavía sin comunicación completa entre ellos.',
        'Planificación completa y MMU (mayo-junio): colas multinivel con herencia de prioridad, planificador de corto y largo plazo, worst/best-fit en kernel_memory, y la MMU con soporte para varios Memory Sticks.',
        'La compactación y sus dolores de cabeza (julio, primera quincena): implementación de la compactación de memoria seguida de una seguidilla de fixes sobre la misma funcionalidad.',
        'Mediano plazo: suspensión y desuspensión (julio): flujo completo de segmentos que se mueven a bloques de swap, e integración de la planificación a mediano plazo.',
        'El bug de EINTR (julio): identificación y corrección de que sem_wait/usleep pueden retornar antes de tiempo por señales.',
        'Comunicación scheduler↔io↔memstick (varios commits, distintas fechas): serie de fixes sobre el protocolo entre módulos.',
        'Consolidación final: el commit más grande y documentado de todo el historial junta el fix del deadlock de mutex, conecta STDIN/STDOUT a Kernel Memory de verdad, y ajusta consistencia con el enunciado — seguido de housekeeping de configs y rutas para el despliegue.',
      ],
    },
  ],

  stepByStep: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'La compactación de memoria: varios fixes seguidos',
      text: 'Sofía Deane implementa la compactación de memoria (el mecanismo para cuando crear_segmento no encuentra un hueco contiguo pero sí hay espacio total). A partir de ahí sigue una seguidilla de fixes, señal de que compactar memoria en un sistema con múltiples hilos y Memory Sticks conectados por red fue la parte más difícil de poner en marcha: primero un "fix tentativo de compactacion" (ajustes en kernel_scheduler y en el protocolo de paquetes, y aparecen los primeros configs de 3 y 4 Memory Sticks — sugiere que el bug solo se manifestaba con más de 2 sticks conectados); después un "fix semaforos compactacion" (ajustes puntuales de semáforos en ambos kernels, consistente con una condición de carrera entre el hilo que compacta y el que planifica); y finalmente un fix que sí trae la explicación en su propio mensaje — elimina una condición de carrera entre el hilo vigilante de desconexión de un Memory Stick y las lecturas/escrituras reales sobre ese mismo socket, que hacía que compactar_memoria() se quedara colgado esperando datos que nunca llegaban. De paso, en ese mismo commit, MUTEX_CREATE pasa a crear el mutex de usuario dinámicamente si no existe.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'El deadlock de mutex por herencia de prioridad',
      text: 'El fix del deadlock de mutex por herencia de prioridad quedó incluido en el commit más grande y documentado de todo el historial, el de consolidación pre-entrega ("Fix deadlock de mutex, conecta STDIN/STDOUT a Kernel Memory y ajusta consistencia con el enunciado"). Ese mismo commit, además, conecta finalmente STDIN/STDOUT contra Kernel Memory de verdad (antes STDOUT nunca leía memoria real y STDIN nunca la escribía), saca el límite artificial de GRADO_MULTIPROGRAMACION, agrega el tercer disparador de desuspensión que faltaba, y corrige el formato de varios logs para que coincidan con lo pedido por la cátedra.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'El bug de EINTR',
      text: 'Sofía Deane identifica y corrige que sem_wait/usleep pueden retornar antes de lo esperado si al hilo le llega una señal mientras esperan — algo real en un programa con tantos hilos como este (cada conexión, cada monitor de suspensión, cada quantum, es su propio hilo). Sin reintentar, un hilo podía creer que pasó el timeout completo cuando en realidad lo interrumpieron a mitad de camino, o liberar un mutex de pedido a Kernel Memory antes de que la respuesta real llegara, desincronizando el socket. Este commit es el origen de los wrappers sem_wait_ei/usleep_ei que aparecen en kernel_scheduler y kernel_memory.',
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'El commit "fixes mutex" que en realidad no toca mutex',
      text: 'Vale la pena señalarlo porque puede confundir si alguien mira el historial en la defensa: el commit af8b0a0 "fixes mutex", pese al nombre, no toca ningún mutex ni semáforo — es un fix de traducción de direcciones lógicas para que también contemplen segmentos suspendidos en swap (ubicar_segmento). El fix real de mutex está en el commit anterior, ed7f4ac (el de consolidación pre-entrega).',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'No confiarse del nombre del commit',
      text: 'Si en la defensa preguntan por un commit puntual del historial, conviene confirmar el diff real y no confiarse del mensaje — el caso de af8b0a0 "fixes mutex" (que en realidad arregla traducción de direcciones, no mutex) es el ejemplo concreto de por qué el nombre solo no alcanza.',
    },
  ],

  summary: [
    {
      type: 'p',
      text: 'Qué se puede aprender de este historial para la defensa:',
    },
    {
      type: 'ul',
      items: [
        'La parte más "iterada" del proyecto fue la compactación de memoria (al menos 3 commits de fix seguidos) — es razonable esperar preguntas puntuales sobre ella y conviene tenerla bien repasada.',
        'El deadlock de mutex por herencia de prioridad fue un bug real, encontrado y corregido durante el desarrollo (no una construcción teórica del enunciado) — buena historia para contar si preguntan "¿qué problema de concurrencia se les presentó?".',
        'El equipo se dividió razonablemente por módulo al principio (uno o dos módulos por persona) y después convergió en una fase de estabilización conjunta donde varias personas tocaron los mismos archivos — típico de la recta final de un TP grupal.',
      ],
    },
  ],
}

// Fuente: informes/11-resumen-armado-proyecto.md
