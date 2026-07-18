# Informe: módulo `kernel_scheduler`

> **(fuentes: código)** / **(fuentes: inferencia)** / **(fuentes: teoría SO)** al final de cada bloque.
> Todo el código de este módulo vive en un único archivo: `kernel_scheduler/src/main.c` (~1658 líneas).

## 1. Intro teórica: los tres niveles de planificación

Un SO clásico organiza la planificación de procesos en tres niveles:

- **Largo plazo**: decide qué procesos nuevos entran al sistema (NEW → READY). En sistemas con
  memoria limitada, controla el **grado de multiprogramación**.
- **Mediano plazo**: decide qué procesos bloqueados se **suspenden** (se les saca la memoria y se
  manda a un almacenamiento secundario) para liberar espacio, y cuándo **desuspenderlos**.
- **Corto plazo** (el "dispatcher"): decide, entre los procesos en READY, cuál corre a continuación
  en una CPU libre — usando un **algoritmo de planificación** (FIFO, Round Robin, por prioridades, etc.).

Este módulo implementa los tres, cada uno en su propio hilo. **(fuentes: teoría SO)**

## 2. Responsabilidad del módulo

Kernel Scheduler (KS) es el **orquestador central**: mantiene el PCB de cada proceso, decide quién
ejecuta y cuándo, intermedia entre CPU/IO/Kernel Memory, y administra los mutex simulados que puede
pedir el programa de usuario (con herencia de prioridad — ver
[Informe de Sincronización](03-semaforos-sincronizacion.md) §5). **(fuentes: código)**

## 3. Ciclo de vida / `main()` (`main.c:917-994`)

1. Parsea `argv[1]` (config) y `argv[2]` (path del proceso inicial).
2. `obtener_config` (`:149-178`) carga el config y arma `queues_algorithms` (si el algoritmo es
   `CMN`, un array con el algoritmo de cada cola; si no, un array de un solo elemento para uniformar
   el resto del código).
3. Levanta el servidor (`iniciar_servidor`) y se conecta a Kernel Memory (`verificar_conexion`, `:936-938`).
4. Inicializa: lista de módulos IO, lista de todos los PCB, **mutex simulados** definidos en config
   (`RECURSOS`, `:951-961` — uno por nombre configurado, todos libres al arrancar), colas de NEW y de
   mediano plazo (`cola_susp_ready`/`cola_susp_block`), y las colas de READY (`inicializar_colas_ready`, `:180-196`).
5. Lanza **3 hilos detached**: `hilo_escucha_memoria` (`:979`, el único que lee respuestas de KM),
   `hilo_planificador_largo_plazo` (`:983`), `hilo_planificador_corto_plazo` (`:987`).
6. Crea el proceso inicial (`crear_proceso_inicial`, `:990`, PID 0) y entra a
   `escuchar_conexiones()` (`:991`), que bloquea aceptando conexiones de CPU/IO nuevas.

**(fuentes: código)**

## 4. Estados de un proceso

`t_estado` (compartido, `utils/src/utils/utils.h:78-86`): `NEW, READY, EXEC, BLOCK, SUSP_READY,
SUSP_BLOCK, EXIT`. El PCB (`t_pcb`, `scheduler.h:11-27`) además guarda `prioridad`,
`program_counter`, `quantum_restante`, `cola_original`, `motivo_desalojo` (constantes
`DESALOJO_POR_PRIORIDAD/QUANTUM/COMPACTACION`, `scheduler.h:7-9`) y `generacion_bloqueo` (contador
que se incrementa cada vez que el proceso entra a `BLOCK`, usado para invalidar timeouts de un
bloqueo anterior ya resuelto — ver §7). **(fuentes: código)**

## 5. Planificación de corto plazo (el dispatcher)

`hilo_planificador_corto_plazo` (`:463-506`), bucle infinito:

1. Espera a que no haya compactación en curso (`mutex_compactando` + `pthread_cond_wait`, `:466-470`
   — ver §8).
2. Espera a que haya al menos un proceso en alguna cola de READY (`sem_procesos_en_ready_global`,
   `:472`) **y** a que haya una CPU libre (`sem_cpus_libres`, `:473`) — ambas condiciones a la vez,
   con dos `sem_wait` consecutivos.
3. Selecciona el proceso:
   - Si el algoritmo es `CMN` (colas multinivel): `seleccionar_proceso_cmn` (`:278-289`) recorre las
     colas **en orden de prioridad estricta** (índice 0 = más prioritaria) y toma el primero que
     encuentre no vacía — nunca mira una cola de menor prioridad si hay algo en una más prioritaria.
   - Si no, saca de una única cola (`colas_ready[0]`, `:480-482`).
