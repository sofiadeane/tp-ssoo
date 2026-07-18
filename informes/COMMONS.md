# Uso de so-commons-library en este TP

Este informe describe **qué funciones de la `so-commons-library`** (la biblioteca provista por la cátedra) usa cada módulo, **en qué archivo/línea** aparecen, y **para qué** las usa dentro de la lógica de este TP. El objetivo es que cualquiera (persona o agente) que lea el código sepa inmediatamente de dónde sale cada función que no está definida en este repo.

## 1. Cómo se linkea la librería

`so-commons-library` **no está vendorizada en este repo**: es una librería externa (típicamente clonada e instalada aparte, ej. como sibling en `so-deploy/so-commons-library`) que se linkea dinámicamente contra cada binario. Cada módulo la declara en su `settings.mk`:

```
LIBS=utils commons pthread readline m
```

(`utils` es la librería propia de este repo, ver sección 2; `commons` es `libcommons.so`, instalada por la cátedra; `pthread`, `readline` y `m` son librerías del sistema, no de la cátedra).

Los headers de commons se incluyen como `<commons/...>` (resueltos vía `-I` hacia donde esté instalada la librería, normalmente `/usr/local/include`).

## 2. Capa `utils/`: quién re-expone qué a los demás módulos

`utils/` es una librería propia de este TP (se compila como `lib/libutils.a` y cada módulo la linkea estáticamente) que envuelve el protocolo de sockets compartido (`t_paquete`, `enviar_paquete`, `recibir_paquete`, `iniciar_servidor`, etc.) usado entre todos los módulos.

Dos headers de `utils/` son el punto de entrada de *casi todos* los módulos:

- **`utils/src/utils/hello.h`**: incluye `<commons/log.h>` y `<commons/config.h>`.
- **`utils/src/utils/utils.h`**: incluye `<commons/log.h>`, `<commons/config.h>`, `<commons/collections/list.h>` y `<commons/collections/queue.h>`.

Como `cpu.h`, `io.h`, `kernel_memory.h` y `scheduler.h` incluyen `<utils/hello.h>` y `<utils/utils.h>`, **heredan transitivamente** los tipos `t_log`, `t_config`, `t_list` y `t_queue` sin necesitar volver a incluir los headers de `commons` — por eso en esos módulos vas a ver `t_list*`/`t_queue*` usados libremente aunque el propio archivo no tenga un `#include <commons/collections/...>`.

La excepción es `memory_stick/src/memory_stick.h`, que además de incluir `<utils/utils.h>` vuelve a incluir `<commons/log.h>` y `<commons/config.h>` de forma explícita (redundante pero inofensivo, por los guards de header).

`utils/src/utils/utils.c` (la implementación de esa capa compartida) es en sí mismo un consumidor pesado de commons: usa `log_info`/`log_error`/`log_warning` (26 apariciones) para loguear el ciclo de vida genérico de conexiones, y `list_create`/`list_add`/`list_destroy_and_destroy_elements`/`list_get` dentro de `recibir_paquete()` (línea ~209-228 de `utils.c`) para parsear el buffer binario que llega por socket en una lista de campos (`t_list*` de `void*`), y para mantener `cpus_conectadas` (la lista global de CPUs registradas).

## 3. `commons/config` — archivos de configuración

**Funciones usadas:** `config_create`, `config_get_string_value`, `config_get_int_value`, `config_get_array_value`, `config_destroy`.

**Por qué:** el enunciado exige que cada módulo lea sus parámetros de un archivo de configuración pasado por línea de comandos (sin recompilar). `config_create(path)` parsea ese archivo a un `t_config*`; el resto de las funciones leen claves puntuales.

