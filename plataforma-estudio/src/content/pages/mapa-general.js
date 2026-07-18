// Contenido pedagógico del mapa general del sistema.
// Fuente: informes/01-mapa-rapido.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'Este TP simula un sistema operativo completo, pero en vez de vivir todo en un único kernel, está dividido en 6 procesos independientes que se comunican por {{g:sockets|el "enchufe" de red por el que dos procesos se conectan y mandan datos}} TCP — cada uno puede correr en su propia terminal o hasta en una máquina distinta.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Por qué está separado en procesos',
      text: 'La idea pedagógica es la misma que la de un SO real: separar quién decide (planificación) de quién ejecuta (`cpu`), de dónde vive la memoria (`KM` + `memory_stick`s), de cómo se persiste lo que no entra en RAM (`swap`) y de cómo se interactúa con el mundo exterior (`io`). En un SO real todo esto pasa "adentro" del kernel; acá queda repartido en procesos separados a propósito, para que la comunicación entre partes sea explícita y visible.',
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
        ['`KS`', 'El "cerebro": decide qué proceso corre, cuándo y en qué CPU. Dueño de los tres niveles de planificación.'],
        ['`KM`', 'El "administrador de memoria": dueño de los {{g:segmento|un pedazo contiguo de memoria física asignado a un proceso}}s, {{g:hueco|un espacio libre en la memoria, todavía sin asignar a nadie}}s libres, la {{g:compactación|reordenar la memoria ocupada para juntar todo el espacio libre en un solo bloque grande}} y de decidir qué se suspende a {{g:swap|el "depósito" en disco donde se guardan temporalmente los datos de procesos que no entran en la memoria principal}}.'],
        ['`cpu`', 'El "músculo": ejecuta instrucciones una por una (fetch-decode-execute), no toma decisiones de planificación ni de memoria.'],
        ['`memory_stick`', 'Un "pendrive" de memoria física pura — un buffer de bytes con dirección propia, nada más.'],
        ['`swap`', 'Un disco "tonto" — solo sabe leer/escribir bloques de un archivo, no sabe de procesos.'],
        ['`io`', 'Un dispositivo genérico (teclado, impresora, sleep, etc.) — el mismo binario simula cualquiera según el nombre que se le pasa al arrancar.'],
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
        '`KS` es el centro de todo: le manda las instrucciones `EJECUTAR_PROCESO` e `INTERRUPCION` a la `cpu` (para decirle qué proceso correr, o que tiene que detenerse), y del lado de `KM` maneja los pedidos `INICIAR_PROCESO`, `CREAR_SEGMENTO`/`ELIMINAR_SEGMENTO`, `SUSPENDER_PROCESO`/`DESUSPENDER_PROCESO` y `LEER_MEMORIA`/`ESCRIBIR_MEMORIA`.',
        '`KS` también registra a cada `io` conectado y le manda pedidos `STDIN`/`STDOUT`/`SLEEP`; `io` le avisa de vuelta cuando termina.',
        'La `cpu` habla directo con `KM` solo para pedir contexto e instrucciones, mandando `PEDIR_CONTEXTO` y `PEDIR_INSTRUCCIONES`.',
        'La `cpu` habla directo con cada `memory_stick` (ms1..ms4) para `LEER_MEMORIA`/`ESCRIBIR_MEMORIA` — esto pasa una vez que `KM` le informó qué sticks existen. Es una optimización: evita recargar a `KM` con cada acceso a datos.',
        '`KM` habla con `swap` mandando `ESCRIBIR_BLOQUE_SWAP` y `LEER_BLOQUE_SWAP` cuando necesita suspender o desuspender segmentos.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'La regla para no confundirse',
      text: 'La `cpu` pasa por `KS` para todo lo que implica una decisión (syscalls, fin de proceso, {{g:segfault|un error grave del proceso, típicamente por acceder a una dirección de memoria que no le corresponde}}). La `cpu` pasa directo por `memory_stick` solo para el acceso a datos puro, sin decisión de por medio.',
    },
  ],

  stepByStep: [
    {
      type: 'ol',
      items: [
        'Selección: `KS` elige un proceso en `READY` según el algoritmo configurado ({{g:FIFO|el primero que llega es el primero que se atiende, sin importar nada más}} / {{g:Round Robin|se reparte la CPU en turnos de tiempo iguales entre todos los procesos}} / {{g:colas multinivel con prioridades|colas separadas por prioridad, donde primero se atiende siempre a la cola más importante}}) y lo asigna a una `cpu` libre mandándole la instrucción `EJECUTAR_PROCESO`.',
        'Traer contexto: la `cpu` le pide el contexto a `KM` mandando la instrucción `PEDIR_CONTEXTO` — recibe los registros ({{g:PC|el registro que indica cuál es la próxima instrucción a ejecutar}}, `EAX`, `EBX`, etc.) y la tabla de segmentos del proceso.',
        'Ciclo de instrucción en la `cpu` — Fetch: le pide a `KM` la instrucción que está en la posición actual del `PC`, mandando `PEDIR_INSTRUCCIONES`. Decode: separa la instrucción en tokens (nombre + parámetros). Execute: según el tipo, se resuelve entera en la `cpu` (aritmética/registros), accede directo al `memory_stick` (memoria, traduciendo la dirección lógica a la física por segmentación), o corta el ciclo como syscall y le avisa a `KS`. El `PC` avanza solo, salvo que la propia instrucción lo haya modificado.',
        'Syscalls típicas que la `cpu` puede recibir de un proceso: `IO` (bloquea el proceso y delega el pedido en `KS`, que se lo pasa a `io`), `MUTEX_LOCK`/`MUTEX_UNLOCK` ({{g:mutex|un candado que solo un proceso puede tener a la vez}} de usuario simulados, con respuesta síncrona), `MEM_ALLOC`/`MEM_FREE` (crea o borra segmentos a través de `KM`), `INIT_PROC` (crea un proceso hijo) y `EXIT` (fin del proceso).',
        'Interrupciones: llegan por un canal aparte del socket de ejecución y solo se atienden entre instrucciones completas — no hay {{g:preempción|la interrupción forzada de un proceso para sacarle la CPU, sin que él lo pida}} a mitad de una instrucción. Se originan por vencimiento de {{g:quantum|el tiempito máximo que un proceso puede usar la CPU antes de que se lo saquen}} (Round Robin) o por desalojo por prioridad.',
        'Mediano plazo: si un proceso queda bloqueado (típicamente por `io`) más de `SUSPENSION_TIMEOUT`, `KS` le pide a `KM` que lo suspenda: todos sus segmentos se mueven a `swap`. Se desuspende cuando hay memoria disponible o termina otro proceso.',
        'Compactación: si `KM` necesita espacio contiguo para un segmento nuevo y no lo encuentra (pero hay espacio total suficiente), compacta la memoria activa. Mientras compacta, `KS` desaloja todas las `cpu` activas (salvo la que originó el pedido) hasta que termina.',
      ],
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'No hay paginación multinivel',
      text: 'La gestión de memoria es por segmentación con particiones dinámicas (huecos + compactación + `first fit`/`best fit`/`worst fit`). No busques tablas de páginas de 2 niveles ni el algoritmo `CLOCK`: no existen en este diseño.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'memory_stick no es un filesystem',
      text: 'Es memoria física pura (un buffer de bytes). Las carpetas `ms1` a `ms4` son 4 instancias configuradas con distinto tamaño/puerto (4 "pendrives"), no particiones de disco.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'swap no decide nada',
      text: 'Es un simulador de bloques fijos en un archivo; toda la lógica de qué bloque corresponde a qué proceso vive en `KM`, no en `swap`.',
    },
  ],

  commonErrors: [],

  summary: [
    {
      type: 'ul',
      items: [
        '`KS`: el proceso que planifica y coordina todo.',
        '`KM`: el proceso dueño de la memoria y sus segmentos.',
        'Segmento: bloque contiguo de memoria física asignado a un proceso (no confundir con "página").',
        'Hueco: espacio libre contiguo en la memoria administrada por `KM`.',
        'Suspensión: mover todos los segmentos de un proceso a `swap` (equivale a "swap-out" de proceso completo, no de páginas individuales).',
        'Compactación: reordenar los segmentos activos para eliminar fragmentación externa y liberar un hueco más grande.',
        'Quantum: tiempo máximo que un proceso puede tener la `cpu` en Round Robin antes de ser desalojado.',
      ],
    },
  ],
}

// Fuente: informes/01-mapa-rapido.md
