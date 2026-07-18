# Informe: módulo `swap`

> **(fuentes: código)** / **(fuentes: inferencia)** al final de cada bloque.

## 1. Intro teórica

`swap` simula el **almacenamiento secundario** donde se guardan los procesos suspendidos cuando no
entran en memoria principal. Es, a propósito, el módulo más simple y "tonto" de todo el sistema: no
sabe qué es un proceso, un segmento, ni una política de reemplazo — solo expone un archivo dividido
en bloques de tamaño fijo y responde "leer bloque N" / "escribir bloque N". Toda la inteligencia
(qué bloque le corresponde a qué proceso, cuáles están libres) vive en `kernel_memory`.
**(fuentes: teoría SO, inferencia)**

## 2. Responsabilidad del módulo

Persistir bloques de bytes en un archivo binario de tamaño fijo, y nada más. **(fuentes: código)**

## 3. Ciclo de vida / `main()` (`swap/src/main.c:19-106`)

1. `obtener_config(argv[1])` (`:126-135`) lee `swap.config`.
2. `inicializar_archivo_swap()` (`:109-124`): `open(swap_file_path, O_RDWR|O_CREAT, 0664)` +
   `ftruncate(fd_swap, swap_file_size)` — fija el tamaño total del archivo **de una sola vez**, al
   arrancar. No hay crecimiento dinámico posterior.
3. Se conecta a Kernel Memory como **cliente** (`crear_conexion`, `:33`).
4. Handshake: manda `t_modulo=SWAP` (`:40-45`), y **sin esperar pedido**, manda directamente
   `block_size` y `swap_file_size` (`:48-49`) para que KM calcule la cantidad total de bloques
   disponibles; espera confirmación (`:51-58`).
5. Entra a un único loop bloqueante (`:61-101`) que atiende pedidos de KM hasta que la conexión se
   corta — en ese caso, termina el proceso (`:103-105`, sin reconexión).

**(fuentes: código)**

## 4. Las dos operaciones soportadas

| Operación | Recibe | Hace | Responde |
|---|---|---|---|
| `ESCRIBIR_BLOQUE_SWAP` (`:64-80`) | `numero_bloque` (uint32) + `block_size` bytes | `pwrite(fd_swap, contenido, block_size, numero_bloque * block_size)` | `ok=1` |
| `LEER_BLOQUE_SWAP` (`:82-95`) | `numero_bloque` (uint32) | `pread(fd_swap, contenido, block_size, numero_bloque * block_size)` | los `block_size` bytes crudos (**sin** código de éxito previo) |

**Asimetría a notar**: la respuesta de lectura no lleva un `ok` como la de escritura — si preguntan
por manejo de errores en la defensa, vale aclarar esta diferencia. **swap siempre opera con bloques
completos**: un read-modify-write parcial (para escrituras de tamaño menor a un bloque) lo arma
`kernel_memory`, no `swap` — ver [Informe de Kernel Memory](06-kernel-memory.md) §5.
**(fuentes: código)**

## 5. Estructuras de datos

Mínimas y todas globales: `fd_swap`, `swap_file_path`, `swap_file_size`, `block_size`
(`swap/src/swap.h`). No hay listas, bitmaps ni contadores de bloques libres/ocupados **dentro de
swap** — esa contabilidad (`lista_bloques_swap_libres`, `obtener_bloque_libre()`) vive enteramente
en `kernel_memory`, usando una lista simple (no un bitmap). **(fuentes: código)**

## 6. Comunicación con Kernel Memory

Un solo socket persistente, `swap` como cliente. **Protocolo crudo, no `t_paquete`**: opcode (`int`)
+ payload de tipo fijo según el opcode — ver [Informe de Comunicaciones](02-comunicaciones.md) §5
para la lista completa de excepciones al protocolo de paquetes genérico. **(fuentes: código)**

## 7. Sincronización

**No hay mutex ni semáforos propios**: `swap` es single-threaded, procesa un pedido a la vez sobre
una única conexión — no hay condición de carrera posible internamente. La variable
`sem_cpus_libres` (`main.c:9`) está declarada solo porque el enlazado con `utils.c` la requiere; no
se usa acá. Toda exclusión mutua real sobre "quién puede acceder a qué bloque" es responsabilidad de
Kernel Memory. **(fuentes: código)**

## 8. Configuración (`swap/swap.config`)

`IP_KMEM`/`PUERTO_KMEM`, `LOG_LEVEL`, `SWAP_FILE_PATH` (`/tmp/tp_so_swapfile.bin` en el ejemplo),
`SWAP_FILE_SIZE` (2048 bytes en el ejemplo), `BLOCK_SIZE` (64 bytes → 32 bloques en el ejemplo). **No
hay parámetro de retardo simulado** (`RETARDO`) en este config, a diferencia de otros módulos del
TP — `swap` no simula latencia artificial. **(fuentes: código)**

## 9. Puntos no triviales para la defensa

- **Sin compactación ni fragmentación dentro de swap**: el archivo es de tamaño fijo desde el
  arranque; la compactación de la que se habla en el resto del sistema es sobre memoria principal
  en `kernel_memory`, no sobre este archivo.
- **El contenido del archivo no se inicializa explícitamente a cero** — solo `ftruncate`, que en
  Linux típicamente rellena con ceros lógicos vía sparse file, pero no está garantizado en todos los
  sistemas de archivos.
- Si se preguntara "¿qué pasa si swap se queda sin bloques libres?": la respuesta es que `swap` ni
  se entera — es Kernel Memory quien lleva la cuenta de bloques libres y decide si hay espacio antes
  de pedir una escritura.

**(fuentes: código, inferencia)**
