# Informe: Cómo armamos el proyecto

> Este no es un timeline de commits (para eso está GitHub) — es el **relato** de cómo se construyó
> el sistema: quién encaró qué parte y qué problemas fueron apareciendo (y cómo se resolvieron),
> reconstruido a partir de los mensajes de commit y sus diffs. Muchos commits dicen simplemente
> "fix X" o "bug Y" sin más detalle — en esos casos el bloque está marcado
> **(fuentes: inferencia, historial de commits)** para dejar claro que el "qué pasó" es una
> reconstrucción razonable a partir del diff, no un hecho documentado por quien lo escribió. Donde
> el propio commit trae una explicación (body del mensaje o comentarios en el diff), se marca
> **(fuentes: historial de commits)**.

## 1. Quién se encargó de qué

Reconstruido a partir de `git shortlog` y el contenido de los commits de cada persona:

- **Sofía Deane** (`sofiadeane`) — la integradora del equipo: hizo la mayoría de los commits
  totales y tocó casi todos los módulos en la etapa de estabilización. Implementó la
  **compactación de memoria** en kernel_memory, resolvió el **deadlock de mutex** por herencia de
  prioridad, el bug de `EINTR` en esperas de semáforo/sleep, bugs de comunicación
  scheduler↔io↔memstick, y coescribió el módulo CPU inicial junto con Rominna Aquino.
- **Priscila Zárate** (`priscilazarate`) — kernel_scheduler: manejo de hilos, identificador de
  módulos IO, planificación de **largo y mediano plazo**; también worst/best-fit en kernel_memory y
  un refactor temprano de `utils` (mover `aceptar_conexiones` a la librería compartida).
- **Florencia Molle** — creó los módulos **IO y SWAP** desde cero, y después trabajó fuerte en
  **CPU**: la MMU con soporte para varios Memory Sticks (y el segfault correspondiente cuando la
  traducción falla), y el arreglo de bugs de IO + el ciclo de instrucción de CPU.
- **Sofía Miño** (`sofiaminocantero`) — creó el módulo **kernel_memory** desde cero y, del lado de
  kernel_scheduler, el **planificador de corto plazo** y la primera versión de **colas multinivel
  con herencia de prioridad**; también revisó/mergeó las ramas de kernel-scheduler y colas
  multinivel de sus compañeros.
- **Rominna Aquino** (`its-romi`/`its.romi`) — coescribió el módulo **CPU** inicial, hizo una ronda
  de **debug de todos los módulos**, e implementó **suspensión y desuspensión** (la parte de
  mediano plazo que interactúa con swap).

**(fuentes: historial de commits)**

## 2. Cómo fue creciendo el sistema (cronología por tema)

### 2.1. Cada módulo arranca por separado (abril)

Los 4 módulos "de proceso" nacieron como commits independientes de cada persona: **CPU** (Rominna +
Sofía Deane, `917c99c`), **IO y SWAP** (Florencia, `db935a2`), **kernel_scheduler** con manejo de
hilos (Priscila, `78a7675`), **kernel_memory** (Sofía Miño, `a396dac`). En esta etapa cada módulo
todavía no se comunicaba de forma completa con los demás — eran esqueletos que se fueron
completando en paralelo. **(fuentes: historial de commits)**

### 2.2. Planificación completa y MMU (mayo-junio)

- Sofía Miño sube la primera versión (sin testear, según el propio mensaje del commit) de **colas
  multinivel con herencia de prioridad** (`f3ab231`) y el **planificador de corto plazo**
  (`9aae2ab`).
- Priscila agrega la **planificación de largo plazo** (`2a1287b`) y más tarde el **worst/best-fit**
  en kernel_memory (`0618d63`).
- Florencia implementa la **MMU con soporte para varios Memory Sticks** y el manejo de
  **segmentation fault** cuando una traducción de dirección falla (`a53c6d4`) — la base de lo que
  hoy es `traducir_direccion`/`ubicar_segmento` (ver [Informe de CPU](04-cpu.md) §6 y
  [Informe de Kernel Memory](06-kernel-memory.md) §7).
