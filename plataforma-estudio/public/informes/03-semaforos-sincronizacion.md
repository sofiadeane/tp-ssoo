# Informe: Semáforos y estructuras de sincronización

> **(fuentes: código)** = verificado en el código, **(fuentes: inferencia)** = deducido,
> **(fuentes: historial de commits)** = reconstruido a partir de un commit puntual,
> **(fuentes: teoría SO)** = concepto general de la materia.

## 1. Intro teórica: por qué hace falta sincronizar

Cada uno de los módulos "pesados" de este TP (kernel_scheduler y kernel_memory, sobre todo) es
**multihilo**: por cada CPU, cada IO y cada cliente conectado se lanza un hilo dedicado
(`pthread_create` + `pthread_detach`) que corre en paralelo con el resto. Todos esos hilos comparten
estructuras en memoria (colas de procesos, listas de recursos, contadores) dentro del mismo proceso.
Sin coordinación, dos hilos podrían leer/modificar la misma estructura al mismo tiempo y corromperla
(condición de carrera). Este TP usa las dos herramientas clásicas de sincronización de POSIX threads:

- **Mutex** (`pthread_mutex_t`): exclusión mutua — solo un hilo a la vez puede estar "adentro" de la
  sección protegida. Se usa para proteger **estructuras compartidas** (colas, listas).
- **Semáforos** (`sem_t`): señalización/conteo — un hilo espera (`sem_wait`) a que otro le avise
  (`sem_post`) que hay trabajo o un recurso disponible. Se usan para **coordinar flujo** entre hilos
  (ej. "hay un proceso nuevo en ready", "ya tengo la respuesta que estaba esperando").

**(fuentes: teoría SO)**

## 2. Mutex y semáforos internos de `kernel_scheduler` (el módulo con más concurrencia)

Todo declarado en `kernel_scheduler/src/main.c` (variables globales, líneas indicadas):

| Variable | Línea | Protege / coordina |
|---|---|---|
| `mutexes_ready[]` (uno por cola de prioridad) + `sem_procesos_en_ready[]` | declaradas en `scheduler.h:97-98` | Cada cola de READY por prioridad (algoritmo CMN — colas multinivel). |
| `sem_procesos_en_ready_global` | `main.c:58` | Señala "hay al menos un proceso listo en alguna cola", lo espera el planificador de corto plazo antes de buscar en qué cola. |
| `mutex_new` + `sem_procesos_en_new` | `main.c:46-47` | La cola de procesos NEW (admisión, planificación de largo plazo). |
| `mutex_quantum` | `main.c:59` | Protege el estado compartido del temporizador de quantum (Round Robin). |
| `mutex_pedido_km` + `sem_resultado_km` | `main.c:61-62` | Serializan los pedidos a Kernel Memory: **un solo pedido en vuelo a la vez** — el hilo que pide toma `mutex_pedido_km`, manda el paquete, y espera `sem_resultado_km` que postea el único hilo que lee ese socket (`hilo_escucha_memoria`). |
| `sem_resultado_susp` | `main.c:69` | Igual que arriba, pero para respuestas de suspensión/desuspensión. |
| `sem_resultado_lectura_mem` | `main.c:75` | Igual, pero para respuestas de `LEER_MEMORIA` (trae un buffer de tamaño variable, necesita su propio canal — agregado en el mismo commit que el fix de deadlock, ver sección 5). |
| `mutex_lista_io` | `main.c:81` | Lista global de módulos IO conectados. |
| `mutex_lista_mutexes` | `main.c:84` | Lista global de mutex de usuario (`t_mutex_simulado`) creados dinámicamente. |
| `mutex_lista_todos_pcb` | `main.c:86` | Lista de todos los PCB vivos (para BSOD, listados, etc.). |
| `mutex_susp_ready` / `mutex_susp_block` | `main.c:92-93` | Colas de mediano plazo (procesos suspendidos). |
| `mutex_compactando` + `cond_compactacion_lista` (variable de condición) | `main.c:97-98` | Pausan al planificador de corto plazo mientras Kernel Memory está compactando (`pthread_cond_wait`, `main.c:468`) y lo despiertan al terminar (`pthread_cond_broadcast`, `main.c:418`). |
| Por cada `t_io_modulo`: `mutex` + `semaforo` | `scheduler.h:50,52` | Cola de pedidos pendientes para ese dispositivo IO puntual. |
| Por cada `t_mutex_simulado` (mutex de **usuario**, el que pide el proceso simulado con `MUTEX_CREATE`): `mutex_interno` | `scheduler.h:61` | Protege el estado propio de ese mutex simulado (dueño, cola de bloqueados) — no confundir con los mutex de sincronización del propio kernel. |

**Wrapper `sem_wait_ei`** (`main.c:19-21`): reintenta el `sem_wait` si es interrumpido por una señal
(`EINTR`) — necesario porque con tantos hilos corriendo, una señal puede interrumpir una espera
válida y hay que reintentar en vez de tratarlo como error. Mismo criterio en `usleep_ei` (`main.c:23`)
para los delays simulados (quantum, timeout de suspensión). **(fuentes: código)**

## 3. Mutex y semáforos en `kernel_memory`

- **`mutex_ms`**: protege la lista de memory sticks conectados, la memoria total y la lista de
  huecos libres (`lista_huecos`) — se toma en cada operación que agrega/quita un stick o busca/crea
  un hueco.
- **`mutex_socket_scheduler`**: serializa los `send()` hacia kernel_scheduler, porque varios hilos
  distintos (el que atiende pedidos de KS, el que vigila cada memory stick, etc.) pueden necesitar
  escribir en ese mismo socket al mismo tiempo — sin este mutex se podrían intercalar bytes de dos
  mensajes distintos y romper el protocolo.
