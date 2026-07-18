# Informe: Otras estructuras de control del sistema

> Este informe **no repite** el de sincronización — ver
> [Informe de Semáforos y Sincronización](03-semaforos-sincronizacion.md) para mutex/semáforos. Acá
> se cubren las **estructuras de datos que representan el estado del sistema** (procesos, memoria,
> dispositivos), independientemente de cómo se protegen.
> **(fuentes: código)** / **(fuentes: inferencia)** / **(fuentes: teoría SO)** al final de cada bloque.

## 1. Intro teórica: las "tablas de control" de un SO

Todo SO necesita mantener el estado de lo que administra en estructuras dedicadas — clásicamente
agrupadas en 4 categorías: **tablas de procesos** (PCB), **tablas de memoria** (segmentos/páginas y
espacio libre), **tablas de E/S** (qué dispositivo está haciendo qué) y **tablas de archivos** (no
aplica en este TP, ya que `memory_stick` no es un filesystem). Este TP tiene una estructura por cada
una de las primeras tres categorías, repartidas entre kernel_scheduler y kernel_memory según a quién
le corresponde esa responsabilidad. **(fuentes: teoría SO)**

## 2. Tabla de procesos: el PCB (`t_pcb`)

`kernel_scheduler/src/scheduler.h:11-27` — el **Process Control Block** de este TP:

```c
typedef struct {
    uint32_t pid;
    t_estado estado;              // NEW, READY, EXEC, BLOCK, SUSP_READY, SUSP_BLOCK, EXIT
    int prioridad;
    uint32_t program_counter;
    int socket_cpu_asignada;
    time_t tiempo_inicio_exec;
    uint32_t tiempo_ejecucion;
    time_t tiempo_entrada_block;
    int cpu_socket;
    int quantum_restante;
    int cola_original;
    int motivo_desalojo;          // DESALOJO_POR_PRIORIDAD/QUANTUM/COMPACTACION
    int generacion_bloqueo;       // invalida timeouts de suspension obsoletos
} t_pcb;
```

Se mantiene en `lista_todos_pcb` (una `t_list*` de so-commons, protegida por
`mutex_lista_todos_pcb`) además de estar referenciado desde la cola correspondiente a su estado
(`colas_ready[]`, `cola_new`, `cola_susp_ready`, `cola_susp_block`). No hay un PCB separado del lado
de `kernel_memory` — KM tiene su propia estructura equivalente para lo que le corresponde (ver §4).
**(fuentes: código)**

## 3. Colas de procesos (`t_queue*` de so-commons-library)

Todas viven en `kernel_scheduler`:

| Cola | Qué contiene | Protegida por |
|---|---|---|
| `cola_new` | Procesos recién creados, esperando pasar a READY | `mutex_new` |
| `colas_ready[]` (array, una por prioridad) | Procesos listos para ejecutar | `mutexes_ready[]` |
| `cola_susp_ready` | Procesos suspendidos (en swap) pero ya sin motivo de bloqueo | `mutex_susp_ready` |
| `cola_susp_block` | Procesos suspendidos y todavía bloqueados (ej. esperando IO) | `mutex_susp_block` |
| `cola_bloqueados` (una por `t_mutex_simulado`) | Procesos esperando tomar un mutex de usuario | `mutex_interno` del mutex |
| `cola` (una por `t_io_modulo`) | Pedidos de IO pendientes para ese dispositivo | `mutex` del `t_io_modulo` |

Ninguna de estas es una estructura propia reimplementada: todas usan `t_queue*` de
`commons/collections/queue.h` (so-commons-library). No se usa `t_dictionary` en ningún módulo del
repo (aunque `kernel_scheduler/src/main.c` incluye el header, no lo termina usando).
**(fuentes: código)**

## 4. Tabla de memoria: segmentos y huecos (`kernel_memory`)

- **`t_proceso_km`** (`kernel_memory/src/kernel_memory.h:32-39`): la "vista de memoria" de cada
  proceso desde KM — path del pseudocódigo, contexto de registros, lista de **segmentos activos**
  y lista de **segmentos suspendidos**.
- **`t_segmento`** (compartido con CPU, `utils/src/utils/utils.h:67-71`): `{id_segmento, base,
  limite}` — la unidad de memoria contigua asignada.
- **`t_segmento_suspendido`** (`kernel_memory.h:12-16`): igual pero con una lista de números de
  bloque en `swap` en vez de una base física.