| Módulo | Dónde (`obtener_config()`) | Claves leídas |
|---|---|---|
| `kernel_scheduler` | `src/main.c` (~línea 143) | `PUERTO_ESCUCHA`, `LOG_LEVEL`, `IP_KERNEL_MEMORY`, `PUERTO_KERNEL_MEMORY`, `RECURSOS` (array, vía `config_get_array_value`), `PLANIFICATION_ALGORITHM`, `RR_QUANTUM`, `QUEUES_ALGORITHMS` (array), `QUEUE_PREEMPTION`, `SUSPENSION_TIMEOUT` |
| `kernel_memory` | `src/main.c` (~línea 79) | `PUERTO_ESCUCHA`, `LOG_LEVEL`, `SCRIPTS_BASEPATH`, `INSTRUCTION_DELAY`, `ALLOCATION_STRATEGY`, `COMPACTION_DELAY`, `SEGMENT_MAX_SIZE` |
| `cpu` | `src/main.c` | IPs/puertos de KS, KM, canal de interrupciones, `LOG_LEVEL`, `SEGMENT_MAX_SIZE`, `CPU_ID` |
| `memory_stick` | `src/main.c` (~línea 88) | `PUERTO_ESCUCHA`, `LOG_LEVEL`, `MEMORY_DELAY`, `IP_KMEM`, `PUERTO_KMEM`, `IP` |
| `swap` | `src/main.c` (~línea 120) | `IP_KMEM`, `PUERTO_KMEM`, `LOG_LEVEL`, `SWAP_FILE_PATH`, `SWAP_FILE_SIZE`, `BLOCK_SIZE` |
| `io` | `src/main.c` (~línea 151) | `IP_KERNEL`, `PUERTO_KERNEL`, `LOG_LEVEL` |

`config_destroy` se llama al cerrar limpiamente (`cpu/src/main.c:666`, `memory_stick/src/main.c:115`) para liberar el `t_config*`.

## 4. `commons/log` — logs mínimos y obligatorios

**Funciones usadas:** `log_create`, `log_info`, `log_error`, `log_warning`, `log_debug` (1 sola vez), `log_level_from_string`, `log_destroy`.

**Por qué:** el enunciado exige que **todos** los logs (incluidos los "mínimos y obligatorios" listados por módulo) se hagan con `so-commons-library`, en nivel `LOG_LEVEL_INFO` como mínimo, guardados en archivo. `log_create(archivo, tag, true, log_level)` crea el `t_log*` global de cada módulo (el `true` es `is_active_console`, para que además de al archivo se imprima por consola); `log_level_from_string(...)` convierte el string `LOG_LEVEL` del `.config` (ej. `"INFO"`) al enum que espera `log_create`.

Cada módulo crea su logger una sola vez en `main()`:

- `kernel_scheduler`: `logger` (no tiene nombre de archivo por instancia, un solo proceso).
- `kernel_memory`: `log_create("kernel_memory.log", "KERNEL_MEMORY", true, log_level)`.
- `cpu`: `log_create(nombre_log, "CPU", true, log_level)` con `nombre_log` armado como `cpu_<id>.log` — **un archivo de log por instancia de CPU**, como pide el enunciado.
- `memory_stick`, `swap`, `io`: un logger por proceso, análogo.

El volumen de uso de `log_info`/`log_error`/`log_warning` es alto y está esparcido por toda la lógica de negocio (133 + 68 + 23 llamadas en todo el repo): son tanto los logs **obligatorios por el enunciado** (con el formato exacto `"## ..."`) como logs internos de debug agregados por el equipo (sin el prefijo `##`, no exigidos por la consigna, libres de formato).

`log_debug` aparece una sola vez, en `kernel_memory/src/main.c:499`, para un detalle interno de `GUARDAR_CONTEXTO` que no es un log obligatorio (por eso usa `DEBUG` y no `INFO`).

## 5. `commons/string` — parseo de texto

**Funciones usadas:** `string_split`, `string_array_destroy`, `string_duplicate`.

| Función | Dónde | Para qué |
|---|---|---|
| `string_split(instruccion, " ")` | `cpu/src/main.c:255` | Parte una línea de pseudocódigo (ej. `"SET AX 6"`) en un arreglo de strings (`partes[0]="SET"`, `partes[1]="AX"`, `partes[2]="6"`) — es el paso **Decode** del ciclo de instrucción de la CPU. |
| `string_array_destroy(partes)` | `cpu/src/main.c:458` | Libera el arreglo devuelto por `string_split` al terminar de ejecutar la instrucción. |
| `string_duplicate(path)` | `kernel_memory/src/main.c:911` | Copia el path del archivo de pseudocódigo al crear el `t_proceso_km` (para no depender del tiempo de vida del buffer recibido por socket). |
| `string_duplicate(linea)` | `kernel_memory/src/main.c:1195` | Copia la línea de instrucción leída del archivo de pseudocódigo (dentro de `obtener_instruccion()`) antes de devolverla, ya que el buffer `linea` es una variable local que se destruye al salir de la función. |

