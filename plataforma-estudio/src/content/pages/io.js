// Contenido pedagógico del módulo IO.
// Fuente: informes/07-io.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'En un sistema operativo real, cada dispositivo de entrada/salida tiene su propio controlador y maneja interrupciones al terminar una operación. En este TP, el módulo io simula un dispositivo genérico: el mismo binario puede representar un teclado, una impresora o un "dispositivo de sleep" según el nombre que se le pase al arrancar — no hay un binario distinto por tipo de dispositivo.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Idea central',
      text: 'IO es, a propósito, el módulo más simple del sistema: recibe un pedido, lo ejecuta, avisa que terminó. No decide nada — toda la inteligencia de "quién espera a quién" vive en kernel_scheduler.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'Un mismo binario de IO puede representar cualquier dispositivo. Lo que lo identifica no es su código sino el nombre lógico que recibe por línea de comandos al arrancar (ej. TECLADO, IMPRESORA, STDIN_STDOUT).',
    },
    {
      type: 'ul',
      items: [
        'Identificación por nombre, no por tipo fijo: el despacho de qué hacer se decide en tiempo real según la operación que manda kernel_scheduler, no según el nombre con el que arrancó el proceso.',
        'Nombres compuestos: un IO llamado "STDIN_STDOUT" puede atender tanto pedidos de STDIN como de STDOUT sin saber de antemano cuál le va a tocar.',
        'Tres operaciones soportadas en total: STDIN, STDOUT y SLEEP.',
      ],
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'IO es un cliente que se conecta una única vez a kernel_scheduler y se queda escuchando pedidos en un loop infinito sobre esa misma conexión — no acepta conexiones entrantes, no tiene servidor propio.',
    },
    {
      type: 'table',
      headers: ['Operación', 'Qué manda kernel_scheduler', 'Qué hace IO'],
      rows: [
        ['STDIN', 'longitud a leer', 'Lee de stdin real, corta a esa longitud, manda los bytes leídos directo por el socket (antes de la confirmación de fin).'],
        ['STDOUT', 'tamaño (+ mensaje si tamaño > 0)', 'Si tamaño es 0 lo ignora sin escribir nada; si no, imprime el mensaje por consola.'],
        ['SLEEP', 'milisegundos', 'usleep(ms) — el "tiempo de espera simulado" de la materia.'],
      ],
    },
    {
      type: 'p',
      text: 'Al terminar cualquiera de las tres, IO manda ok=1 — es la señal que kernel_scheduler usa para desbloquear el proceso que esperaba ese IO y devolverlo a READY.',
    },
  ],

  stepByStep: [
    {
      type: 'ol',
      items: [
        'IO arranca con dos argumentos: el archivo de config y el nombre lógico del dispositivo (ej. "STDIN_STDOUT").',
        'Se conecta a kernel_scheduler y hace el handshake: manda su tipo de módulo (IO), después el largo del nombre y el nombre en sí.',
        'Espera la confirmación de kernel_scheduler y entra a un loop infinito.',
        'En cada vuelta: recibe un PID, después el nombre de la operación (STDIN/STDOUT/SLEEP) y sus parámetros.',
        'Ejecuta la operación correspondiente (leer de stdin, imprimir, o dormir).',
        'Manda ok=1 a kernel_scheduler para avisar que terminó, y vuelve a esperar el próximo pedido.',
      ],
    },
    {
      type: 'p',
      text: 'Del lado de kernel_scheduler, cada IO conectado se registra como un t_io_modulo con su propia cola de pedidos pendientes, un mutex y un semáforo — un hilo dedicado (hilo_escucha_io) es el que manda el pedido y espera la confirmación por cada dispositivo.',
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'Coincidencia parcial de nombres',
      text: 'kernel_scheduler busca el módulo IO por nombre admitiendo coincidencia parcial (no exacta) — pensado justamente para permitir nombres compuestos como "STDIN_STDOUT" que atienden más de una operación.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Asimetría de protocolo en STDIN',
      text: 'STDIN es el único caso donde IO manda datos crudos adicionales (los caracteres leídos) antes de la confirmación final de ok — vale la pena tenerlo presente si preguntan por el protocolo exacto.',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'Desconexión sin reintento',
      text: 'Si se cae la conexión con kernel_scheduler, IO simplemente termina el proceso — no hay lógica de reconexión. Del lado del kernel, si ese IO estaba atendiendo un proceso en ese momento, el PCB bloqueado puede quedar huérfano (bug conocido a documentar, no a "arreglar" en un examen).',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'STDOUT con tamaño 0 no es un error',
      text: 'Es el caso normal cuando kernel_scheduler todavía no terminó de leer el dato desde Kernel Memory. IO lo ignora sin cortar la conexión — no hay que confundirlo con una falla.',
    },
  ],

  summary: [
    {
      type: 'ul',
      items: [
        'IO es un proceso monohilo y sin estado: no conoce PCBs, prioridades ni algoritmos de planificación.',
        'Toda la exclusión mutua y el encolamiento de pedidos concurrentes al mismo dispositivo vive en kernel_scheduler, no en IO.',
        'Soporta exactamente 3 operaciones: STDIN, STDOUT, SLEEP.',
        'No hay reconexión automática ante una caída de la conexión con el kernel.',
      ],
    },
  ],
}
