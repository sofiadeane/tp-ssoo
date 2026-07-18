# Informe: módulo `kernel_memory`

> **(fuentes: código)** / **(fuentes: inferencia)** / **(fuentes: historial de commits)** al final de cada bloque.

## 0. Aclaración importante antes de empezar

**Este TP no implementa paginación multinivel ni marcos de página.** La gestión de memoria es por
**segmentación con particiones dinámicas** (huecos + compactación + estrategia de ajuste
first/best/worst-fit) — el modelo clásico de "memoria contigua" de la materia, no el de paginación
con tablas de 2 niveles y algoritmo CLOCK. No hay reemplazo de páginas individuales: cuando hace
falta liberar espacio, se **suspende un proceso completo** (todos sus segmentos a la vez) a swap, no
páginas sueltas. Si en la defensa preguntan por el algoritmo de reemplazo de páginas, la respuesta
correcta es que **este diseño no tiene uno** — la unidad de swap es el proceso, no la página.
**(fuentes: código, inferencia)**

## 1. Responsabilidad del módulo

Kernel Memory (KM) es el dueño de **todo el espacio de memoria física** del sistema (la suma de los
Memory Sticks conectados), de los **segmentos** de cada proceso, de decidir **cuándo compactar**, y
de orquestar la **suspensión/desuspensión** de procesos completos hacia/desde `swap`. También sirve
lectura/escritura de instrucciones y contexto a la CPU. **(fuentes: código)**

## 2. Ciclo de vida / `main()` (`kernel_memory/src/main.c:51-83`)

1. `obtener_config(argv[1])` (`:85-98`) carga `PUERTO_ESCUCHA`, `LOG_LEVEL`, `SCRIPTS_BASEPATH`,
   `INSTRUCTION_DELAY`, `ALLOCATION_STRATEGY`, `COMPACTION_DELAY`, `SEGMENT_MAX_SIZE`.
2. Inicializa las listas globales: `memory_sticks`, `lista_procesos`, `lista_huecos`,
   `cpus_conectadas` (`:67-70`).
3. Levanta el servidor (`iniciar_servidor`) y entra a `aceptar_clientes_km` (`:80`, definida en
   `:804`) — por cada cliente que se conecta (CPU, kernel_scheduler, swap, memory_stick) lanza un
   hilo dedicado (`hilo_cliente`, `:527`).

**(fuentes: código)**

## 3. Esquema de memoria: segmentación + huecos

Cada proceso tiene una lista de **segmentos activos** (`t_proceso_km.segmentos`,
`kernel_memory.h:36`), cada uno un `t_segmento{id_segmento, base, limite}` (compartido con CPU,
`utils/src/utils/utils.h:67-71`). La memoria libre se administra como una lista de **huecos**
(`t_hueco{base, limite}`, `kernel_memory.h:54-57`).

**Resolución de dirección lógica → física** (`ubicar_segmento`, `:118-153`, y su versión más simple
para CPU en `traducir_direccion` del propio módulo `cpu`):

```
num_segmento    = dir_logica / SEGMENT_MAX_SIZE
desplazamiento  = dir_logica % SEGMENT_MAX_SIZE
```

`ubicar_segmento` busca primero en los segmentos **activos** (RAM) y, si no está ahí, en los
**suspendidos** (SWAP) del mismo proceso (`:131-150`) — ver §7 sobre por qué esto importa.

**Memoria física distribuida en varios Memory Sticks**: cada uno se representa como una franja
`[dir_inicio, dir_inicio + tamanio)` del espacio físico global (`t_memory_stick_info`,
`kernel_memory.h:45-52`); `encontrar_memory_stick` (`:589-611`) mapea una dirección física global al
stick correspondiente + su dirección local. Una lectura/escritura que cruza el límite entre dos
sticks se parte automáticamente (`leer_de_memoria`/`escribir_en_memoria`, `:671-744`).
**(fuentes: código)**

## 4. Asignación de segmentos: `encontrar_hueco` + compactación

`crear_segmento(pid, id_seg, tamano)` (`:986-1032`):

1. Rechaza si `tamano > SEGMENT_MAX_SIZE`.
2. Busca un hueco con `encontrar_hueco(tamano)` (`:853-876`) — recorre `lista_huecos` y elige según
   `ALLOCATION_STRATEGY` (`kernel_memory.config:5`):
   - `BEST`: el hueco más chico que alcance.
   - `WORST`: el hueco más grande.
   - (no hay rama explícita para `FIRST`; el config `_3_worse.config` usa `WORSE` como variante de
     ejemplo — revisar el nombre exacto de la estrategia contra este `strcmp` si se usa ese config).
3. Si encuentra hueco: crea el segmento ahí, encoge el hueco (o lo elimina si quedó en 0, `:1013-1018`).
4. Si **no** encuentra hueco contiguo pero **sí** hay espacio total suficiente sumando todos los
   huecos: devuelve `-2` (`:1024-1029`) → dispara **compactación**.
5. Si ni siquiera compactando alcanza: devuelve `-3` (`:1031`) → sin memoria en todo el sistema.

**Compactación** (`compactar_memoria`, `:924-984`): recolecta todos los segmentos activos de todos
los procesos, los ordena por `base` actual (bubble sort — n es chico en un TP, `:946-955`), y mueve
cada uno al inicio de la memoria (leyendo/escribiendo directo por red a los Memory Sticks
correspondientes, `:961-970`), sin huecos entre ellos. Al final, `lista_huecos` queda con un único
hueco al final (`:975-983`). Se simula un retardo con `COMPACTION_DELAY` (`usleep_ei`, ver
[Informe de Sincronización](03-semaforos-sincronizacion.md)) y, mientras dura, kernel_scheduler
desaloja todas las CPUs activas salvo la que originó el pedido (para evitar deadlock con una sola
CPU). **(fuentes: código)**

