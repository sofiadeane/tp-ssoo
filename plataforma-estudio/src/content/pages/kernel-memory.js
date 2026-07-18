// Contenido pedagógico del módulo Kernel Memory.
// Fuente: informes/06-kernel-memory.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx. Dentro de cualquier texto podés usar:
//   **negrita**, `código/instrucción`, {{g:TERMINO|explicación corta}},
//   {{f:TERMINO|explicación larga}} (nota al pie) — ver src/lib/richText.jsx.
export default {
  intro: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'Ojo con el modelo mental: NO es paginación',
      text: 'Este TP no implementa {{g:paginación|un esquema de memoria donde el espacio se divide en bloques de tamaño fijo (páginas), distinto al de este TP que usa segmentos de tamaño variable}} multinivel ni marcos de página. La gestión de memoria es por **segmentación** con particiones dinámicas ({{g:huecos|espacios libres en la memoria, todavía sin asignar a nadie}} + {{g:compactación|reordenar la memoria ocupada para juntar todo el espacio libre en un solo bloque grande}} + estrategia de ajuste {{g:best/worst-fit|best = elegir siempre el hueco más chico que alcance; worst = elegir siempre el hueco más grande disponible}}) — el modelo clásico de "memoria contigua" de la materia. No hay reemplazo de páginas individuales: cuando hace falta liberar espacio, se suspende un proceso completo (todos sus segmentos a la vez) a {{g:swap|el "depósito" en disco donde se guardan temporalmente los datos de procesos que no entran en la memoria principal}}, no páginas sueltas. Si en la defensa preguntan por el algoritmo de reemplazo de páginas, la respuesta correcta es que este diseño no tiene uno — la unidad de swap es el proceso, no la página.',
    },
    {
      type: 'p',
      text: '`KM` es el dueño de todo el espacio de memoria física del sistema (la suma de los `memory_stick` conectados), de los segmentos de cada proceso, de decidir cuándo compactar, y de orquestar la suspensión/desuspensión de procesos completos hacia/desde swap. También sirve lectura/escritura de instrucciones y contexto a la CPU.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'Tres nociones sostienen todo el módulo: el {{g:segmento|un pedazo contiguo de memoria física asignado a un proceso}} (memoria que ocupa un proceso), el hueco (memoria libre) y el `memory_stick` (una franja física real). Todo lo demás — `crear_segmento`, compactar, suspender — es manipular estas tres estructuras.',
    },
    {
      type: 'table',
      headers: ['Concepto', 'Qué es', 'Detalle clave'],
      rows: [
        ['Segmento', 'Región de memoria asignada a un proceso: `t_segmento` { id_segmento, base, limite }', 'Cada proceso tiene una lista de segmentos activos (`t_proceso_km.segmentos`). La estructura es compartida con CPU.'],
        ['Hueco', 'Región libre de memoria física: `t_hueco` { base, limite }', 'Se administra como una lista (`lista_huecos`). `encontrar_hueco` elige uno según la estrategia de asignación configurada.'],
        ['`memory_stick`', 'Franja del espacio físico global: [dir_inicio, dir_inicio + tamanio)', 'Puede haber varios conectados a la vez (`t_memory_stick_info`). `encontrar_memory_stick` mapea una dirección física global al stick correspondiente + su dirección local.'],
      ],
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'Resolución de dirección lógica a física: la dirección lógica que llega se descompone en número de segmento y desplazamiento dividiendo por el tamaño máximo de segmento configurado (`SEGMENT_MAX_SIZE`).',
    },
    {
      type: 'code',
      text: 'num_segmento    = dir_logica / SEGMENT_MAX_SIZE\ndesplazamiento  = dir_logica % SEGMENT_MAX_SIZE',
    },
    {
      type: 'p',
      text: 'Esta resolución la hace `ubicar_segmento`, que busca primero entre los segmentos activos (RAM) y, si no está ahí, entre los suspendidos (SWAP) del mismo proceso. CPU tiene su propia versión simplificada (`traducir_direccion`) para su caso de uso.',
    },
    {
      type: 'p',
      text: 'Como la memoria física puede estar repartida en varios `memory_stick`, una lectura o escritura que cruza el límite entre dos sticks se parte automáticamente en dos operaciones.',
    },
    {
      type: 'p',
      text: '`encontrar_hueco`: para asignar un segmento nuevo, se recorre `lista_huecos` y se elige uno según `ALLOCATION_STRATEGY` del config.',
    },
    {
      type: 'ul',
      items: [
        '`BEST`: el hueco más chico que alcance para el tamaño pedido.',
        '`WORST`: el hueco más grande disponible.',
        'No hay rama explícita para `FIRST` fit en el código; algún config de ejemplo usa el nombre `WORSE` como variante — conviene chequear el `strcmp` exacto si se usa ese config.',
      ],
    },
  ],

  stepByStep: [
    {
      type: 'p',
      text: '1) `crear_segmento(pid, id_seg, tamano)` — flujo completo con sus tres desenlaces posibles.',
    },
    {
      type: 'ol',
      items: [
        'Rechaza el pedido si tamano > `SEGMENT_MAX_SIZE`.',
        'Busca un hueco con `encontrar_hueco(tamano)` aplicando la estrategia configurada (`BEST`/`WORST`).',
        'Si encuentra un hueco: crea el segmento ahí mismo y encoge el hueco (o lo elimina de la lista si quedó en 0).',
        'Si NO encuentra un hueco contiguo pero SÍ hay espacio total suficiente sumando todos los huecos: devuelve `-2`, lo que dispara una compactación.',
        'Si ni siquiera compactando alcanza el espacio: devuelve `-3`, es decir, no hay memoria en todo el sistema.',
      ],
    },
    {
      type: 'p',
      text: '2) Compactación de memoria (`compactar_memoria`) — paso a paso.',
    },
    {
      type: 'ol',
      items: [
        'Recolecta todos los segmentos activos de todos los procesos.',
        'Los ordena por su base actual (bubble sort — alcanza porque n es chico en un TP).',
        'Mueve cada segmento al inicio de la memoria, leyendo y escribiendo directo por red contra los `memory_stick` correspondientes, sin dejar huecos entre segmentos movidos.',
        'Al terminar, `lista_huecos` queda con un único hueco al final de toda la memoria.',
        'Se simula un retardo con `COMPACTION_DELAY`; mientras dura, `KS` desaloja todas las CPUs activas salvo la que originó el pedido, para evitar {{g:deadlock|un bloqueo mutuo: varios procesos esperando indefinidamente unos a otros, sin que ninguno pueda avanzar}} si hay una sola CPU.',
      ],
    },
    {
      type: 'p',
      text: '3) Suspensión / desuspensión de procesos (mediano plazo) — la unidad que se mueve a swap es siempre el proceso completo, nunca una página o segmento aislado por reemplazo.',
    },
    {
      type: 'ol',
      items: [
        '`suspender_proceso(pid)`: recorre todos los segmentos activos del proceso.',
        'Para cada uno, obtiene bloques libres de swap (`obtener_bloque_libre`) y mueve el contenido ahí.',
        'Registra cada segmento movido como `t_segmento_suspendido` (guarda id, tamaño y la lista de números de bloque en orden).',
        '`desuspender_proceso(pid)`: busca un hueco en RAM para cada segmento suspendido.',
        'Si no hay espacio disponible, devuelve un código que dispara el mismo mecanismo de compactación que usa `crear_segmento`.',
      ],
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'Interacción con swap: read-modify-write',
      text: '`KM` tiene un socket dedicado a swap, identificado cuando ese cliente se presenta como SWAP en el {{g:handshake|el "saludo" inicial donde dos procesos se identifican antes de empezar a hablar en serio}}. Al conectarse, swap informa su `block_size` y tamaño total, con lo que `KM` arma su lista de bloques libres. El protocolo es crudo (`ESCRIBIR_BLOQUE_SWAP` / `LEER_BLOQUE_SWAP` + número de bloque + contenido si aplica), sin el paquete genérico que se usa en el resto del sistema. Como swap solo lee/escribe bloques completos, escribir sobre un segmento suspendido una porción menor a un bloque no se puede hacer directo: hay que traer el bloque entero, pisar con `memcpy` solo la parte que corresponde, y reenviar el bloque completo. Esto es lo que hacen `leer_de_segmento_suspendido` y `escribir_en_segmento_suspendido`.',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'El commit "fixes mutex" no arregla ningún mutex',
      text: 'Dato jugoso para la defensa. El commit `af8b0a0` se llama "fixes mutex" pero, según el propio comentario en el código, lo que arregla es otra cosa: un pedido de `LEER_MEMORIA`/`ESCRIBIR_MEMORIA` (para `STDIN`/`STDOUT`) puede llegar mientras el segmento en cuestión ya está suspendido en swap — por ejemplo, un `STDIN` que tarda tanto (esperando que el usuario tipee) que `SUSPENSION_TIMEOUT` ya movió el proceso a `SUSP_BLOCK` antes de que llegara el dato. La función vieja (`traducir_direccion`) solo sabía resolver contra segmentos activos; la nueva (`ubicar_segmento`) resuelve primero contra RAM y, si no está ahí, contra swap también. O sea: pese al nombre del commit, esto es un fix de traducción de direcciones, no de sincronización. El fix real de {{g:mutex|un candado que solo un proceso puede tener a la vez}} está en el commit anterior, `ed7f4ac`.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Punto débil: no hay mutex explícito sobre lista_procesos',
      text: '`mutex_ms` protege memory sticks, memoria total y huecos; `mutex_socket_scheduler` serializa los envíos hacia `KS` (porque varios hilos pueden necesitar escribir al mismo socket: el que atiende a `KS`, cada `memory_stick`, el vigilante de caídas); cada `memory_stick` conectado tiene su propio mutex para serializar su socket. Pero `lista_procesos` no tiene un mutex explícito que la proteja — es un punto débil de sincronización a tener presente.',
    },
  ],

  summary: [
    {
      type: 'ul',
      items: [
        'No hay paginación: es segmentación con particiones dinámicas, huecos y compactación. La unidad de swap es el proceso completo, no la página.',
        '`ubicar_segmento` resuelve direcciones contra segmentos activos (RAM) y, si no están, contra suspendidos (SWAP) — por eso reemplazó a la vieja `traducir_direccion`.',
        '`crear_segmento` devuelve 3 códigos posibles: éxito, `-2` (hay que compactar) o `-3` (no hay memoria ni compactando) — estructuran toda la lógica de reintento en `KS`.',
        'La compactación reordena solo los segmentos activos; no toca ni libera nada de lo que ya está suspendido en swap.',
        'Escribir una porción menor a un bloque de swap exige read-modify-write, porque swap solo opera con bloques completos.',
        'El commit `af8b0a0` {{f:"fixes mutex"|El nombre del commit es engañoso: no arregla ningún mutex. Lo que corrige es que ubicar_segmento (antes traducir_direccion) no sabía resolver direcciones contra segmentos ya suspendidos en swap — un caso que puede darse con pedidos de LEER_MEMORIA/ESCRIBIR_MEMORIA sobre STDIN/STDOUT si el proceso fue suspendido mientras esperaba el dato.}} en realidad arregla `ubicar_segmento`, no sincronización; el fix real de mutex es el commit anterior, `ed7f4ac`.',
        'Punto débil documentado: `lista_procesos` no tiene mutex explícito.',
      ],
    },
  ],
}
// Fuente: informes/06-kernel-memory.md