- Ronda de estabilización: Florencia (con Rominna como co-autora) arregla **bugs de IO y del ciclo
  de instrucción de CPU** (`61e76f0`); Sofía Deane arregla **bugs que salieron de los tests**
  (`2fad80a`) — la primera vez que aparece explícitamente la palabra "tests" en el historial,
  señal de que en este punto ya había una forma de probar el sistema de punta a punta.

**(fuentes: historial de commits, inferencia)**

### 2.3. La compactación y sus dolores de cabeza (julio, primera quincena)

Sofía Deane implementa la **compactación de memoria** (`f503828`) — el mecanismo para cuando
`crear_segmento` no encuentra un hueco contiguo pero sí hay espacio total (ver
[Informe de Kernel Memory](06-kernel-memory.md) §4). A partir de ahí sigue una seguidilla de fixes
sobre la misma funcionalidad, señal de que compactar memoria en un sistema con múltiples hilos y
Memory Sticks conectados por red fue, en la práctica, la parte más difícil de poner en marcha:

- **`635c594` "fix tentativo de compactacion"**: ajustes en `kernel_scheduler` y en el protocolo
  de paquetes (`utils.h`), y aparecen los primeros configs de 3 y 4 Memory Sticks
  (`MemoryStick_3/4.config`, `ms1`-`ms4`) — sugiere que el bug solo se manifestaba con más de 2
  sticks conectados. **(fuentes: inferencia, historial de commits)**
- **`391de53` "fix semaforos compactacion"**: ajustes puntuales de semáforos en ambos kernels —
  consistente con una condición de carrera entre el hilo que compacta y el que planifica.
  **(fuentes: inferencia, historial de commits)**
- **`876bf68` "fix cuelgue en compactacion y agrega MUTEX_CREATE dinamico"**: este commit sí trae
  la explicación en su propio mensaje — **elimina una condición de carrera entre el hilo
  vigilante de desconexión de un Memory Stick y las lecturas/escrituras reales sobre ese mismo
  socket**, que hacía que `compactar_memoria()` se quedara colgado esperando datos que nunca
  llegaban. De paso, en el mismo commit: `MUTEX_CREATE` pasa a crear el mutex de usuario
  dinámicamente si no existe (antes dependía únicamente de la lista estática `RECURSOS` del
  config), y se agrega `MEMORY_DELAY` en memory_stick. **(fuentes: historial de commits)**

### 2.4. Mediano plazo: suspensión y desuspensión (julio)

Rominna implementa el flujo completo de **suspensión y desuspensión** (`ef1dc5c`) — segmentos que se
mueven a bloques de swap y el protocolo correspondiente entre kernel_memory y swap. Priscila
completa la integración del lado de **planificación a mediano plazo** en kernel_scheduler
(`13c9600`). Sofía Deane corrige un bug puntual al **suspender un proceso recién creado**
(`383b516` "Fix suspender proc nuevo") — consistente con un caso borde donde un proceso todavía en
`NEW`/recién pasado a `READY` no tenía todavía el estado necesario para ser suspendido
correctamente. **(fuentes: historial de commits, inferencia)**

### 2.5. El bug de `EINTR` (julio)

Sofía Deane identifica y corrige (`f225a24` "EINTR bug") que `sem_wait`/`usleep` pueden retornar
antes de lo esperado si al hilo le llega una señal mientras esperan — algo real en un programa con
tantos hilos como este (cada conexión, cada monitor de suspensión, cada quantum, es su propio hilo).
Sin reintentar, un hilo podía creer que pasó el timeout completo cuando en realidad lo interrumpieron
a mitad de camino, o liberar un mutex de pedido a Kernel Memory antes de que la respuesta real
llegara, desincronizando el socket. Este commit es el origen de los wrappers `sem_wait_ei`/
`usleep_ei` que aparecen en kernel_scheduler y kernel_memory — ver
[Informe de Sincronización](03-semaforos-sincronizacion.md) §2. **(fuentes: historial de commits)**