4. Marca el PCB como `EXEC`, le asigna la próxima CPU libre y le manda `EJECUTAR_PROCESO`
   (`enviar_pcb_a_cpu`, `:550-559`).
5. Si la cola de ese proceso usa Round Robin (`RR_QUANTUM`), lanza un hilo temporizador
   (`iniciar_hilo_quantum`, `:650-657` → `controlador_quantum`, `:639-648`) que, al vencer el
   quantum, manda una interrupción **solo si el proceso sigue en EXEC** (chequeo explícito,
   `proceso_sigue_en_ejecucion`, `:143-147` — evita interrumpir a un proceso que ya terminó o se
   bloqueó por su cuenta antes de que venciera el quantum).

**Algoritmos disponibles** (config `PLANIFICATION_ALGORITHM`): `FIFO`, `RR` (Round Robin), `CMN`
(colas multinivel — cada cola con su propio algoritmo, definido en el array `QUEUES_ALGORITHMS`, ej.
`[FIFO,RR,FIFO,RR]` en `scheduler.config:3`). **No hay SJF/SRT implementado.**

**Desalojo por prioridad** (si `QUEUE_PREEMPTION=TRUE`, `scheduler.config:5`): cuando un proceso
entra a READY en una cola más prioritaria que la del proceso actualmente en EXEC, se lo desaloja de
inmediato (`agregar_a_ready`, `:249-276` → `desalojar_por_prioridad`, `:508-521`, manda una
interrupción a esa CPU puntual). **(fuentes: código)**

## 6. Planificación de largo plazo

`hilo_planificador_largo_plazo` (`:444-461`): simplemente pasa cada proceso de NEW a READY apenas
hay uno disponible (`sem_procesos_en_new`), **sin ningún límite de grado de multiprogramación** — el
proceso arranca sin memoria asignada todavía; es Kernel Memory quien decide, al recibir
`INICIAR_PROCESO`, si hay espacio o no. Esto fue un cambio deliberado: el commit `ed7f4ac` sacó un
límite artificial de `GRADO_MULTIPROGRAMACION` que existía antes (ver
[Informe de Resumen del Proyecto](11-resumen-armado-proyecto.md)). **(fuentes: código, historial de commits)**

## 7. Planificación de mediano plazo (suspensión / desuspensión)

- **Disparador de suspensión**: cuando un proceso se bloquea por IO
  (`bloqueado_por_irse_a_io`), se lanza `hilo_monitor_suspension` (`:812-850`) con el
  `generacion_bloqueo` vigente en ese momento. Duerme `SUSPENSION_TIMEOUT` ms
  (`scheduler.config:6`, `usleep_ei`, `:818`) y, al despertar, **solo actúa si el proceso sigue
  bloqueado y es la misma "generación" de bloqueo** (`:825`) — así, si el proceso ya se desbloqueó y
  volvió a bloquear por otra razón mientras tanto, este timeout viejo no hace nada. Si sigue
  vigente, pide `SUSPENDER_PROCESO` a KM y mueve el PCB a `SUSP_BLOCK`.
- **Desuspensión** (`intentar_desuspender_procesos`, `:858-915`): busca en `cola_susp_ready` el
  proceso de **mayor prioridad** (no es FIFO — recorre toda la cola comparando prioridades, `:869-876`),
  pide `DESSUSPENDER_PROCESO` a KM, y si hay espacio lo pasa a READY. **Se dispara desde 3 puntos**
  distintos: cuando KM libera memoria (`MEM_FREE`/`finalizar_proceso`), cuando se conecta un Memory
  Stick nuevo (`NUEVA_MEMORIA_DISPONIBLE`), y al terminar una compactación (`FIN_COMPACTACION`) — este
  tercer disparador fue agregado en el mismo commit `ed7f4ac` que faltaba respecto a los otros dos.

El Kernel **decide cuándo** pedir suspender/desuspender; la ejecución real (mover los segmentos a/desde
swap) la hace Kernel Memory — ver [Informe de Kernel Memory](06-kernel-memory.md). **(fuentes: código)**

## 8. Compactación (coordinación con Kernel Memory)

