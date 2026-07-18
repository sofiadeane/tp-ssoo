# Mapa rápido — Flujo end-to-end del sistema

> **Para qué sirve este documento**: es la chuleta de emergencia. Si tenés 10 minutos antes de
> entrar a defender, leé esto primero — te da el mapa mental completo del sistema para que el
> resto de los informes (por módulo, comunicaciones, sincronización) tengan dónde encajar.
> Cada bloque indica su fuente al final: **(fuentes: código)** = verificado leyendo el código,
> **(fuentes: inferencia)** = deducido de cómo encaja todo, **(fuentes: teoría SO)** = concepto
> general de la materia que no es específico de este código.

## 1. Intro teórica: ¿qué estamos simulando?

Este TP simula un sistema operativo completo dividido en **6 procesos independientes** que se
comunican por **sockets TCP**, cada uno corriendo típicamente en su propia terminal (o hasta en
máquinas distintas). La idea pedagógica es la misma que la de un SO real: separar
**quién decide** (planificación) de **quién ejecuta** (CPU) de **dónde vive la memoria**
(kernel de memoria + memory sticks) de **cómo se persiste lo que no entra en RAM** (swap) de
**cómo se interactúa con el mundo exterior** (dispositivos de I/O). En un SO real todo esto vive
en el mismo kernel; acá está repartido en procesos separados a propósito, para que se vea la
comunicación explícita que en un SO real ocurre "adentro". **(fuentes: teoría SO, inferencia)**

## 2. Los 6 módulos y su rol de una línea

| Módulo | Rol en una línea |
|---|---|
| **kernel_scheduler (KS)** | El "cerebro": decide qué proceso corre, cuándo, y en qué CPU. Dueño de los tres niveles de planificación. |
| **kernel_memory (KM)** | El "administrador de memoria": dueño de los segmentos, huecos libres, compactación y de decidir qué se suspende a swap. |
| **cpu** | El "músculo": ejecuta instrucciones una por una (fetch-decode-execute), no toma decisiones de planificación ni de memoria. |
| **memory_stick** | Un "pendrive" de memoria física pura — un buffer de bytes con dirección propia, nada más. |
| **swap** | Un disco "tonto" — solo sabe leer/escribir bloques de un archivo, no sabe de procesos. |
| **io** | Un dispositivo genérico (teclado, impresora, sleep, etc.) — el mismo binario simula cualquiera según el nombre que se le pasa al arrancar. |

**(fuentes: código, inferencia)**

## 3. Diagrama de comunicación entre módulos

```
                    ┌────────────────────┐
       EJECUTAR_─── │                    │ ───INICIAR_PROCESO, CREAR/ELIMINAR_SEGMENTO,
       PROCESO,     │ kernel_scheduler   │    SUSPENDER/DESSUSPENDER_PROCESO,
       INTERRUPCION │      (KS)          │    LEER/ESCRIBIR_MEMORIA
            │        └─────┬──────┬─────┘         │
            │              │      │               │
            ▼              │      │               ▼
      ┌──────────┐         │      │        ┌───────────────┐
      │   cpu    │         │      └───────▶│ kernel_memory │
      └────┬─────┘         │  registro IO  │      (KM)     │
           │  PEDIR_CONTEXTO/INSTRUCCIONES  └──┬─────┬──────┘
           │  (conexión directa a KM)          │     │
           ▼                                   │     │ ESCRIBIR/LEER
   ┌───────────────┐   LEER/ESCRIBIR_MEMORIA    │     │ _BLOQUE_SWAP
   │ memory_stick  │◀───(conexión directa)──────┘     ▼
   │  (ms1..ms4)   │                              ┌────────┐
   └───────────────┘                              │  swap  │
                                                   └────────┘
      ┌──────┐
      │  io  │◀── pedido de IO (STDIN/STDOUT/SLEEP) ── KS
      └──────┘──── aviso de fin de IO ─────────────────▶ KS
```

**Puntos clave del diagrama**: CPU habla **directo** con cada `memory_stick` (no pasa por KM) una
vez que KM le informó la lista de sticks disponibles — es una optimización de performance para no
recargar a KM con cada lectura/escritura de datos. En cambio, CPU **sí** pasa por KS para todo lo
que implica una decisión (syscalls, fin de proceso, segfault). **(fuentes: código)**