### 2.6. Comunicación scheduler↔io↔memstick (varios commits, distintas fechas)

Una serie de fixes sobre la comunicación entre módulos:

- **`b4f2cae`**: el propio mensaje lo explica — *"fix bug pc: estaba traduciendo mal la dirección
  del segmento"* — junto con arreglos en `io` y `kernel_scheduler` para la comunicación entre
  ambos.
- **`ad7bf15` "fix comunicacion io-scheduler"**: 49 líneas nuevas solo en `kernel_scheduler/src/main.c`
  — consistente con un ajuste del protocolo de pedido/respuesta con los módulos IO.
- **`13c5dbe` "fix bugs memstick"**: cambios en kernel_memory y kernel_scheduler relacionados a
  memory_stick — probablemente en el manejo de la lista de sticks conectados o la traducción de
  direcciones entre varios.
- **`6abae63` "bug devolver a cpu"**: una sola línea agregada en kernel_scheduler — sugiere que
  faltaba un paso puntual al devolverle el control a la CPU tras alguna operación (probablemente un
  `sem_post`/reasignación de CPU libre faltante).

**(fuentes: inferencia, historial de commits)**

### 2.7. El commit final de consolidación pre-entrega

`ed7f4ac` ("Fix deadlock de mutex, conecta STDIN/STDOUT a Kernel Memory y ajusta consistencia con el
enunciado") es el commit más grande y más documentado de todo el historial — junta varios frentes a
la vez: el fix del deadlock de mutex por herencia de prioridad (ver
[Informe de Sincronización](03-semaforos-sincronizacion.md) §5), conecta finalmente STDIN/STDOUT
contra Kernel Memory de verdad (antes STDOUT nunca leía memoria real y STDIN nunca la escribía), saca
el límite artificial de `GRADO_MULTIPROGRAMACION`, agrega el tercer disparador de desuspensión que
faltaba, y corrige el formato de varios logs para que coincidan con lo pedido por la cátedra. Es,
en los hechos, el commit de "poner todo en orden" antes de la entrega. **(fuentes: historial de commits)**

### 2.8. Nombres de commits que no coinciden con su contenido real

Vale la pena señalarlo porque puede confundir si alguien mira el historial en la defensa: el commit
inmediatamente posterior, **`af8b0a0` "fixes mutex"**, pese al nombre **no toca ningún mutex ni
semáforo** — es un fix de traducción de direcciones lógicas para que también contemplen segmentos
suspendidos en swap (`ubicar_segmento`, ver [Informe de Kernel Memory](06-kernel-memory.md) §7). El
fix real de mutex está en el commit anterior, `ed7f4ac`. Moraleja para la defensa: si preguntan por
un commit puntual, conviene confirmar el diff real y no confiarse del mensaje. **(fuentes: historial de commits)**

### 2.9. Housekeeping final

`7339707` ("kernel con config x linea d mem"), `6700a95` ("subo archivos config"), `867b4b0`
(merge de configs) y `e642b10` ("update paths") son los últimos commits del historial — ajustes de
configuración y rutas para el despliegue final, sin cambios de lógica de negocio.
**(fuentes: historial de commits)**

## 3. Qué se puede aprender de este historial para la defensa

- La parte más "iterada" del proyecto fue la **compactación de memoria** (al menos 3 commits de fix
  seguidos) — es razonable esperar preguntas puntuales sobre ella y conviene tenerla bien repasada
  (ver [Informe de Kernel Memory](06-kernel-memory.md) §4).
- El **deadlock de mutex por herencia de prioridad** fue un bug real, encontrado y corregido durante
  el desarrollo (no una construcción teórica del enunciado) — buena historia para contar si
  preguntan "¿qué problema de concurrencia se les presentó?".
- El equipo se dividió razonablemente por módulo al principio (uno o dos módulos por persona) y
  después convergió en una fase de estabilización conjunta donde varias personas tocaron los mismos
  archivos — típico de la recta final de un TP grupal.

**(fuentes: inferencia)**
