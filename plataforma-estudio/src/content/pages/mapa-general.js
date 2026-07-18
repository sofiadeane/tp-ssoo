// Contenido pedagógico del mapa general del sistema.
// Fuente: informes/01-mapa-rapido.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'Este TP simula un sistema operativo completo, pero en vez de vivir todo en un único kernel, está dividido en 6 procesos independientes que se comunican por sockets TCP — cada uno puede correr en su propia terminal o hasta en una máquina distinta.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Por qué está separado en procesos',
      text: 'La idea pedagógica es la misma que la de un SO real: separar quién decide (planificación) de quién ejecuta (CPU), de dónde vive la memoria (kernel de memoria + memory sticks), de cómo se persiste lo que no entra en RAM (swap) y de cómo se interactúa con el mundo exterior (I/O). En un SO real todo esto pasa "adentro" del kernel; acá queda repartido en procesos separados a propósito, para que la comunicación entre partes sea explícita y visible.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'Los 6 módulos y su rol de una línea:',
    },
    {
      type: 'table',
      headers: ['Módulo', 'Rol en una línea'],
      rows: [
        ['kernel_scheduler (KS)', 'El "cerebro": decide qué proceso corre, cuándo y en qué CPU. Dueño de los tres niveles de planificación.'],
        ['kernel_memory (KM)', 'El "administrador de memoria": dueño de los segmentos, huecos libres, compactación y de decidir qué se suspende a swap.'],
        ['cpu', 'El "músculo": ejecuta instrucciones una por una (fetch-decode-execute), no toma decisiones de planificación ni de memoria.'],
        ['memory_stick', 'Un "pendrive" de memoria física pura — un buffer de bytes con dirección propia, nada más.'],
        ['swap', 'Un disco "tonto" — solo sabe leer/escribir bloques de un archivo, no sabe de procesos.'],
        ['io', 'Un dispositivo genérico (teclado, impresora, sleep, etc.) — el mismo binario simula cualquiera según el nombre que se le pasa al arrancar.'],
      ],
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'No todos los módulos se hablan entre sí libremente: hay un patrón claro de quién le pide qué a quién.',
    },
    {
      type: 'ul',
      items: [
        'kernel_scheduler (KS) es el centro: manda EJECUTAR_PROCESO e INTERRUPCION a la cpu, y maneja INICIAR_PROCESO, CREAR/ELIMINAR_SEGMENTO, SUSPENDER/DESUSPENDER_PROCESO y LEER/ESCRIBIR_MEMORIA con kernel_memory (KM).',
        'KS también registra a cada io conectado y le manda pedidos de STDIN/STDOUT/SLEEP; io le avisa de vuelta cuando termina.',
        'cpu habla directo con KM solo para pedir contexto e instrucciones (PEDIR_CONTEXTO / PEDIR_INSTRUCCIONES).',
        'cpu habla directo con cada memory_stick (ms1..ms4) para LEER/ESCRIBIR_MEMORIA — esto pasa una vez que KM le informó qué sticks existen. Es una optimización: evita recargar a KM con cada acceso a datos.',
        'KM habla con swap para ESCRIBIR_BLOQUE_SWAP / LEER_BLOQUE_SWAP cuando necesita suspender o desuspender segmentos.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'La regla para no confundirse',
      text: 'CPU pasa por KS para todo lo que implica una decisión (syscalls, fin de proceso, segfault). CPU pasa directo por memory_stick solo para el acceso a datos puro, sin decisión de por medio.',
    },
  ],

  stepByStep: [
    {
      type: 'ol',
      items: [
        'Selección: KS elige un proceso en READY según el algoritmo configurado (FIFO / Round Robin / colas multinivel con prioridades) y lo asigna a una CPU libre con EJECUTAR_PROCESO.',
        'Traer contexto: la CPU le pide el contexto a KM (PEDIR_CONTEXTO) — recibe los registros (PC, EAX, EBX, etc.) y la tabla de segmentos del proceso.',
        'Ciclo de instrucción en la CPU — Fetch: pide a KM la instrucción en la posición actual del PC (PEDIR_INSTRUCCIONES). Decode: separa la instrucción en tokens (nombre + parámetros). Execute: según el tipo, se resuelve entera en CPU (aritmética/registros), accede directo al memory_stick (memoria, traduciendo dirección lógica a física por segmentación), o corta el ciclo como syscall y avisa a KS. El PC avanza solo, salvo que la propia instrucción lo haya modificado.',
        'Syscalls típicas: IO (bloquea el proceso y delega en KS→io), MUTEX_LOCK/UNLOCK (mutex de usuario simulados, respuesta síncrona), MEM_ALLOC/MEM_FREE (crea/borra segmentos vía KM), INIT_PROC (crea un proceso hijo), EXIT (fin de proceso).',
        'Interrupciones: llegan por un canal aparte del socket de ejecución y solo se atienden entre instrucciones completas — no hay preempción a mitad de una instrucción. Se originan por vencimiento de quantum (Round Robin) o por desalojo por prioridad.',
        'Mediano plazo: si un proceso queda bloqueado (típicamente por IO) más de SUSPENSION_TIMEOUT, KS le pide a KM que lo suspenda: todos sus segmentos se mueven a swap. Se desuspende cuando hay memoria disponible o termina otro proceso.',
        'Compactación: si KM necesita espacio contiguo para un segmento nuevo y no lo encuentra (pero hay espacio total suficiente), compacta la memoria activa. Mientras compacta, KS desaloja todas las CPUs activas (salvo la que originó el pedido) hasta que termina.',
      ],
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'No hay paginación multinivel',
      text: 'La gestión de memoria es por segmentación con particiones dinámicas (huecos + compactación + first/best/worst fit). No busques tablas de páginas de 2 niveles ni algoritmo CLOCK: no existen en este diseño.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'memory_stick no es un filesystem',
      text: 'Es memoria física pura (un buffer de bytes). Las carpetas ms1 a ms4 son 4 instancias configuradas con distinto tamaño/puerto (4 "pendrives"), no particiones de disco.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'swap no decide nada',
      text: 'Es un simulador de bloques fijos en un archivo; toda la lógica de qué bloque corresponde a qué proceso vive en kernel_memory, no en swap.',
    },
  ],

  commonErrors: [],

  summary: [
    {
      type: 'ul',
      items: [
        'KS / Kernel Scheduler: el proceso que planifica y coordina todo.',
        'KM / Kernel Memory: el proceso dueño de la memoria y sus segmentos.',
        'Segmento: bloque contiguo de memoria física asignado a un proceso (no confundir con "página").',
        'Hueco: espacio libre contiguo en la memoria administrada por KM.',
        'Suspensión: mover todos los segmentos de un proceso a swap (equivale a "swap-out" de proceso completo, no de páginas individuales).',
        'Compactación: reordenar los segmentos activos para eliminar fragmentación externa y liberar un hueco más grande.',
        'Quantum: tiempo máximo que un proceso puede tener la CPU en Round Robin antes de ser desalojado.',
      ],
    },
  ],
}

// Fuente: informes/01-mapa-rapido.md
