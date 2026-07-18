// Contenido pedagógico del módulo de Sincronización (mutex y semáforos).
// Fuente: informes/03-semaforos-sincronizacion.md
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'Los módulos "pesados" del TP — kernel_scheduler y kernel_memory, sobre todo — son multihilo: por cada CPU, cada IO y cada cliente conectado se lanza un hilo dedicado (pthread_create + pthread_detach) que corre en paralelo con el resto. Todos esos hilos comparten estructuras en memoria dentro del mismo proceso (colas de procesos, listas de recursos, contadores). Sin coordinación, dos hilos podrían leer/modificar la misma estructura al mismo tiempo y corromperla — una condición de carrera.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Mutex vs. semáforos: dos herramientas, dos trabajos distintos',
      text: 'Mutex (pthread_mutex_t): exclusión mutua, solo un hilo a la vez puede estar "adentro" de la sección protegida. Se usa para proteger estructuras compartidas (colas, listas). Semáforos (sem_t): señalización/conteo, un hilo espera (sem_wait) a que otro le avise (sem_post) que hay trabajo o un recurso disponible. Se usan para coordinar flujo entre hilos (ej. "hay un proceso nuevo en ready", "ya tengo la respuesta que estaba esperando").',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'kernel_scheduler es el módulo con más concurrencia del TP: casi cada estructura global tiene su propio mutex y, cuando hace falta esperar un evento (no solo proteger datos), un semáforo al lado. kernel_memory suma su propia batería, más chica, centrada en los sticks conectados y el socket hacia el scheduler.',
    },
    {
      type: 'table',
      headers: ['Módulo', 'Variable', 'Protege / coordina'],
      rows: [
        ['kernel_scheduler', 'mutexes_ready[] + sem_procesos_en_ready[]', 'Cada cola de READY por prioridad (algoritmo CMN, colas multinivel).'],
        ['kernel_scheduler', 'sem_procesos_en_ready_global', 'Señala "hay al menos un proceso listo en alguna cola" — lo espera el planificador de corto plazo antes de buscar en qué cola.'],
        ['kernel_scheduler', 'mutex_new + sem_procesos_en_new', 'Cola de procesos NEW (admisión, planificación de largo plazo).'],
        ['kernel_scheduler', 'mutex_quantum', 'Estado compartido del temporizador de quantum (Round Robin).'],
        ['kernel_scheduler', 'mutex_pedido_km + sem_resultado_km', 'Serializan los pedidos a Kernel Memory: un solo pedido en vuelo a la vez.'],
        ['kernel_scheduler', 'sem_resultado_susp', 'Respuestas de suspensión/desuspensión de Kernel Memory.'],
        ['kernel_scheduler', 'sem_resultado_lectura_mem', 'Respuestas de LEER_MEMORIA (buffer de tamaño variable, canal propio).'],
        ['kernel_scheduler', 'mutex_lista_io', 'Lista global de módulos IO conectados.'],
        ['kernel_scheduler', 'mutex_lista_mutexes', 'Lista global de mutex de usuario (t_mutex_simulado) creados dinámicamente.'],
        ['kernel_scheduler', 'mutex_lista_todos_pcb', 'Lista de todos los PCB vivos (para BSOD, listados, etc.).'],
        ['kernel_scheduler', 'mutex_susp_ready / mutex_susp_block', 'Colas de mediano plazo (procesos suspendidos).'],
        ['kernel_scheduler', 'mutex_compactando + cond_compactacion_lista', 'Pausan al planificador mientras Kernel Memory compacta y lo despiertan al terminar.'],
        ['kernel_scheduler', 'mutex + semáforo (por cada t_io_modulo)', 'Cola de pedidos pendientes de ese dispositivo IO puntual.'],
        ['kernel_scheduler', 'mutex_interno (por cada t_mutex_simulado)', 'Estado propio de ese mutex de usuario (dueño, cola de bloqueados).'],
        ['kernel_memory', 'mutex_ms', 'Lista de memory sticks conectados, memoria total y lista de huecos libres.'],
        ['kernel_memory', 'mutex_socket_scheduler', 'Serializa los send() hacia kernel_scheduler entre varios hilos que escriben en el mismo socket.'],
        ['kernel_memory', 'mutex por cada t_memory_stick_info', 'Serializa el socket hacia ese stick en particular.'],
        ['memory_stick', 'mutex_memoria (único, global)', 'Todo el buffer de memoria del stick — granularidad gruesa, sin locks por bloque o región.'],
      ],
    },
    {
      type: 'ul',
      items: [
        'Wrapper sem_wait_ei: reintenta el sem_wait si es interrumpido por una señal (EINTR) — necesario porque con tantos hilos corriendo, una señal puede cortar una espera válida. Mismo criterio en usleep_ei para los delays simulados.',
        'cpu, io y swap no tienen mutex propios: son de un solo hilo, atienden un pedido a la vez.',
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Punto débil detectado en kernel_memory',
      text: 'No hay un mutex explícito sobre lista_procesos. Si CPU y kernel_scheduler llegaran a disparar operaciones concurrentes sobre el mismo proceso, hay una ventana teórica de condición de carrera. Es para mencionar si preguntan, no algo que haya que "arreglar" en el informe.',
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'Un patrón se repite en todo kernel_scheduler y sirve como concepto unificador: como un solo hilo (hilo_escucha_memoria) lee las respuestas del socket hacia Kernel Memory, cualquier otro hilo que necesite pedirle algo a KM tiene que pasar por el mismo protocolo de mutex + semáforo.',
    },
    {
      type: 'ol',
      items: [
        'Tomar mutex_pedido_km (para que el pedido no se mezcle con otro concurrente).',
        'Mandar el pedido.',
        'Esperar en el semáforo específico de esa respuesta (sem_resultado_km, sem_resultado_susp o sem_resultado_lectura_mem, según el tipo de pedido).',
        'Soltar mutex_pedido_km.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Por qué las notificaciones de KM van en hilo aparte',
      text: 'Operaciones que Kernel Memory inicia sin que se lo pidan (NUEVA_MEMORIA_DISPONIBLE, FIN_COMPACTACION, que disparan un reintento de desuspensión) se procesan en un hilo aparte y no inline. Si intentar_desuspender_procesos() se llamara directamente desde hilo_escucha_memoria y esa función necesitara a su vez pedirle algo a KM y esperar la respuesta, el propio hilo_escucha_memoria quedaría esperándose a sí mismo — el mismo tipo de auto-deadlock que el de los mutex de usuario (ver Detalles importantes), pero entre hilo y pedido en vez de entre mutex anidados.',
    },
  ],

  stepByStep: [
    {
      type: 'p',
      text: 'Los mutex "de usuario" son los que pide el programa simulado que corre en la CPU, con las instrucciones MUTEX_CREATE, MUTEX_LOCK y MUTEX_UNLOCK — no son infraestructura interna del kernel. Viven en t_mutex_simulado: nombre, si está libre, quién es el dueño (pid_owner), cola de bloqueados y su propio mutex_interno.',
    },
    {
      type: 'ol',
      items: [
        'El proceso pide MUTEX_LOCK.',
        'Si el mutex está libre, manejar_mutex_lock se lo asigna directamente al proceso pedidor.',
        'Si está ocupado, el proceso pasa a BLOCK y entra a la cola de bloqueados de ese mutex.',
        'Se dispara herencia de prioridad (heredar_prioridad): si el proceso bloqueado tiene mayor prioridad que el dueño actual del mutex, el dueño hereda temporalmente esa prioridad más alta (y se reubica de cola en caliente) para que no lo desalojen procesos de prioridad intermedia mientras tiene el recurso tomado — resuelve el problema clásico de inversión de prioridades.',
        'Cuando el dueño hace MUTEX_UNLOCK, manejar_mutex_unlock libera el mutex.',
        'Se restaura la prioridad original del proceso que lo tenía (restaurar_prioridad).',
        'Si había alguien esperando en la cola de bloqueados, ese proceso pasa de BLOCK a READY y se le asigna el mutex a él.',
      ],
    },
  ],

  details: [
    {
      type: 'p',
      text: 'El fix más relevante de sincronización en todo el historial del TP es el commit ed7f4ac, que corrige un deadlock real en el flujo de MUTEX_UNLOCK descripto arriba.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'El deadlock de mutex_interno (commit ed7f4ac)',
      text: 'restaurar_prioridad también necesita tomar mutex_interno del mutex simulado para leer/modificar su estado. Antes del fix, manejar_mutex_unlock llamaba a restaurar_prioridad(m) mientras todavía tenía tomado m->mutex_interno. Como pthread_mutex_t no es reentrante por defecto, el mismo hilo terminaba auto-bloqueándose esperando un mutex que él mismo ya tenía tomado — deadlock — y el MUTEX_UNLOCK nunca respondía al proceso que lo había pedido. El fix consistió en soltar mutex_interno antes de llamar a restaurar_prioridad, y volver a tomarlo después para continuar con el resto de la lógica (pasar el mutex al siguiente de la cola). El comentario que quedó en el código documenta exactamente este razonamiento.',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'El commit "af8b0a0 fixes mutex" no toca ningún mutex',
      text: 'El commit inmediatamente posterior a ed7f4ac en el historial se llama af8b0a0, "fixes mutex", pero al revisar su diff real no toca ningún mutex ni semáforo: corrige la traducción de direcciones lógicas para que también contemple segmentos suspendidos en swap (reemplaza traducir_direccion por ubicar_segmento en kernel_memory). El fix real de sincronización de mutex está en el commit anterior, ed7f4ac. Ojo con este nombre engañoso si preguntan por el historial de commits en la defensa.',
    },
  ],

  summary: [
    {
      type: 'ul',
      items: [
        'Mutex = exclusión mutua sobre estructuras compartidas; semáforos = señalización de eventos/recursos entre hilos.',
        'kernel_scheduler concentra la mayor parte de la sincronización: una cola por prioridad, la cola de NEW, el quantum, la lista de IO, la lista de mutex de usuario, los PCB y las colas de suspendidos tienen cada uno su propio mutex.',
        'Hacia Kernel Memory rige el patrón "un pedido en vuelo a la vez": mutex_pedido_km + un semáforo específico por tipo de respuesta, porque un solo hilo lee el socket.',
        'Los mutex de usuario (MUTEX_CREATE/LOCK/UNLOCK) implementan herencia de prioridad para evitar inversión de prioridades.',
        'El commit ed7f4ac arregló un deadlock real: restaurar_prioridad tomaba un mutex_interno que el propio hilo ya tenía tomado. Solución: soltarlo antes de restaurar la prioridad y retomarlo después.',
        'El commit af8b0a0 ("fixes mutex") es un nombre engañoso: no toca sincronización, corrige traducción de direcciones con segmentos en swap.',
        'Punto débil conocido: kernel_memory no protege lista_procesos con un mutex explícito.',
      ],
    },
  ],
}

// Fuente: informes/03-semaforos-sincronizacion.md
