# Informe: Comunicaciones entre módulos

> Nota sobre fuentes: los bloques marcan **(fuentes: código)** cuando está verificado línea por
> línea, **(fuentes: inferencia)** cuando se deduce de cómo encajan las piezas, y
> **(fuentes: teoría SO)** cuando es un concepto general de la materia.

## 1. Intro teórica: comunicación entre procesos por sockets

Como los 6 módulos son procesos independientes (potencialmente en máquinas distintas), no pueden
compartir memoria ni variables directamente: necesitan un mecanismo de **IPC (comunicación entre
procesos)**. Este TP usa **sockets TCP** (conexión orientada, confiable, en orden) con un modelo
**cliente-servidor**: cada módulo levanta un socket servidor para que otros se conecten, y a la vez
actúa como cliente para conectarse a otros módulos según corresponda. Sobre esa conexión TCP se
define un **protocolo de aplicación propio** ("paquetes") para saber dónde empieza y termina cada
mensaje, algo que TCP no garantiza por sí solo (TCP es un stream de bytes, no mensajes delimitados).
**(fuentes: teoría SO)**

## 2. El protocolo de paquetes

### 2.1. Estructuras (`utils/src/utils/utils.h:67-91`)

- **`t_buffer`**: `{ int size; void* stream; }` — el payload crudo, ya serializado.
- **`t_paquete`**: `{ op_code codigo_operacion; t_estado estado; t_buffer* buffer; }` — el mensaje completo: qué operación es + el contenido.
- **`op_code`**: un enum con ~30 códigos (`INICIAR_PROCESO`, `PEDIR_INSTRUCCIONES`, `LEER_MEMORIA`, `EJECUTAR_PROCESO`, `SYSCALL`, `MUTEX_LOCK`, `SEG_FAULT`, `ESCRIBIR_BLOQUE_SWAP`, `SUSPENDER_PROCESO`, `CREAR_SEGMENTO`, `INICIAR_COMPACTACION`, etc., `utils.h:28-63`). Es la "identidad" de cada mensaje: el que recibe hace un `switch` sobre este valor para saber qué hacer.

Dato de color: el enum original (comentado en `utils.h:22-27`) solo tenía `MENSAJE` y `PAQUETE` —
todo lo demás se fue agregando a medida que se necesitaba cada operación. **(fuentes: código)**

### 2.2. Formato "sobre el cable" (serialización)

Un paquete serializado (`serializar_paquete`, `utils/src/utils/utils.c:104-116`) queda así:

```
[ codigo_operacion (4 bytes) ][ size del buffer (4 bytes) ][ stream (size bytes) ]
```

Dentro del `stream`, cada valor individual que se agregó con `agregar_a_paquete` (`utils.c:153-161`)
queda codificado como **TLV simplificado** (tamaño + valor, sin un "tipo" explícito — quien lee debe
saber de antemano en qué orden vienen los campos):

```
[ tamanio_campo_1 (4B) ][ campo_1 (tamanio_campo_1 bytes) ][ tamanio_campo_2 (4B) ][ campo_2 ]...
```

**(fuentes: código)**

### 2.3. Funciones principales (`utils/src/utils/utils.c`)

| Función | Línea | Qué hace |
|---|---|---|
| `crear_paquete()` | 145-151 | Reserva un `t_paquete` vacío con `codigo_operacion = PAQUETE`. |
| `agregar_a_paquete(paquete, valor, tamanio)` | 153-161 | Agrega un campo al buffer (TLV) via `realloc`. |
| `enviar_paquete(paquete, socket)` | 163-171 | Serializa y hace `send()`. |
| `enviar_mensaje(mensaje, socket)` | 118-136 | Atajo para mandar un string suelto con `codigo_operacion = MENSAJE` (no usa el mecanismo de campos TLV, es un caso especial). |
| `recibir_operacion(socket)` | 180-190 | Lee **solo** el primer `int` (el opcode) — bloqueante. Si `recv` devuelve 0/error, cierra el socket y devuelve -1 (así se detecta que el otro extremo se desconectó). |
| `recibir_buffer(size*, socket)` | 192-200 | Lee el tamaño del buffer y después el contenido, con `MSG_WAITALL` (espera a que llegue todo, aunque el SO lo entregue en varios paquetes IP). |
| `recibir_paquete(socket)` | 209-228 | Llama a `recibir_buffer` y después recorre el stream separando cada campo TLV en una `t_list*` — así el que recibe puede hacer `list_get(lista, i)` para cada campo en el orden esperado. |
| `eliminar_paquete(paquete)` | 173-178 | Libera stream + buffer + paquete. Importante mencionarlo: **quien crea un paquete es responsable de liberarlo** — un olvido acá es memory leak clásico para señalar en la defensa. |

**Patrón de uso típico en cualquier módulo**: `crear_paquete()` → uno o varios `agregar_a_paquete()`
→ `enviar_paquete()` → `eliminar_paquete()`. Del lado receptor: `recibir_operacion()` (bloqueante,
determina qué opcode llegó) → `switch` → `recibir_paquete()` para los datos → `list_get()` por
índice para cada campo. **(fuentes: código, inferencia)**

## 3. Sockets: quién es cliente y quién es servidor