- **Un mutex por cada `t_memory_stick_info` conectado**: serializa el socket hacia ese stick en
  particular (varias lecturas/escrituras concurrentes a un mismo stick se hacen una por una).

⚠️ **Punto débil detectado (para mencionar si preguntan, no para "arreglar" en el informe)**: no hay
un mutex explícito sobre `lista_procesos` — si CPU y kernel_scheduler llegaran a disparar operaciones
concurrentes sobre el mismo proceso, hay una ventana teórica de condición de carrera. **(fuentes: código, inferencia)**

## 4. Mutex en `memory_stick`

Un único **`mutex_memoria`** global que protege *todo* el buffer de memoria del stick — granularidad
gruesa (se toma el mutex para cualquier lectura o escritura, sin importar la dirección), no hay
locks por bloque o por región. `cpu`, `io` y `swap` no tienen mutex propios: son de un solo hilo
(un pedido a la vez). **(fuentes: código)**

## 5. Mutex simulados de "usuario" (`MUTEX_CREATE`/`MUTEX_LOCK`/`MUTEX_UNLOCK`) y herencia de prioridad

Estos son los mutex que el **programa simulado** (el pseudocódigo que corre en la CPU) puede pedir
con las instrucciones `MUTEX_CREATE`, `MUTEX_LOCK`, `MUTEX_UNLOCK` — son un concepto de la materia,
no infraestructura interna del kernel. Viven en `t_mutex_simulado` (`kernel_scheduler/src/scheduler.h:56-63`):
nombre, si está libre, quién es el dueño (`pid_owner`), cola de bloqueados y su propio `mutex_interno`.

- **`manejar_mutex_lock`** (`kernel_scheduler/src/main.c:1210-1247`): si el mutex está libre, se lo
  asigna al proceso pedidor. Si está ocupado, el proceso pasa a `BLOCK` y entra a la cola de
  bloqueados de ese mutex — y se dispara **herencia de prioridad** (`heredar_prioridad`, `main.c:1540`):
  si el proceso bloqueado tiene mayor prioridad que el dueño actual del mutex, el dueño **hereda
  temporalmente esa prioridad más alta** (y se reubica de cola en caliente) para que no lo desalojen
  procesos de prioridad intermedia mientras tiene el recurso tomado — el problema clásico de
  **inversión de prioridades**.
- **`manejar_mutex_unlock`** (`main.c:1249-1288`): libera el mutex, restaura la prioridad original
  del que lo tenía (`restaurar_prioridad`, `main.c:1573`) y, si había alguien esperando, lo pasa de
  `BLOCK` a `READY` y le asigna el mutex a él.

### El fix de deadlock (commit `ed7f4ac`, "Fix deadlock de mutex...")

Este es el commit más relevante de sincronización en todo el historial. El bug: `restaurar_prioridad`
también necesita tomar `mutex_interno` del mutex simulado para leer/modificar su estado. Antes del
fix, `manejar_mutex_unlock` llamaba a `restaurar_prioridad(m)` **mientras todavía tenía tomado**
`m->mutex_interno` — como `pthread_mutex_t` **no es reentrante** por defecto, el mismo hilo se
auto-bloqueaba esperando un mutex que él mismo ya tenía tomado (deadlock), y el `MUTEX_UNLOCK` nunca
respondía al proceso que lo pedía. El fix (`main.c:1270-1277`): soltar `mutex_interno` **antes** de
llamar a `restaurar_prioridad`, y volver a tomarlo después para continuar con el resto de la lógica
(pasar el mutex al siguiente de la cola). El comentario que dejaron en el código
(`main.c:1272-1274`) documenta exactamente este razonamiento. **(fuentes: código, historial de commits)**

> **Aclaración sobre nombres de commits**: el commit inmediatamente posterior en el historial se
> llama `af8b0a0` *"fixes mutex"*, pero al revisar su diff real, **no toca ningún mutex ni
> semáforo** — corrige la traducción de direcciones lógicas para que también contemple segmentos
> suspendidos en swap (reemplaza `traducir_direccion` por `ubicar_segmento` en `kernel_memory`). El
> fix real de sincronización de mutex está en el commit **anterior**, `ed7f4ac`. Vale la pena
> tenerlo claro para no atribuir el fix al commit equivocado si preguntan por el historial.
> **(fuentes: historial de commits)**

## 6. Patrón general: "un pedido en vuelo a la vez" hacia Kernel Memory

Un patrón que se repite y vale la pena explicar como concepto unificador: como **un solo hilo**
(`hilo_escucha_memoria`) lee las respuestas del socket hacia Kernel Memory, cualquier otro hilo que
necesite pedirle algo a KM debe:

1. Tomar `mutex_pedido_km` (para que no se mezcle con otro pedido concurrente).
2. Mandar el pedido.
3. Esperar en el semáforo específico de esa respuesta (`sem_resultado_km`, `sem_resultado_susp`,
   `sem_resultado_lectura_mem` según el tipo de pedido).
4. Soltar `mutex_pedido_km`.

Este mismo patrón (mutex de exclusión + semáforo de "ya tengo la respuesta") es la razón por la que
operaciones que **KM inicia sin que se lo pidan** (como `NUEVA_MEMORIA_DISPONIBLE` o
`FIN_COMPACTACION`, que disparan un reintento de desuspensión) se procesan en un **hilo aparte**
en vez de inline: si `intentar_desuspender_procesos()` se llamara directamente desde
`hilo_escucha_memoria` y esa función necesitara, a su vez, pedirle algo a KM y esperar la respuesta,
el propio `hilo_escucha_memoria` quedaría esperándose a sí mismo — el mismo tipo de auto-deadlock que
el de la sección 5, pero entre hilo y pedido en vez de entre mutex anidados. **(fuentes: código, inferencia)**
