// Contenido pedagógico del módulo IO.
// Fuente: informes/07-io.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx. Dentro de cualquier texto podés usar:
//   **negrita**, `código/instrucción`, {{g:TERMINO|explicación corta}},
//   {{f:TERMINO|explicación larga}} (nota al pie) — ver src/lib/richText.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'En un sistema operativo real, cada dispositivo de entrada/salida tiene su propio controlador y maneja interrupciones al terminar una operación. En este TP, el módulo `io` simula un dispositivo genérico: el mismo binario puede representar un teclado, una impresora o un "dispositivo de sleep" según el nombre que se le pase al arrancar — no hay un binario distinto por tipo de dispositivo.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Idea central',
      text: '`io` es, a propósito, el módulo más simple del sistema: recibe un pedido, lo ejecuta, avisa que terminó. No decide nada — toda la inteligencia de "quién espera a quién" vive en kernel_scheduler (el proceso que planifica).',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'Un mismo binario de `io` puede representar cualquier dispositivo. Lo que lo identifica no es su código sino el nombre lógico que recibe por línea de comandos al arrancar (por ejemplo `TECLADO`, `IMPRESORA` o `STDIN_STDOUT`).',
    },
    {
      type: 'ul',
      items: [
        'Identificación por nombre, no por tipo fijo: el despacho de qué hacer se decide en tiempo real según la operación que manda kernel_scheduler, no según el nombre con el que arrancó el proceso.',
        'Nombres compuestos: un `io` llamado `STDIN_STDOUT` puede atender tanto pedidos de `STDIN` como de `STDOUT` sin saber de antemano cuál le va a tocar.',
        'Tres operaciones soportadas en total: `STDIN`, `STDOUT` y `SLEEP`.',
      ],
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: '`io` es un cliente que se conecta una única vez a kernel_scheduler y se queda escuchando pedidos en un loop infinito sobre esa misma conexión — no acepta conexiones entrantes, no tiene servidor propio.',
    },
    {
      type: 'table',
      headers: ['Operación', 'Qué manda kernel_scheduler', 'Qué hace io'],
      rows: [
        ['`STDIN`', 'longitud a leer', 'Lee de la entrada estándar real, corta a esa longitud, manda los bytes leídos directo por el socket (antes de la confirmación de fin).'],
        ['`STDOUT`', 'tamaño (+ mensaje si tamaño > 0)', 'Si el tamaño es 0 lo ignora sin escribir nada; si no, imprime el mensaje por consola.'],
        ['`SLEEP`', 'milisegundos', '`usleep(ms)` — el tiempo de espera simulado de la materia.'],
      ],
    },
    {
      type: 'p',
      text: 'Al terminar cualquiera de las tres, `io` manda `ok=1` — es la señal que kernel_scheduler usa para desbloquear el proceso que esperaba ese io y devolverlo al estado `READY` (listo para ejecutar).',
    },
  ],

  stepByStep: [
    {
      type: 'ol',
      items: [
        '`io` arranca con dos argumentos: el archivo de config y el nombre lógico del dispositivo (por ejemplo `STDIN_STDOUT`).',
        'Se conecta a kernel_scheduler y hace el {{g:handshake|el "saludo" inicial donde dos procesos se identifican antes de empezar a hablar en serio}}: manda su tipo de módulo (`IO`), después el largo del nombre y el nombre en sí.',
        'Espera la confirmación de kernel_scheduler y entra a un loop infinito.',
        'En cada vuelta: recibe el {{g:PID|el número que identifica a cada proceso, como un DNI}} del proceso que pidió la operación, después el nombre de la operación (`STDIN`/`STDOUT`/`SLEEP`) y sus parámetros.',
        'Ejecuta la operación correspondiente (leer de la entrada estándar, imprimir, o dormir).',
        'Manda `ok=1` a kernel_scheduler para avisar que terminó, y vuelve a esperar el próximo pedido.',
      ],
    },
    {
      type: 'p',
      text: 'Del lado de kernel_scheduler, cada io conectado se registra como una estructura `t_io_modulo` con su propia cola de pedidos pendientes, un {{g:mutex|un candado que solo un proceso puede tener a la vez}} y un {{g:semáforo|un contador que coordina cuántos "pueden pasar" al mismo tiempo}} — un hilo dedicado (`hilo_escucha_io`) es el que manda el pedido y espera la confirmación por cada dispositivo.',
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'Coincidencia parcial de nombres',
      text: 'kernel_scheduler busca el módulo `io` por nombre admitiendo coincidencia parcial (no exacta) — pensado justamente para permitir nombres compuestos como `STDIN_STDOUT` que atienden más de una operación.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Asimetría de protocolo en STDIN',
      text: '`STDIN` es el único caso donde io manda datos crudos adicionales (los caracteres leídos) antes de la confirmación final de `ok` — vale la pena tenerlo presente si preguntan por el protocolo exacto.',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'Desconexión sin reintento',
      text: 'Si se cae la conexión con kernel_scheduler, io simplemente termina el proceso — no hay lógica de reconexión. Del lado del kernel, si ese io estaba atendiendo un proceso en ese momento, el {{g:PCB|la "ficha" que el sistema arma para cada proceso, con todos sus datos: estado, prioridad, registros, etc.}} bloqueado puede quedar huérfano (bug conocido a documentar, no a "arreglar" en un examen).',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'STDOUT con tamaño 0 no es un error',
      text: 'Es el caso normal cuando kernel_scheduler todavía no terminó de leer el dato desde kernel_memory (el módulo que administra la memoria). io lo ignora sin cortar la {{f:conexión|Se refiere específicamente al socket TCP entre io y kernel_scheduler, no a la conexión de kernel_scheduler con kernel_memory — son dos sockets completamente independientes, y uno puede seguir vivo mientras el otro todavía está resolviendo un pedido.}} — no hay que confundirlo con una falla.',
    },
  ],

  summary: [
    {
      type: 'ul',
      items: [
        'io es un proceso monohilo y sin estado: no conoce PCBs, prioridades ni algoritmos de planificación.',
        'Toda la exclusión mutua y el encolamiento de pedidos concurrentes al mismo dispositivo vive en kernel_scheduler, no en io.',
        'Soporta exactamente 3 operaciones: `STDIN`, `STDOUT`, `SLEEP`.',
        'No hay reconexión automática ante una caída de la conexión con el kernel.',
      ],
    },
  ],
}

// Fuente: informes/07-io.md
