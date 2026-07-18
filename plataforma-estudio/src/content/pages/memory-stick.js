// Contenido pedagógico del módulo memory_stick.
// Fuente: informes/09-memory-stick.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'callout',
      tone: 'info',
      title: 'No es un filesystem',
      text: 'memory_stick simula memoria física (RAM) de un "pendrive"/placa enchufable, no un filesystem. No hay archivos, directorios, bloques con metadata ni journaling: es un único buffer plano de bytes. Si preguntan por compactación o fragmentación de un memory stick, esa lógica vive en kernel_memory, no acá.',
    },
    {
      type: 'p',
      text: 'Las carpetas ms1 a ms4 (memory_stick/ms{1..4}/memory_stick.config, idénticas a memory_stick/MemoryStick_{1..4}.config en la raíz del módulo) son 4 juegos de config duplicados para correr 4 instancias simultáneas del mismo binario, simulando 4 "pendrives" independientes. Cada instancia tiene su propio PUERTO_ESCUCHA (típicamente 4321/4322/4323/4324) y TAMANIO.',
    },
    {
      type: 'p',
      text: 'No contienen datos ni son particiones de un filesystem: son solo configuración para simular memoria física expandible/"plug-n-play" — coherente con el mensaje NUEVA_MEMORIA_DISPONIBLE que kernel_memory le manda a kernel_scheduler cuando se conecta un nuevo stick.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'La responsabilidad del módulo es guardar bytes y devolverlos cuando se los piden, sin saber para qué proceso, segmento o página son.',
    },
    {
      type: 'ul',
      items: [
        'Un único buffer uint8_t* memoria (memory_stick.h) de tamanio_memoria bytes.',
        'Sin bloques, sin metadata de archivos, sin journaling: toda la "inteligencia" de memoria (compactación, fragmentación, segmentos) vive en kernel_memory.',
        'memory_stick solo conoce direcciones y tamaños — no sabe a quién pertenece cada byte.',
      ],
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'Al arrancar, memory_stick requiere dos argumentos: el config y el tamaño real del buffer (argv[2]) — el tamaño NO sale de la clave TAMANIO del .config, que queda sin usar. Reserva el buffer con malloc y lo inicializa a 0 con memset.',
    },
    {
      type: 'p',
      text: 'Después se registra ante Kernel Memory: conecta, manda tipo=MEMSTICK, tamaño, y además su propia IP y puerto de escucha — así KM puede reenviárselos después a las CPUs para que se conecten directo con el stick.',
    },
    {
      type: 'p',
      text: 'A partir de ahí abre dos frentes de atención en paralelo:',
    },
    {
      type: 'ul',
      items: [
        'Un hilo dedicado (manejar_operaciones_km) que atiende pedidos que lleguen por esa misma conexión de registro con KM.',
        'Un servidor propio (iniciar_servidor) para que las CPUs se conecten directamente — bypass de KM para las lecturas/escrituras de datos, por performance (servidor_cpus, un hilo por CPU conectada).',
      ],
    },
  ],

  stepByStep: [
    {
      type: 'p',
      text: 'Una única función (atender_operaciones_memoria) atiende tanto el socket de registro con KM como cada socket de CPU, y soporta dos operaciones:',
    },
    {
      type: 'table',
      headers: ['Operación', 'Recibe', 'Hace'],
      rows: [
        ['LEER_MEMORIA', 'dir (uint32) + tam (uint32)', 'Duerme MEMORY_DELAY ms, toma mutex_memoria, send(&memoria[dir], tam).'],
        ['ESCRIBIR_MEMORIA', 'dir (uint32) + tam (uint32)', 'Duerme MEMORY_DELAY ms, toma mutex_memoria, recv directo sobre &memoria[dir], responde ok=1.'],
      ],
    },
    {
      type: 'p',
      text: 'El mutex_memoria es único y global, y protege todo el buffer completo: granularidad gruesa. Se toma el mutex para cualquier lectura o escritura sin importar la dirección o el tamaño — no hay locks por región o bloque. Es simple y correcto, pero serializa completamente el acceso al stick entre CPUs concurrentes.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Código vestigial',
      text: 'cpus_conectadas y sem_cpus_libres se declaran e inicializan pero no se usan después de eso — parecen preparación para algo (¿límite de CPUs concurrentes?) que nunca se implementó.',
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'Comunicación dual: dos canales, misma lógica',
      text: 'memory_stick atiende pedidos por dos canales distintos que comparten la misma función de atención: (1) la conexión de registro con Kernel Memory, usada por KM cuando necesita leer/escribir directamente (ej. durante compactación), y (2) el servidor propio para CPUs, al que las CPUs se conectan después de recibir la lista de sticks de parte de KM, para leer/escribir memoria directo, sin pasar por KM.',
    },
    {
      type: 'p',
      text: 'El protocolo en ambos canales es el mismo: opcode (int) + payload crudo por send/recv — no usa el t_paquete de so-commons, igual que el resto de las comunicaciones de datos de memoria.',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'Sin validación de límites',
      text: 'No se chequea dir + tam <= tamanio_memoria antes de leer o escribir — memory_stick confía ciegamente en que quien pide (KM, que ya validó contra SEGMENT_MAX_SIZE y el segmento del proceso) mandó una dirección válida. Un dir/tam mal calculado produciría un acceso fuera del buffer. No es un bug para "arreglar" en el informe, es un punto para mencionar si preguntan por robustez.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'TAMANIO y CLAVE son dead keys en el config',
      text: 'La clave TAMANIO figura en el .config pero no se usa: el tamaño real del buffer llega por argv[2] al arrancar el proceso. También hay una clave CLAVE=MensajeSuperSecreto que no se usa en ningún lado del código, probablemente vestigial de una plantilla anterior. Si preguntan de dónde sale el tamaño real, la respuesta es "por argumento de línea de comandos".',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Si se cae la conexión con Kernel Memory, el proceso hace exit',
      text: 'Es una decisión de diseño explícita: sin KM administrándolo, el stick no tiene sentido por sí solo, así que ante la caída de esa conexión el proceso termina con exit(EXIT_FAILURE). Relacionado: terminar_programa es efectivamente inalcanzable en la práctica, porque el servidor de CPUs corre en un loop infinito y no hay manejo de señales (SIGINT) para salir limpio — el proceso normalmente termina por Ctrl+C o al matarlo.',
    },
  ],

  summary: [
    {
      type: 'ul',
      items: [
        'memory_stick es memoria física pura: un buffer plano de bytes, sin filesystem, sin metadata ni bloques — esa lógica vive en kernel_memory.',
        'Las carpetas/config ms1-ms4 son 4 instancias del mismo binario simulando 4 pendrives independientes, no particiones de un filesystem.',
        'El tamaño real del buffer viene por argv[2], no de la clave TAMANIO del config (dead key, junto con CLAVE).',
        'Se registra ante Kernel Memory mandando su propia IP/puerto, y además levanta un servidor propio para que las CPUs se conecten directo, sin pasar por KM.',
        'Solo dos operaciones: LEER_MEMORIA y ESCRIBIR_MEMORIA, protegidas por un único mutex_memoria de granularidad gruesa (todo el buffer, no por región).',
        'Sin validación de límites de dirección/tamaño, y ante caída de conexión con KM el proceso hace exit — ambos son puntos de defensa, no bugs a corregir.',
      ],
    },
  ],
}

// Fuente: informes/09-memory-stick.md