## 6. `commons/collections/list` — listas de tamaño dinámico

**Funciones usadas:** `list_create`, `list_add`, `list_get`, `list_size`, `list_remove`, `list_remove_element`, `list_is_empty`, `list_destroy`, `list_destroy_and_destroy_elements`.

Es la estructura más usada de toda la librería (132 apariciones en `kernel_memory`, 78 en `kernel_scheduler`, 10 en `utils.c`). Se usa para **todo lo que no necesita ser estrictamente FIFO** (para colas FIFO/RR se usa `t_queue`, ver sección 7):

| Uso | Módulo | Variable / estructura |
|---|---|---|
| Parseo de paquetes de red (`recibir_paquete`) | `utils.c` | lista de campos (`void*`) de un mensaje recibido — genérico para todos los módulos |
| Todos los PCB del sistema | `kernel_scheduler` | `lista_todos_pcb` |
| Mutex del sistema | `kernel_scheduler` | `lista_mutexes` |
| Módulos de IO conectados | `kernel_scheduler` | `lista_modulos_io` |
| CPUs conectadas | `kernel_scheduler` / `kernel_memory` (vía `utils.h`) | `cpus_conectadas` |
| Procesos finalizados (para el resumen final) | `kernel_scheduler` | `lista_procesos_finalizados` |
| Procesos gestionados | `kernel_memory` | `lista_procesos` |
| Tabla de segmentos activos / suspendidos por proceso | `kernel_memory` | `t_proceso_km.segmentos`, `t_proceso_km.segmentos_suspendidos` |
| Huecos libres de memoria | `kernel_memory` | `lista_huecos` |
| Memory Sticks conectados | `kernel_memory` | `memory_sticks` |
| Bloques de SWAP libres | `kernel_memory` | `lista_bloques_swap_libres` |
| Bloques de SWAP asignados a un segmento suspendido | `kernel_memory` | `t_segmento_suspendido.bloques_swap` |

## 7. `commons/collections/queue` — colas FIFO

**Funciones usadas:** `queue_create`, `queue_push`, `queue_pop`, `queue_peek` (1 sola vez), `queue_is_empty`, `queue_destroy`.

Uso exclusivo de `kernel_scheduler` (81 apariciones) — tiene sentido, porque es el único módulo que planifica procesos y necesita colas estrictamente FIFO:

| Cola | Para qué |
|---|---|
| `cola_new` | Planificación de largo plazo (NEW → READY) |
| `colas_ready[0..num_colas-1]` | Una cola por nivel de prioridad (FIFO/RR/CMN — planificación de corto plazo) |
| `t_mutex_simulado.cola_bloqueados` | Procesos bloqueados esperando tomar un mutex |
| `t_io_modulo.cola` | Pedidos de IO pendientes para un mismo módulo de IO |
| `cola_susp_ready` / `cola_susp_block` | Planificación de mediano plazo (SUSP_READY / SUSP_BLOCK) |

## 8. `commons/collections/dictionary` — incluido pero **sin uso**

`kernel_scheduler/src/main.c:7` incluye `<commons/collections/dictionary.h>`, pero no hay ningún llamado a `dictionary_*` en todo el repo. Es un include muerto — puede sacarse sin afectar nada (no se documenta más por no ser código productivo).

## 9. Resumen rápido por módulo

| Módulo | config | log | string | list | queue |
|---|---|---|---|---|---|
| `kernel_scheduler` | ✅ (incl. arrays) | ✅ (más volumen) | — | ✅ | ✅ (único módulo) |
| `kernel_memory` | ✅ | ✅ (+`log_debug`) | ✅ (`string_duplicate` x2) | ✅ (más volumen) | — |
| `cpu` | ✅ | ✅ | ✅ (`string_split`/`string_array_destroy`) | mínimo | — |
| `memory_stick` | ✅ | ✅ | — | mínimo | — |
| `swap` | ✅ | ✅ | — | — | — |
| `io` | ✅ | ✅ | — | — | — |
| `utils/` (compartida) | — | ✅ (genérico) | — | ✅ (`recibir_paquete`, `cpus_conectadas`) | — |
