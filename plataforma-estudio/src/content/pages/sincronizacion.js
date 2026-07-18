// Contenido pedagógico del módulo de Sincronización (mutex y semáforos).
// Fuente: informes/03-semaforos-sincronizacion.md
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'Los módulos "pesados" del TP — `KS` y `KM`, sobre todo — son multihilo: por cada CPU, cada IO y cada cliente conectado se lanza un {{g:hilo|una línea de ejecución dentro de un mismo proceso, corre en paralelo con las demás}} dedicado (`pthread_create` + `pthread_detach`) que corre en paralelo con el resto. Todos esos hilos comparten estructuras en memoria dentro del mismo proceso (colas de procesos, listas de recursos, contadores). Sin coordinación, dos hilos podrían leer/modificar la misma estructura al mismo tiempo y corromperla — una {{g:condición de carrera|cuando el resultado final depende de qué hilo llega primero a tocar un dato compartido, y puede variar entre ejecuciones}}.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Mutex vs. semáforos: dos herramientas, dos trabajos distintos',
      text: '**Mutex** (`pthread_mutex_t`): {{g:mutex|un candado que solo un proceso puede tener a la vez}} — exclusión mutua, solo un hilo a la vez puede estar "adentro" de la sección protegida. Se usa para proteger estructuras compartidas (colas, listas). **Semáforos** (`sem_t`): {{g:semáforo|un contador que coordina cuántos "pueden pasar" al mismo tiempo}} — señalización/conteo, un hilo espera (`sem_wait`) a que otro le avise (`sem_post`) que hay trabajo o un recurso disponible. Se usan para coordinar flujo entre hilos (ej. "hay un proceso nuevo en ready", "ya tengo la respuesta que estaba esperando").',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: '`KS` es el módulo con más concurrencia del TP: casi cada estructura global tiene su propio mutex y, cuando hace falta esperar un evento (no solo proteger datos), un semáforo al lado. `KM` suma su propia batería, más chica, centrada en los sticks conectados y el socket hacia el scheduler.',
    },
    {
      type: 'table',
      headers: ['Módulo', 'Variable', 'Protege / coordina'],
      rows: [
        ['`KS`', '`mutexes_ready[]` + `sem_procesos_en_ready[]`', 'Cada cola de `READY` por prioridad (algoritmo CMN, colas multinivel).'],
        ['`KS`', '`sem_procesos_en_ready_global`', 'Señala "hay al menos un proceso listo en alguna cola" — lo espera el planificador de corto plazo antes de buscar en qué cola.'],
        ['`KS`', '`mutex_new` + `sem_procesos_en_new`', 'Cola de procesos `NEW` (admisión, planificación de largo plazo).'],
        ['`KS`', '`mutex_quantum`', 'Estado compartido del temporizador de quantum (Round Robin).'],
        ['`KS`', '`mutex_pedido_km` + `sem_resultado_km`', 'Serializan los pedidos a `KM`: un solo pedido en vuelo a la vez.'],
        ['`KS`', '`sem_resultado_susp`', 'Respuestas de suspensión/desuspensión de `KM`.'],
        ['`KS`', '`sem_resultado_lectura_mem`', 'Respuestas de `LEER_MEMORIA` (buffer de tamaño variable, canal propio).'],
        ['`KS`', '`mutex_lista_io`', 'Lista global de módulos `IO` conectados.'],
        ['`KS`', '`mutex_lista_mutexes`', 'Lista global de mutex de usuario (`t_mutex_simulado`) creados dinámicamente.'],
        ['`KS`', '`mutex_lista_todos_pcb`', 'Lista de todos los {{g:PCB|la "ficha" que el sistema arma para cada proceso, con todos sus datos: estado, prioridad, registros, etc.}} vivos (para BSOD, listados, etc.).'],
        ['`KS`', '`mutex_susp_ready` / `mutex_susp_block`', 'Colas de mediano plazo (procesos suspendidos).'],
        ['`KS`', '`mutex_compactando` + `cond_compactacion_lista`', 'Pausan al planificador mientras `KM` compacta y lo despiertan al terminar.'],
        ['`KS`', 'mutex + semáforo (por cada `t_io_modulo`)', 'Cola de pedidos pendientes de ese dispositivo IO puntual.'],
        ['`KS`', '`mutex_interno` (por cada `t_mutex_simulado`)', 'Estado propio de ese mutex de usuario (dueño, cola de bloqueados).'],
        ['`KM`', '`mutex_ms`', 'Lista de memory sticks conectados, memoria total y lista de huecos libres.'],
        ['`KM`', '`mutex_socket_scheduler`', 'Serializa los `send()` hacia `KS` entre varios hilos que escriben en el mismo socket.'],
        ['`KM`', 'mutex por cada `t_memory_stick_info`', 'Serializa el socket hacia ese stick en particular.'],
        ['`memory_stick`', '`mutex_memoria` (único, global)', 'Todo el buffer de memoria del stick — granularidad gruesa, sin locks por bloque o región.'],
      ],
    },
    {
      type: 'ul',
      items: [
        'Wrapper `sem_wait_ei`: reintenta el `sem_wait` si es interrumpido por una señal ({{g:EINTR|un error que indica que una espera fue interrumpida por una señal del sistema operativo antes de completarse}}) — necesario porque con tantos hilos corriendo, una señal puede cortar una espera válida. Mismo criterio en `usleep_ei` para los delays simulados.',
        '`cpu`, `io` y `swap` no tienen mutex propios: son de un solo hilo, atienden un pedido a la vez.',
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Punto débil detectado en kernel_memory',
      text: 'No hay un mutex explícito sobre `lista_procesos`. Si `CPU` y `KS` llegaran a disparar operaciones concurrentes sobre el mismo proceso, hay una ventana teórica de condición de carrera. Es para mencionar si preguntan, no algo que haya que "arreglar" en el informe.',
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'Un patrón se repite en todo `KS` y sirve como concepto unificador: como un solo hilo (`hilo_escucha_memoria`) lee las respuestas del socket hacia `KM`, cualquier otro hilo que necesite pedirle algo a `KM` tiene que pasar por el mismo protocolo de mutex + semáforo.',
    },
    {
      type: 'ol',
      items: [
        'Tomar `mutex_pedido_km` (para que el pedido no se mezcle con otro concurrente).',
        'Mandar el pedido.',
        'Esperar en el semáforo específico de esa respuesta (`sem_resultado_km`, `sem_resultado_susp` o `sem_resultado_lectura_mem`, según el tipo de pedido).',
        'Soltar `mutex_pedido_km`.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Por qué las notificaciones de kernel_memory van en hilo aparte',
      text: 'Operaciones que `KM` inicia sin que se lo pidan (`NUEVA_MEMORIA_DISPONIBLE`, `FIN_COMPACTACION`, que disparan un reintento de desuspensión) se procesan en un hilo aparte y no inline. Si `intentar_desuspender_procesos()` se llamara directamente desde `hilo_escucha_memoria` y esa función necesitara a su vez pedirle algo a `KM` y esperar la respuesta, el propio `hilo_escucha_memoria` quedaría esperándose a sí mismo — el mismo tipo de auto-{{g:deadlock|un embotellamiento donde dos o más quedan esperándose mutuamente para siempre}} que el de los mutex de usuario (ver Detalles importantes), pero entre hilo y pedido en vez de entre mutex anidados.',
    },
  ],

  stepByStep: [
    {
      type: 'p',
      text: 'Los mutex "de usuario" son los que pide el programa simulado que corre en la CPU, con las instrucciones `MUTEX_CREATE`, `MUTEX_LOCK` y `MUTEX_UNLOCK` — no son infraestructura interna del kernel. Viven en `t_mutex_simulado`: nombre, si está libre, quién es el dueño (`pid_owner`), cola de bloqueados y su propio `mutex_interno`.',
    },
    {
      type: 'ol',
      items: [
        'El proceso pide `MUTEX_LOCK`.',
        'Si el mutex está libre, `manejar_mutex_lock` se lo asigna directamente al proceso pedidor.',
        'Si está ocupado, el proceso pasa a `BLOCK` y entra a la cola de bloqueados de ese mutex.',
        'Se dispara {{g:herencia de prioridad|cuando un proceso "presta" temporalmente su prioridad alta a otro que tiene bloqueado un recurso que necesita, para que no lo desalojen procesos intermedios}} (`heredar_prioridad`): si el proceso bloqueado tiene mayor prioridad que el dueño actual del mutex, el dueño hereda temporalmente esa prioridad más alta (y se reubica de cola en caliente) para que no lo desalojen procesos de prioridad intermedia mientras tiene el recurso tomado — resuelve el problema clásico de {{g:inversión de prioridades|el problema donde un proceso importante queda esperando indefinidamente a uno menos importante que tiene el recurso que necesita}}.',
        'Cuando el dueño hace `MUTEX_UNLOCK`, `manejar_mutex_unlock` libera el mutex.',
        'Se restaura la prioridad original del proceso que lo tenía (`restaurar_prioridad`).',
        'Si había alguien esperando en la cola de bloqueados, ese proceso pasa de `BLOCK` a `READY` y se le asigna el mutex a él.',
      ],
    },
  ],

  details: [
    {
      type: 'p',
      text: 'El fix más relevante de sincronización en todo el historial del TP es el commit `ed7f4ac`, que corrige un deadlock real en el flujo de `MUTEX_UNLOCK` descripto arriba.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'El deadlock de mutex_interno (commit ed7f4ac)',
      text: '`restaurar_prioridad` también necesita tomar `mutex_interno` del mutex simulado para leer/modificar su estado. Antes del fix, `manejar_mutex_unlock` llamaba a `restaurar_prioridad(m)` mientras todavía tenía tomado `m->mutex_interno`. Como `pthread_mutex_t` no es reentrante por defecto, el mismo hilo terminaba auto-bloqueándose esperando un mutex que él mismo ya tenía tomado — deadlock — y el `MUTEX_UNLOCK` nunca respondía al proceso que lo había pedido. El fix consistió en soltar `mutex_interno` antes de llamar a `restaurar_prioridad`, y volver a tomarlo después para continuar con el resto de la lógica (pasar el mutex al siguiente de la cola). El comentario que quedó en el código documenta exactamente este razonamiento.',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'El commit "af8b0a0 fixes mutex" no toca ningún mutex',
      text: 'El commit inmediatamente posterior a `ed7f4ac` en el historial se llama `af8b0a0`, "fixes mutex", pero al revisar su diff real no toca ningún mutex ni semáforo: corrige la traducción de direcciones lógicas para que también contemple segmentos suspendidos en swap (reemplaza `traducir_direccion` por `ubicar_segmento` en `KM`). El fix real de sincronización de mutex está en el commit anterior, `ed7f4ac`. Ojo con este nombre engañoso si preguntan por el historial de commits en la defensa.',
    },
  ],

  summary: [
    {
      type: 'ul',
      items: [
        '**Mutex** = exclusión mutua sobre estructuras compartidas; **semáforos** = señalización de eventos/recursos entre hilos.',
        '`KS` concentra la mayor parte de la sincronización: una cola por prioridad, la cola de `NEW`, el quantum, la lista de `IO`, la lista de mutex de usuario, los PCB y las colas de suspendidos tienen cada uno su propio mutex.',
        'Hacia `KM` rige el patrón "un pedido en vuelo a la vez": `mutex_pedido_km` + un semáforo específico por tipo de respuesta, porque un solo hilo lee el socket.',
        'Los mutex de usuario (`MUTEX_CREATE`/`LOCK`/`UNLOCK`) implementan herencia de prioridad para evitar inversión de prioridades.',
        'El commit `ed7f4ac` arregló un deadlock real: `restaurar_prioridad` tomaba un `mutex_interno` que el propio hilo ya tenía tomado. Solución: soltarlo antes de restaurar la prioridad y retomarlo después.',
        'El commit `af8b0a0` ("fixes mutex") es un nombre engañoso: no toca sincronización, corrige traducción de direcciones con segmentos en swap.',
        'Punto débil conocido: `KM` no protege `lista_procesos` con un mutex explícito.',
      ],
    },
  ],
}

// Fuente: informes/03-semaforos-sincronizacion.md
