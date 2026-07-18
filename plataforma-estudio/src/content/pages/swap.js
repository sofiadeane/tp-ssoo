// Contenido pedagógico del módulo swap.
// Fuente: informes/08-swap.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'swap simula el almacenamiento secundario donde se guardan los procesos suspendidos cuando no entran en memoria principal. Es, a propósito, el módulo más simple y "tonto" de todo el sistema.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Idea central',
      text: 'swap no sabe qué es un proceso, un segmento, ni una política de reemplazo — solo expone un archivo dividido en bloques de tamaño fijo y responde "leer bloque N" / "escribir bloque N". Toda la inteligencia (qué bloque le corresponde a qué proceso, cuáles están libres) vive en kernel_memory.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'La responsabilidad de swap se reduce a una sola cosa: persistir bloques de bytes en un archivo binario de tamaño fijo, y nada más.',
    },
    {
      type: 'ul',
      items: [
        'Archivo de tamaño fijo: el tamaño total se fija una sola vez al arrancar (ftruncate) — no hay crecimiento dinámico posterior.',
        'Bloques de tamaño fijo: el archivo se divide en bloques de block_size bytes cada uno; toda operación trabaja con un bloque completo, nunca con bytes sueltos.',
        'Sin noción de proceso ni memoria: swap no sabe a qué proceso pertenece cada bloque — solo conoce números de bloque.',
      ],
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'swap es un cliente que se conecta una única vez a Kernel Memory. Al conectarse hace un handshake particular: en vez de esperar que le pidan algo, es swap quien le informa proactivamente a Kernel Memory los datos que necesita para administrar el espacio.',
    },
    {
      type: 'ol',
      items: [
        'Lee su config (swap.config) y abre/crea el archivo de swap con open() + ftruncate(), fijando el tamaño total del archivo de una sola vez.',
        'Se conecta a Kernel Memory como cliente y manda su tipo de módulo (SWAP).',
        'Sin esperar que Kernel Memory pida nada, manda directamente block_size y swap_file_size — con esos dos datos, Kernel Memory calcula la cantidad total de bloques disponibles.',
        'Espera la confirmación de Kernel Memory.',
        'Entra a un único loop bloqueante que atiende pedidos hasta que la conexión se corta.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Handshake invertido',
      text: 'A diferencia de otros módulos donde el servidor pregunta y el cliente responde, acá swap es quien empuja la información (block_size y swap_file_size) apenas se conecta, para que Kernel Memory pueda calcular el total de bloques disponibles.',
    },
  ],

  stepByStep: [
    {
      type: 'p',
      text: 'Una vez hecho el handshake, swap solo sabe responder a dos operaciones que le manda Kernel Memory.',
    },
    {
      type: 'table',
      headers: ['Operación', 'Recibe', 'Hace', 'Responde'],
      rows: [
        [
          'ESCRIBIR_BLOQUE_SWAP',
          'numero_bloque (uint32) + block_size bytes de contenido',
          'pwrite() del contenido en el archivo, en el offset numero_bloque * block_size',
          'ok=1',
        ],
        [
          'LEER_BLOQUE_SWAP',
          'numero_bloque (uint32)',
          'pread() de block_size bytes desde el offset numero_bloque * block_size',
          'los block_size bytes crudos leídos (sin código de éxito previo)',
        ],
      ],
    },
    {
      type: 'p',
      text: 'Si la conexión con Kernel Memory se corta en cualquier momento, swap simplemente termina el proceso — no hay lógica de reconexión.',
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'Siempre bloques completos',
      text: 'swap opera únicamente con bloques enteros de block_size bytes. Si hace falta una escritura parcial (menor a un bloque), el read-modify-write que la arma es responsabilidad de kernel_memory — swap ni se entera de que la escritura es parcial.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Protocolo crudo, sin t_paquete',
      text: 'La comunicación con Kernel Memory no usa el t_paquete genérico del resto del sistema: es un protocolo crudo de opcode (int) + payload de tipo fijo según el opcode.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Sin estructuras propias de administración',
      text: 'Las únicas variables globales de swap son fd_swap, swap_file_path, swap_file_size y block_size. No hay listas, bitmaps ni contadores de bloques libres/ocupados dentro de swap — esa contabilidad vive enteramente en kernel_memory, usando una lista simple (no un bitmap).',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Sin sincronización propia',
      text: 'swap es single-threaded y procesa un pedido a la vez sobre una única conexión, así que no hay condición de carrera posible internamente ni mutex/semáforos propios. Toda exclusión mutua real sobre "quién puede acceder a qué bloque" es responsabilidad de Kernel Memory.',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'Asimetría entre escritura y lectura',
      text: 'La respuesta de ESCRIBIR_BLOQUE_SWAP lleva un ok=1 explícito, pero la respuesta de LEER_BLOQUE_SWAP no — son directamente los bytes crudos, sin código de éxito previo. Si preguntan por manejo de errores en la defensa, esta diferencia es clave.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'No hay compactación ni fragmentación acá',
      text: 'Es un tema fácil de confundir con kernel_memory: el archivo de swap es de tamaño fijo desde el arranque, así que no hay compactación ni fragmentación dentro de swap. Esos conceptos aplican sobre memoria principal, en kernel_memory, no sobre este archivo.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: '¿Qué pasa si no quedan bloques libres?',
      text: 'swap ni se entera: es Kernel Memory quien lleva la cuenta de bloques libres y decide si hay espacio antes de pedir una escritura. También vale notar que el contenido del archivo no se inicializa explícitamente a cero — solo se hace ftruncate, que típicamente rellena con ceros lógicos en Linux vía sparse file, pero no está garantizado en todos los sistemas de archivos.',
    },
  ],

  summary: [
    {
      type: 'ul',
      items: [
        'swap es el módulo más simple del sistema: persiste bloques de bytes en un archivo de tamaño fijo, y nada más.',
        'El archivo y sus bloques tienen tamaño fijo desde el arranque (ftruncate) — no hay crecimiento dinámico ni compactación/fragmentación dentro de swap.',
        'Handshake invertido: swap le informa a Kernel Memory block_size y swap_file_size apenas se conecta, sin que se lo pidan.',
        'Solo soporta dos operaciones: ESCRIBIR_BLOQUE_SWAP (responde ok=1) y LEER_BLOQUE_SWAP (responde los bytes crudos, sin ok).',
        'Toda la administración de qué bloque pertenece a qué proceso y cuáles están libres vive en kernel_memory, no en swap.',
        'swap es single-threaded, sin mutex ni semáforos propios, y sin reconexión automática si se cae la conexión con Kernel Memory.',
      ],
    },
  ],
}

// Fuente: informes/08-swap.md