| Función | Archivo | Rol |
|---|---|---|
| `iniciar_servidor(puerto)` | `utils/src/utils/hello.c:8-54` | `getaddrinfo` + `socket` + `SO_REUSEADDR` + `bind` + `listen`. Devuelve el socket servidor. |
| `esperar_conexion(socket_servidor)` / `aceptar_conexiones(socket_servidor)` | `utils.c:59-73`, `294-365` | `accept()` de una conexión. `aceptar_conexiones` además hace el **handshake de identificación** y lanza un hilo por cliente (`pthread_create` + `pthread_detach`, `utils.c:361-363`). |
| `crear_conexion(ip, puerto)` | `utils.c:9-52` | Lado cliente: `getaddrinfo` + `socket` + `connect`. |
| `liberar_conexion(socket)` | `utils.c:54-57` | `close()`. |

**Quién es servidor de quién** (para el diagrama del mapa rápido):

- **kernel_scheduler**: servidor de CPU e IO (ambos se conectan a él).
- **kernel_memory**: servidor de CPU, kernel_scheduler, swap y memory_stick (todos se conectan a él para el registro inicial).
- **memory_stick**: además de registrarse como cliente ante KM, levanta **su propio servidor** para que las CPUs se conecten directo (`memory_stick/src/main.c`, función `iniciar_servidor` propia).
- **cpu, io, swap**: solo actúan como clientes (no aceptan conexiones entrantes salvo el canal de interrupciones de CPU, que en la práctica es otra conexión saliente hacia KS en un puerto distinto).

**(fuentes: código)**

## 4. Handshake de identificación — **dos mecanismos distintos conviviendo**

Vale la pena remarcarlo porque puede generar confusión si preguntan "cómo se identifica un módulo":

- **Mecanismo A — `aceptar_conexiones` (`utils.c:294-365`)**: el que se conecta manda un `int` crudo
  con su `t_modulo` (`CPU=1, KS=2, SWAP=3, MEMSTICK=4, IO=5, KM=6`, `hello.h:23-30`). Según el tipo,
  puede mandar un segundo dato: CPU manda su `id` (`utils.c:319`), MEMSTICK e IO mandan su `tamanio`
  (`utils.c:344,348` — en el caso de IO ese "tamaño" es en realidad el largo del nombre del
  dispositivo que viene después). El servidor responde `ok=1` desde `manejar_cliente` (`utils.c:263-283`).
- **Mecanismo B — `verificar_conexion` (`utils.c:76-99`)**: usado del lado cliente hacia
  Kernel Memory — manda su `t_modulo` y espera una confirmación `int` por `recv`. Es funcionalmente
  parecido al mecanismo A pero está implementado por separado (nombre de función distinto, sin pasar
  por `aceptar_conexiones`).
- **Caso particular de IO**: después del handshake genérico, manda además el **nombre lógico** del
  dispositivo (ej. `"STDIN_STDOUT"`, `"IMPRESORA"`) como length-prefixed string
  (`io/src/main.c:75-77`), que kernel_scheduler usa para registrar el módulo con
  `registrar_modulo_io(socket, nombre)` (`kernel_scheduler/src/main.c:1140-1159`) — así el kernel
  sabe a qué IO mandarle cada pedido cuando el proceso pide, por ejemplo, `"STDIN_STDOUT"`.

**(fuentes: código)**

## 5. Excepciones al protocolo de paquetes (no todo usa `t_paquete`)

No toda la comunicación del sistema pasa por el mecanismo de paquetes de arriba. Tres canales usan
`send`/`recv` con opcodes y datos crudos, sin el envoltorio `t_paquete`/TLV:

- **CPU ↔ memory_stick** (lectura/escritura directa de memoria): opcode (`LEER_MEMORIA`/`ESCRIBIR_MEMORIA`) + dirección + tamaño, todo a mano.
- **kernel_memory ↔ swap**: `ESCRIBIR_BLOQUE_SWAP`/`LEER_BLOQUE_SWAP` + número de bloque + los bytes del bloque, crudo.
- **kernel_memory ↔ memory_stick** (cuando KM necesita acceder a memoria directamente): mismo estilo crudo.

**Por qué importa señalarlo**: si en la defensa preguntan "¿todo pasa por el mismo protocolo de
paquetes?", la respuesta correcta es *no* — los canales de **alto volumen de datos** (acceso a
memoria física, bloques de swap) usan un protocolo más liviano ad-hoc, mientras que los canales de
**control/decisiones** (KS↔CPU, KS↔KM) usan el `t_paquete` genérico. Es una decisión de diseño
razonable (evitar el overhead de armar/parsear TLV para transferencias de datos grandes y
frecuentes), aunque también se puede leer como una inconsistencia de estilo del código.
**(fuentes: inferencia)**

## 6. Logging

Todos los módulos usan `t_log*` de so-commons-library (`commons/log.h`), inicializado con el mismo
patrón en cada `main.c`: leer `LOG_LEVEL` del config propio del módulo con
`log_level_from_string(config_get_string_value(config, "LOG_LEVEL"))` y crear el logger con
`log_create(archivo, "NOMBRE_MODULO", true, log_level)`. El logger es una variable `extern` global
compartida entre el `main.c` de cada módulo y `utils.c` (así las funciones genéricas de
comunicación también pueden loguear). **(fuentes: código)**