- **`t_hueco`** (`kernel_memory.h:54-57`): `{base, limite}` — espacio libre contiguo, en
  `lista_huecos`, la estructura que usa `encontrar_hueco` para first/best/worst-fit (ver
  [Informe de Kernel Memory](06-kernel-memory.md) §4).
- **`t_memory_stick_info`** (`kernel_memory.h:45-52`): representa cada Memory Stick conectado como
  una franja `[dir_inicio, dir_inicio+tamanio)` del espacio físico global.

Todas viven en `t_list*` de so-commons (`lista_procesos`, `lista_huecos`, `memory_sticks`). **No hay
tabla de páginas** porque el esquema es de segmentación, no paginación — ver
[Informe de Kernel Memory](06-kernel-memory.md) §0. **(fuentes: código)**

## 5. Tabla de E/S: `t_io_modulo`

`kernel_scheduler/src/scheduler.h:46-53` — representa cada dispositivo IO conectado: nombre, socket,
cola de pedidos pendientes, mutex+semáforo propios, y el PCB que está siendo atendido en este
momento (`pcb_actual`, `NULL` si está libre). Se guardan en `lista_modulos_io`
(protegida por `mutex_lista_io`). Complementa esto `t_io_pedido` (`scheduler.h`, ~líneas 35-43):
representa un pedido puntual de IO — tipo (`SLEEP`/`STDIN`/`STDOUT`), parámetros, y la dirección
lógica involucrada (para STDIN/STDOUT, que necesitan hablar con Kernel Memory). **(fuentes: código)**

## 6. Mutex simulados de usuario: `t_mutex_simulado`

Aunque el mutex en sí es una primitiva de sincronización, la **estructura** que lo representa
(`scheduler.h:56-63`) es una estructura de control más: nombre, si está libre, quién es el dueño,
cola de bloqueados, y la prioridad original del dueño (para poder restaurarla tras la herencia de
prioridad). Se crean al arrancar según la clave `RECURSOS` del config, y viven en `lista_mutexes`.
Ver [Informe de Sincronización](03-semaforos-sincronizacion.md) §5 para la lógica de herencia de
prioridad que opera sobre esta estructura. **(fuentes: código)**

## 7. Tabla de CPUs conectadas: `t_cpu`

`utils/src/utils/utils.h:107-113`: `{id, socket, socket_interrupt, libre, cpu_socket}` — cada CPU
conectada al sistema, si está libre u ocupada en este momento, y sus dos sockets (ejecución +
interrupciones). Vive en `cpus_conectadas` (`t_list*`, compartida entre kernel_scheduler y
kernel_memory vía `utils.c`), protegida por `mutex_cpus`. El semáforo `sem_cpus_libres` (contador de
cuántas CPUs libres hay) es la otra cara de esta misma tabla — ver
[Informe de Sincronización](03-semaforos-sincronizacion.md). **(fuentes: código)**

## 8. Registro de procesos finalizados

`t_info_finalizado` (`kernel_scheduler/src/main.c:106-109`): `{pid, motivo}` — un log acumulativo
(no una tabla de control en el sentido clásico, pero sí una estructura de estado del sistema) que
se imprime completo cada vez que termina un proceso (`registrar_fin_proceso`, `:113-133`), protegido
por `mutex_lista_finalizados`. Útil para mostrar en la defensa como evidencia de qué terminó y por
qué. **(fuentes: código)**

## 9. Resumen visual: quién es dueño de qué tabla

| Tabla | Vive en | Estructura | Lista/cola que la contiene |
|---|---|---|---|
| Procesos (PCB) | kernel_scheduler | `t_pcb` | `lista_todos_pcb` + colas por estado |
| Segmentos activos/suspendidos | kernel_memory | `t_segmento` / `t_segmento_suspendido` | `t_proceso_km.segmentos[_suspendidos]` |
| Espacio libre | kernel_memory | `t_hueco` | `lista_huecos` |
| Memory Sticks conectados | kernel_memory | `t_memory_stick_info` | `memory_sticks` |
| Dispositivos IO | kernel_scheduler | `t_io_modulo` / `t_io_pedido` | `lista_modulos_io` + cola propia por dispositivo |
| Mutex de usuario | kernel_scheduler | `t_mutex_simulado` | `lista_mutexes` |
| CPUs conectadas | compartida (utils) | `t_cpu` | `cpus_conectadas` |

**(fuentes: código, inferencia)**