## 4. El recorrido de una instrucción, paso a paso

1. **Selección**: KS elige un proceso en READY según el algoritmo configurado (FIFO / Round Robin
   / colas multinivel con prioridades) y lo asigna a una CPU libre con el mensaje `EJECUTAR_PROCESO`.
2. **Traer contexto**: la CPU le pide el contexto a KM (`PEDIR_CONTEXTO`) — recibe los registros
   (PC, EAX, EBX, etc.) y la tabla de segmentos del proceso.
3. **Ciclo de instrucción** (loop interno en la CPU):
   - **Fetch**: pide a KM la instrucción en la posición actual del PC (`PEDIR_INSTRUCCIONES`).
   - **Decode**: separa la instrucción en tokens (nombre + parámetros).
   - **Execute**: según la instrucción, puede ser aritmética/de registros (resuelta enteramente
     en CPU), de acceso a memoria (traduce dirección lógica→física por segmentación y accede
     directo al memory_stick correspondiente), o una **syscall** (corta el ciclo y avisa a KS).
   - El PC avanza automáticamente salvo que la propia instrucción lo haya modificado.
4. **Syscalls típicas**: `IO` (bloquea el proceso y delega en KS→io), `MUTEX_LOCK/UNLOCK` (mutex
   de usuario simulados, con respuesta síncrona), `MEM_ALLOC/MEM_FREE` (crea/borra segmentos vía KM),
   `INIT_PROC` (crea un proceso hijo), `EXIT` (fin de proceso).
5. **Interrupciones**: llegan por un canal aparte (no por el mismo socket de ejecución) y solo se
   atienden **entre instrucciones completas** — no hay preempción a mitad de una instrucción. Pueden
   originarse por vencimiento de quantum (Round Robin) o por desalojo por prioridad (si entra un
   proceso más prioritario a Ready).
6. **Mediano plazo**: si un proceso queda bloqueado (típicamente por IO) más de un tiempo configurado
   (`SUSPENSION_TIMEOUT`), KS le pide a KM que lo **suspenda**: todos sus segmentos se mueven a swap.
   Se **desuspende** cuando aparece memoria disponible o termina otro proceso.
7. **Compactación**: si KM necesita espacio contiguo para un nuevo segmento y no lo encuentra (pero
   hay espacio total suficiente), compacta la memoria activa. Mientras compacta, KS desaloja todas
   las CPUs activas (salvo la que originó el pedido, para evitar que se bloqueen entre sí) hasta que
   termina.

**(fuentes: código — ver informes de cpu, kernel_scheduler y kernel_memory para archivo:línea exactos)**

## 5. Lo que este TP **no** hace (para no confundirse en la defensa)

- **No hay paginación multinivel ni marcos de página.** La gestión de memoria es por
  **segmentación con particiones dinámicas** (huecos + compactación + first/best/worst fit). No
  busques tablas de páginas de 2 niveles ni algoritmo CLOCK: no existen en este diseño.
- **`memory_stick` no es un filesystem.** Es memoria física pura (un buffer de bytes). Las carpetas
  `ms1`–`ms4` son 4 instancias configuradas con distinto tamaño/puerto (4 "pendrives"), no particiones
  de disco.
- **`swap` no decide nada.** Es un simulador de bloques fijos en un archivo; toda la lógica de qué
  bloque corresponde a qué proceso vive en `kernel_memory`.

**(fuentes: código, inferencia)**

## 6. Glosario exprés

- **KS / Kernel Scheduler**: el proceso que planifica y coordina todo.
- **KM / Kernel Memory**: el proceso dueño de la memoria y sus segmentos.
- **Segmento**: bloque contiguo de memoria física asignado a un proceso (no confundir con "página").
- **Hueco**: espacio libre contiguo en la memoria administrada por KM.
- **Suspensión**: mover todos los segmentos de un proceso a swap (equivalente a "swap-out" de proceso completo, no de páginas individuales).
- **Compactación**: reordenar los segmentos activos para eliminar fragmentación externa y liberar un hueco más grande.
- **Quantum**: tiempo máximo que un proceso puede tener la CPU en Round Robin antes de ser desalojado.

**(fuentes: teoría SO, código)**