## 5. Suspensión / desuspensión de procesos (mediano plazo)

No hay reemplazo de páginas: la unidad que se mueve a swap es **el proceso completo**.

- **`suspender_proceso(pid)`** (`:1243-1307`): recorre todos los segmentos activos del proceso, los
  mueve a bloques de swap (obteniendo bloques libres con `obtener_bloque_libre`, `:1221-1235`) y los
  registra como `t_segmento_suspendido` (`kernel_memory.h:12-16`: id, tamaño, lista de números de
  bloque en orden).
- **`desuspender_proceso(pid)`** (`:1309-1385`): busca un hueco para cada segmento suspendido; si no
  hay espacio, devuelve un código que dispara el mismo mecanismo de compactación que `crear_segmento`.

**Escritura/lectura sobre un segmento suspendido sin restaurarlo a RAM**
(`leer_de_segmento_suspendido`/`escribir_en_segmento_suspendido`, `:160-216`): como `swap` solo
lee/escribe **bloques completos** (ver [Informe de Swap](08-swap.md)), escribir una porción menor a
un bloque implica **read-modify-write**: traer el bloque entero, pisar con `memcpy` la parte que
corresponde, y reenviar el bloque completo (`:186-216`). **(fuentes: código)**

## 6. Interacción con `swap`

Socket dedicado (`socket_swap`), seteado cuando un cliente se identifica como `SWAP` en el
handshake. Al conectarse, `swap` informa su `block_size` y tamaño total, con lo que KM arma
`lista_bloques_swap_libres` (`inicializar_bloques_swap`, `:1207-1219`). Protocolo:
`ESCRIBIR_BLOQUE_SWAP`/`LEER_BLOQUE_SWAP` + número de bloque (+ contenido para escritura) — **crudo**,
sin el `t_paquete` genérico (ver [Informe de Comunicaciones](02-comunicaciones.md) §5).
**(fuentes: código)**

## 7. El commit "fixes mutex" — qué arregla realmente

El comentario en el propio código (`main.c:102-108`) lo explica: un pedido de `LEER_MEMORIA`/
`ESCRIBIR_MEMORIA` (para STDIN/STDOUT) puede llegar **mientras el segmento en cuestión ya está
suspendido en swap** — por ejemplo, un STDIN que tarda tanto en completarse (esperando que el
usuario tipee) que `SUSPENSION_TIMEOUT` ya movió al proceso a `SUSP_BLOCK` antes de que llegara el
dato. La función vieja (`traducir_direccion`) solo sabía resolver contra segmentos **activos**; la
nueva (`ubicar_segmento`, `:118-153`) resuelve primero contra RAM y, si no está, contra **swap**
también — devolviendo un `t_ubicacion` que indica en cuál de los dos casos cayó. Pese a que el
commit se llama *"fixes mutex"* (`af8b0a0`), **no toca ningún mutex ni semáforo**: es un fix de
traducción de direcciones. El fix real de sincronización de mutex está en el commit anterior,
`ed7f4ac` — ver [Informe de Sincronización](03-semaforos-sincronizacion.md) §5.
**(fuentes: código, historial de commits)**

## 8. Sincronización

Ver detalle completo en el [Informe de Semáforos y Sincronización](03-semaforos-sincronizacion.md)
§3. En resumen: `mutex_ms` protege memory sticks/memoria total/huecos; `mutex_socket_scheduler`
serializa los envíos hacia kernel_scheduler (varios hilos —el que atiende a KS, cada memory stick,
el vigilante de caídas— pueden necesitar escribirle al mismo socket); cada memory stick conectado
tiene su propio mutex para serializar su socket. **Punto débil**: no hay mutex explícito sobre
`lista_procesos`. **(fuentes: código)**

## 9. Configuración (`kernel_memory/kernel_memory.config`)

`PUERTO_ESCUCHA=8000`, `LOG_LEVEL`, `SEGMENT_MAX_SIZE=128` (tamaño **máximo de un segmento**, no de
página), `ALLOCATION_STRATEGY=BEST` (BEST/WORST, hay variantes de config con `WORSE`),
`INSTRUCTION_DELAY=250` (retardo simulado al leer una instrucción), `COMPACTION_DELAY=30000`,
`SCRIPTS_BASEPATH` (carpeta base para resolver paths relativos de pseudocódigo, `crear_proceso`,
`:878-919`). **(fuentes: código)**

## 10. Puntos no triviales para la defensa

- **No hay paginación**: repetido a propósito porque es la pregunta más probable de la defensa —
  ver §0.
- **Detección de caída de un Memory Stick** vía hilo vigilante que usa `MSG_PEEK|MSG_DONTWAIT`
  (`hilo_vigilar_memory_stick`) para no consumir bytes de una operación de lectura/escritura real en
  curso mientras solo está chequeando si el socket sigue vivo.
- **Validación de archivo de pseudocódigo al crear el proceso** (`crear_proceso`, `:889-906`): revisa
  que el archivo exista y no esté vacío **apenas llega `INICIAR_PROCESO`**, para detectar un path mal
  formado enseguida en vez de recién cuando la CPU pida la primera instrucción.
- **La compactación no libera segmentos suspendidos**, solo reordena los activos — coherente con que
  swap tiene su propio espacio de bloques, independiente de la memoria física.
- **`crear_segmento` devuelve 3 códigos distintos** (éxito / "hay que compactar" / "no hay memoria ni
  compactando") — vale la pena tenerlos claros porque estructuran toda la lógica de reintento aguas
  arriba en kernel_scheduler.

**(fuentes: código, inferencia)**
