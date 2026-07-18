// Contenido pedagógico del módulo Comunicaciones entre módulos.
// Fuente: informes/02-comunicaciones.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'Los 6 módulos del sistema son procesos independientes, potencialmente corriendo en máquinas distintas: no comparten memoria ni variables. La única forma de comunicarse es {{g:IPC|la comunicación entre procesos ("Inter-Process Communication"): mecanismos para que procesos que no comparten memoria se pasen datos}}, y este TP elige {{g:sockets|el "enchufe" de red por el que dos procesos se conectan y mandan datos}} {{g:TCP|el protocolo de red que garantiza que los datos lleguen completos y en orden, sin perderse}} con un modelo cliente-servidor — cada módulo puede levantar su propio servidor (para que otros se conecten) y a la vez actuar como cliente de otros módulos.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Idea central',
      text: 'TCP garantiza un stream de bytes confiable y en orden, pero no garantiza mensajes delimitados. Por eso el sistema define su propio protocolo de aplicación sobre TCP — {{g:paquete|el mensaje que viaja por la red entre dos módulos, empaquetado con un formato fijo}} — para saber dónde empieza y termina cada mensaje.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'Todo lo que viaja entre módulos se empaqueta en una estructura común, definida en utils/src/utils/utils.h:67-91.',
    },
    {
      type: 'ul',
      items: [
        '`t_buffer`: `{ int size; void* stream; }` — el payload crudo, ya {{g:serializado|convertido en una tira de bytes para poder mandarlo por la red}}.',
        '`t_paquete`: `{ op_code codigo_operacion; t_estado estado; t_buffer* buffer; }` — el mensaje completo: qué operación es + el contenido.',
        '`op_code`: un enum de ~30 {{g:opcodes|el "código" que identifica qué tipo de mensaje es, para que el que lo recibe sepa qué hacer con él}} (`INICIAR_PROCESO`, `PEDIR_INSTRUCCIONES`, `LEER_MEMORIA`, `EJECUTAR_PROCESO`, `SYSCALL`, `MUTEX_LOCK`, `SEG_FAULT`, `ESCRIBIR_BLOQUE_SWAP`, `SUSPENDER_PROCESO`, `CREAR_SEGMENTO`, `INICIAR_COMPACTACION`, etc.). Es la "identidad" del mensaje: quien lo recibe hace un `switch` sobre este valor.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Dato de color',
      text: 'El enum de `op_code` original (comentado en utils.h:22-27) solo tenía `MENSAJE` y `PAQUETE` — todo lo demás se fue agregando a medida que se necesitaba cada operación nueva.',
    },
    {
      type: 'p',
      text: 'Un paquete serializado (`serializar_paquete`, utils.c:104-116) queda así "sobre el cable":',
    },
    {
      type: 'code',
      text: '[ codigo_operacion (4 bytes) ][ size del buffer (4 bytes) ][ stream (size bytes) ]',
    },
    {
      type: 'p',
      text: 'Dentro del stream, cada valor agregado con `agregar_a_paquete` (utils.c:153-161) queda codificado como {{g:TLV|"Type-Length-Value": un formato donde cada campo se guarda como tamaño + valor (acá simplificado: sin un campo de "tipo", solo tamaño + valor)}} simplificado — tamaño + valor, sin un campo de "tipo" explícito. Quien lee tiene que saber de antemano en qué orden vienen los campos:',
    },
    {
      type: 'code',
      text: '[ tamanio_campo_1 (4B) ][ campo_1 (tamanio_campo_1 bytes) ][ tamanio_campo_2 (4B) ][ campo_2 ]...',
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'utils.c concentra las funciones que arman, mandan y desarman paquetes. Son las mismas para los 6 módulos.',
    },
    {
      type: 'table',
      headers: ['Función', 'Línea', 'Qué hace'],
      rows: [
        ['`crear_paquete()`', '145-151', 'Reserva un `t_paquete` vacío con `codigo_operacion = PAQUETE`.'],
        ['`agregar_a_paquete(paquete, valor, tamanio)`', '153-161', 'Agrega un campo al buffer (TLV) via `realloc`.'],
        ['`enviar_paquete(paquete, socket)`', '163-171', 'Serializa y hace `send()`.'],
        ['`enviar_mensaje(mensaje, socket)`', '118-136', 'Atajo para mandar un string suelto con `codigo_operacion = MENSAJE` — no usa el mecanismo de campos TLV, es un caso especial.'],
        ['`recibir_operacion(socket)`', '180-190', 'Lee solo el primer int (el opcode) — bloqueante. Si `recv` devuelve 0/error, cierra el socket y devuelve -1 (así se detecta que el otro extremo se desconectó).'],
        ['`recibir_buffer(size*, socket)`', '192-200', 'Lee el tamaño del buffer y después el contenido, con `MSG_WAITALL` (espera a que llegue todo, aunque el SO lo entregue en varios {{f:paquetes IP|Estos son paquetes a nivel de red (los fragmentos que arma el sistema operativo para transportar los datos), no el "paquete" (t_paquete) que arma el protocolo de esta aplicación — son dos conceptos distintos que comparten nombre.}}).'],
        ['`recibir_paquete(socket)`', '209-228', 'Llama a `recibir_buffer` y recorre el stream separando cada campo TLV en una `t_list*` — el que recibe hace `list_get(lista, i)` por cada campo en el orden esperado.'],
        ['`eliminar_paquete(paquete)`', '173-178', 'Libera stream + buffer + paquete. Quien crea un paquete es responsable de liberarlo — un olvido acá es memory leak clásico.'],
      ],
    },
    {
      type: 'p',
      text: 'Sockets — quién es cliente y quién es servidor:',
    },
    {
      type: 'table',
      headers: ['Función', 'Archivo', 'Rol'],
      rows: [
        ['`iniciar_servidor(puerto)`', 'hello.c:8-54', '`getaddrinfo` + `socket` + `SO_REUSEADDR` + `bind` + `listen`. Devuelve el socket servidor.'],
        ['`esperar_conexion` / `aceptar_conexiones(socket_servidor)`', 'utils.c:59-73, 294-365', '`accept()` de una conexión. `aceptar_conexiones` además hace el {{g:handshake|el "saludo" inicial donde dos procesos se identifican antes de empezar a hablar en serio}} de identificación y lanza un hilo por cliente (`pthread_create` + `pthread_detach`).'],
        ['`crear_conexion(ip, puerto)`', 'utils.c:9-52', 'Lado cliente: `getaddrinfo` + `socket` + `connect`.'],
        ['`liberar_conexion(socket)`', 'utils.c:54-57', '`close()`.'],
      ],
    },
    {
      type: 'ul',
      items: [
        '`KS`: servidor de `cpu` e `io` (ambos se conectan a él).',
        '`KM`: servidor de `cpu`, `KS`, `swap` y `memory_stick` (todos se conectan a él para el registro inicial).',
        '`memory_stick`: además de registrarse como cliente ante `KM`, levanta su propio servidor para que las `cpu`s se conecten directo.',
        '`cpu`, `io`, `swap`: solo actúan como clientes (no aceptan conexiones entrantes, salvo el canal de interrupciones de `cpu`, que en la práctica es otra conexión saliente hacia `KS` en un puerto distinto).',
      ],
    },
  ],

  stepByStep: [
    {
      type: 'p',
      text: 'Patrón de uso típico para mandar algo, en cualquier módulo:',
    },
    {
      type: 'ol',
      items: [
        '`crear_paquete()` — reserva el paquete vacío.',
        '`agregar_a_paquete()` — una o varias veces, uno por cada campo que hay que mandar.',
        '`enviar_paquete()` — serializa y hace `send()` por el socket.',
        '`eliminar_paquete()` — libera toda la memoria reservada (obligatorio, o hay leak).',
      ],
    },
    {
      type: 'p',
      text: 'Del lado receptor:',
    },
    {
      type: 'ol',
      items: [
        '`recibir_operacion()` — bloqueante, determina qué opcode llegó.',
        '`switch` sobre ese opcode para decidir qué hacer.',
        '`recibir_paquete()` — trae los datos asociados.',
        '`list_get()` por índice, uno por cada campo, en el orden en que se agregaron del otro lado.',
      ],
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'Handshake — mecanismo A: aceptar_conexiones (utils.c:294-365)',
      text: 'El que se conecta manda un int crudo con su `t_modulo` (`CPU`=1, `KS`=2, `SWAP`=3, `MEMSTICK`=4, `IO`=5, `KM`=6). Según el tipo, puede mandar un segundo dato: `cpu` manda su id, `memory_stick` e `io` mandan su tamanio (en el caso de `io`, ese "tamaño" es en realidad el largo del nombre del dispositivo que viene después). El servidor responde `ok=1` desde `manejar_cliente`.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Handshake — mecanismo B: verificar_conexion (utils.c:76-99)',
      text: 'Usado del lado cliente hacia `KM`: manda su `t_modulo` y espera una confirmación int por `recv`. Es funcionalmente parecido al mecanismo A, pero está implementado por separado (nombre de función distinto, sin pasar por `aceptar_conexiones`). Son dos mecanismos de identificación distintos conviviendo en el mismo sistema.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Caso particular de IO',
      text: 'Después del handshake genérico, `io` manda además el nombre lógico del dispositivo (ej. `STDIN_STDOUT`, `IMPRESORA`) como {{g:length-prefixed string|un string al que le precede un número indicando cuántos bytes hay que leer, para saber dónde termina}} (io/src/main.c:75-77). `KS` usa ese nombre para registrar el módulo con `registrar_modulo_io(socket, nombre)` — así sabe a qué `io` mandarle cada pedido cuando el proceso pide, por ejemplo, `STDIN_STDOUT`.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Logging',
      text: 'Todos los módulos usan `t_log*` de so-commons-library (commons/log.h), inicializado igual en cada main.c: leer `LOG_LEVEL` del config propio con `log_level_from_string(config_get_string_value(config, "LOG_LEVEL"))` y crear el logger con `log_create(archivo, "NOMBRE_MODULO", true, log_level)`. El logger es una variable `extern` global compartida entre el main.c de cada módulo y utils.c, así las funciones genéricas de comunicación también pueden loguear.',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'No todo usa t_paquete — excepciones al protocolo',
      text: 'Tres canales usan `send`/`recv` con opcodes y datos crudos, sin el envoltorio `t_paquete`/TLV: `cpu` ↔ `memory_stick` (acá la `cpu` le pide a `memory_stick` leer o escribir memoria directamente, con los opcodes `LEER_MEMORIA`/`ESCRIBIR_MEMORIA` + dirección + tamaño, todo armado a mano), `KM` ↔ `swap` (`KM` le pide a `swap` escribir o leer un bloque completo con los opcodes `ESCRIBIR_BLOQUE_SWAP`/`LEER_BLOQUE_SWAP` + número de bloque + los bytes del bloque, todo crudo), y `KM` ↔ `memory_stick` cuando `KM` necesita acceder a memoria directamente (mismo estilo crudo).',
    },
    {
      type: 'p',
      text: 'Es una trampa típica de examen: si preguntan "¿todo pasa por el mismo protocolo de paquetes?", la respuesta correcta es no. Los canales de alto volumen de datos (memoria física, bloques de swap) usan un protocolo más liviano {{g:ad-hoc|hecho a medida para ese caso puntual, no un protocolo general reutilizable}}; los canales de control/decisiones (`KS`↔`cpu`, `KS`↔`KM`) usan el `t_paquete` genérico. Es una decisión de diseño razonable (evita el overhead de armar/parsear TLV en transferencias grandes y frecuentes), aunque también se puede leer como una inconsistencia de estilo del código.',
    },
  ],

  summary: [
    {
      type: 'ul',
      items: [
        'Todo módulo se comunica por sockets TCP, con un protocolo propio de `paquetes` armado sobre el stream de bytes.',
        '`t_paquete` = `op_code` + `t_buffer`, y el buffer interno codifica cada campo como TLV (tamaño + valor, sin tipo explícito).',
        'Patrón estándar: `crear_paquete` → `agregar_a_paquete` (repetido) → `enviar_paquete` → `eliminar_paquete`. Del lado receptor: `recibir_operacion` → `switch` → `recibir_paquete` → `list_get` por campo.',
        'Existen dos mecanismos de handshake distintos (`aceptar_conexiones` y `verificar_conexion`) que cumplen un rol similar pero no son el mismo código.',
        '`io` es un caso especial: además del handshake genérico, manda su nombre lógico de dispositivo para que `KS` lo registre.',
        'No todo pasa por `t_paquete`: `cpu`↔`memory_stick`, `KM`↔`swap` y `KM`↔`memory_stick` (acceso directo) usan un protocolo crudo de opcode + datos, sin TLV.',
      ],
    },
  ],
}

// Fuente: informes/02-comunicaciones.md