Cuando KM no encuentra un hueco contiguo para un `MEM_ALLOC`, dispara una compactación e informa a KS
con `INICIAR_COMPACTACION`. KS entonces desaloja **todas las CPUs activas salvo la que originó el
pedido** (para no generar un deadlock si solo hay una CPU: esa CPU está bloqueada esperando la
respuesta de su propio `SYSCALL`, no puede además recibir una interrupción y perder su estado) y
bloquea el planificador de corto plazo con `mutex_compactando` + `cond_compactacion_lista` hasta que
KM avisa `FIN_COMPACTACION`. **(fuentes: código, inferencia)**

## 9. Comunicación con otros módulos

- **Con CPU**: recibe `SYSCALL` (con el nombre de la syscall como string dentro del payload —
  `INIT_PROC`, `SLEEP`, `STDIN`, `STDOUT`, `MUTEX_CREATE`, `MEM_ALLOC`, `MEM_FREE`), `MUTEX_LOCK`/
  `MUTEX_UNLOCK` (con respuesta síncrona), `FIN_PROCESO`, `SEG_FAULT`, `INTERRUPCION` — todo
  manejado en `manejar_op_cpu` y `recibir_pcb_de_cpu` (`:684-739` y siguientes).
- **Con Kernel Memory**: KS pide `INICIAR_PROCESO`, `CREAR_SEGMENTO`/`ELIMINAR_SEGMENTO`,
  `LEER_MEMORIA`/`ESCRIBIR_MEMORIA` (para STDIN/STDOUT), `SUSPENDER_PROCESO`/`DESSUSPENDER_PROCESO`,
  `FIN_PROCESO`. KM inicia hacia KS: `CORRUPCION_MEMORIA` (dispara `bsod()`, `:291-311`),
  `NUEVA_MEMORIA_DISPONIBLE`, `INICIAR_COMPACTACION`/`FIN_COMPACTACION`. **Un solo hilo**
  (`hilo_escucha_memoria`) lee ese socket — cualquier otro hilo que necesite la respuesta a un
  pedido propio espera en un semáforo dedicado (ver
  [Informe de Sincronización](03-semaforos-sincronizacion.md) §2 y §6).
- **Con IO**: KS es cliente de cada módulo IO conectado, con un hilo dedicado
  (`hilo_escucha_io`) por cada uno.

**(fuentes: código)**

## 10. Configuración (`kernel_scheduler/scheduler.config`)

`PLANIFICATION_ALGORITHM` (FIFO/RR/CMN), `QUEUES_ALGORITHMS` (array, solo si CMN),
`RR_QUANTUM`, `QUEUE_PREEMPTION` (TRUE/FALSE), `SUSPENSION_TIMEOUT`, `PUERTO_ESCUCHA`,
`IP_KERNEL_MEMORY`/`PUERTO_KERNEL_MEMORY`, `RECURSOS` (nombres de los mutex simulados a crear al
arrancar). El repo trae 5 configs de ejemplo (`scheduler.config` a `scheduler5.config`) que varían
sobre todo la cantidad de colas y el algoritmo por cola — útil para tener casos concretos
preparados si piden "mostrame un ejemplo con tal algoritmo". **(fuentes: código)**

## 11. Puntos no triviales para la defensa

- **Herencia de prioridad e inversión de prioridades**: ver detalle completo en el
  [Informe de Sincronización](03-semaforos-sincronizacion.md) §5, incluyendo el fix de deadlock
  histórico del commit `ed7f4ac`.
- **Condición de carrera documentada explícitamente en el código** (`recibir_pcb_de_cpu`, `:684-693`):
  una interrupción (por quantum o prioridad) puede llegar casi al mismo tiempo que una syscall que ya
  liberó al proceso por otro camino. Se resuelve chequeando que el proceso siga en `EXEC` antes de
  procesar la interrupción — si no, se ignora como "vieja".
- **`generacion_bloqueo`** es el mecanismo para descartar timeouts de suspensión obsoletos (§7) —
  patrón general reutilizable: cualquier vez que un temporizador async puede "sobrevivir" a un
  cambio de estado, conviene versionar el estado con un contador así.
- **Por qué la desuspensión se dispara en un hilo aparte** (`hilo_intentar_desuspender`, `:852-856`):
  si se llamara inline desde `hilo_escucha_memoria` al recibir `NUEVA_MEMORIA_DISPONIBLE` o
  `FIN_COMPACTACION`, y esa función necesitara a su vez pedir algo a KM y esperar la respuesta, el
  único hilo que puede postear esa respuesta (el mismo `hilo_escucha_memoria`) estaría esperándose a
  sí mismo — deadlock. Ver también [Informe de Sincronización](03-semaforos-sincronizacion.md) §6.

**(fuentes: código, inferencia, historial de commits)**
