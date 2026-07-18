# Informe: módulo `cpu`

> **(fuentes: código)** / **(fuentes: inferencia)** / **(fuentes: teoría SO)** al final de cada bloque.

## 1. Intro teórica

En un SO real, la CPU ejecuta instrucciones de máquina directamente sobre memoria física, resolviendo
direcciones lógicas a físicas mediante una **MMU** (Memory Management Unit) — típicamente con
paginación y TLB. En este TP, la CPU es un **proceso simulador**: no ejecuta código de máquina real,
sino un pseudo-lenguaje de instrucciones (`SET`, `SUM`, `MOV_IN`, `IO`, etc.) leído en tiempo real
desde Kernel Memory. La MMU simulada acá resuelve direcciones por **segmentación**, no por
paginación (ver [Informe de kernel_memory](06-kernel-memory.md) para la justificación completa del
esquema de memoria elegido). **(fuentes: teoría SO, inferencia)**

## 2. Responsabilidad del módulo

CPU es el componente que **ejecuta** — no decide qué proceso corre (eso es de kernel_scheduler) ni
administra la memoria (eso es de kernel_memory). Es deliberadamente "tonta": recibe la orden de
ejecutar un PID, hace fetch-decode-execute instrucción por instrucción, y en el momento en que la
instrucción implica una decisión (bloquearse por IO, pedir memoria, terminar) corta su propio ciclo
y le pasa la pelota a kernel_scheduler. **(fuentes: código, inferencia)**

## 3. Ciclo de vida (`cpu/src/main.c:540-670`)

1. Requiere dos argumentos: `argv[1]` = path de config, `argv[2]` = `cpu_id` (`:541-547`). El
   `cpu_id` real viene de acá, **no** del `CPU_ID` que figura en `cpu.config:17` (esa clave del
   config queda sin usar — dato curioso si preguntan por qué está en el archivo).
2. `obtener_config` (`:673-691`) lee `cpu.config`.
3. Handshake secuencial con tres conexiones distintas:
   - **kernel_scheduler** (`:554-580`): conecta, manda su credencial `t_modulo=CPU` + `cpu_id`, espera confirmación.
   - **kernel_memory** (`:584-613`): mismo patrón de handshake.
   - **Canal de interrupciones** (`:620-652`): una **segunda conexión** hacia kernel_scheduler, mismo IP, puerto `PUERTO_KINTERRUPT` — separado del canal de ejecución para que una interrupción pueda llegar aunque el canal principal esté ocupado esperando otra cosa.
4. Justo después del handshake con KM, recibe la lista de Memory Sticks a los que debe conectarse **directamente** (`conectar_memory_sticks`, `:179-218`, invocada en `:616`).
5. Lanza un hilo *detached* `escuchar_interrupciones` (`:220-227`, creado en `:655-657`) que corre en paralelo al ciclo principal.
6. Entra a `ciclo_cpu()` (`:659`, definida en `:229-477`) — bucle infinito.
7. Al cortar (KS desconectado): cierra los 3 sockets + cada socket de Memory Stick, destruye logger y config (`:661-666`).

**(fuentes: código)**

## 4. El ciclo de instrucción (fetch-decode-execute)

Bucle externo (`ciclo_cpu`, `:230-476`): bloquea esperando `recibir_operacion(socket_kscheduler)`;
descarta cualquier código que no sea `EJECUTAR_PROCESO` (`:233`). Al recibir uno:

1. Recibe el PID (`:236-239`) y pide el contexto completo a Kernel Memory con `pedir_contexto` (`:242`, función en `:479-508`) — en la **misma respuesta** viaja también la tabla de segmentos actualizada del proceso (`:496-504`), no solo los registros.
2. Entra al **loop de instrucción** (`:247-464`), una iteración por instrucción:
   - **Fetch** (`:519-536`): pide a KM la instrucción en la posición actual del PC (`PEDIR_INSTRUCCIONES`).
   - **Decode** (`:255`): `string_split(instruccion, " ")`.
   - **Execute** (`:264-455`): dispatcher `if/else strcmp` gigante — ver tabla de instrucciones abajo.
   - El PC se incrementa automáticamente salvo que la propia instrucción ya lo haya modificado (flag `pc_modificado`, `:457`).
   - Tras cada instrucción se chequea `hay_interrupcion` (seteado por el hilo de interrupciones) y, si está en 1, corta el loop (`:460-463`).
3. Al salir del loop interno: si corresponde (`guardar_al_salir`), guarda el contexto en KM (`:467`); si había una interrupción pendiente, se le avisa a KS con `INTERRUPCION` (`:468-475`).

**(fuentes: código)**

## 5. Instrucciones soportadas (`ciclo_cpu`, `:264-455`)

| Instrucción | Qué hace | ¿Corta el ciclo? |
|---|---|---|
| `NOOP` | No hace nada. | No |
| `SET reg valor` | Escribe un registro. | No (salvo que sea `SET PC`, que marca `pc_modificado`) |
| `SUM reg1 reg2` | `reg1 = reg1 + reg2`. | No |
| `SUB reg1 reg2` | `reg1 = reg1 - reg2`. | No |
| `JNZ reg valor` | Si `reg != 0`, `PC = valor`. | No |
| `SLEEP ms` | Syscall a KS, el proceso se bloquea. | **Sí** |
| `STDIN dir tam` / `STDOUT dir tam` | Syscall a KS para operar con un IO. | **Sí** |
| `MUTEX_CREATE nombre` | Syscall a KS, crea el mutex simulado si no existe. | No (no bloquea) |
| `MUTEX_LOCK nombre` | A diferencia del resto, espera una **respuesta síncrona inmediata** por `recv` (`:341-343`) — si vuelve bloqueado, corta el ciclo. | Depende de la respuesta |
| `MUTEX_UNLOCK nombre` | Igual, respuesta síncrona (`:353-354`), nunca bloquea. | No |
| `MEM_ALLOC id tam` / `MEM_FREE id` | Syscall a KS para crear/eliminar un segmento. | **Sí** |
| `INIT_PROC path prioridad` | Syscall a KS para crear un proceso hijo. | **Sí** |
| `MOV_IN reg` / `MOV_OUT reg` | Traduce dirección lógica (registro `SI`/`DI`) a física y lee/escribe en el Memory Stick correspondiente. | Solo si segfault |
| `COPY_MEM tam` | Copia `tam` bytes entre dos direcciones lógicas (`SI`→`DI`), traduciendo ambas. | Solo si segfault |
| `EXIT` | Avisa `FIN_PROCESO` a KS. | **Sí** (y no guarda contexto) |

**(fuentes: código)**

## 6. Traducción de direcciones: segmentación, no paginación

`traducir_direccion(dir_logica, tam, &dir_fisica)` (`:75-93`):

```
id_segmento    = dir_logica / segment_max_size
desplazamiento = dir_logica % segment_max_size
```

Busca en `tabla_segmentos[]` (caché local, hasta `MAX_SEGMENTOS=256`, refrescada en cada
`pedir_contexto`) el segmento con ese `id_segmento`; si no existe o `desplazamiento + tam` excede el
`limite` del segmento, es **segfault** (`enviar_segfault`, `:95-101`, código `SEG_FAULT`) y la
ejecución de esa instrucción aborta sin guardar contexto (`guardar_al_salir = false`). Si es válida,
la dirección física es `base + desplazamiento`. **No hay TLB ni caché de traducciones** — se recalcula
cada vez. **(fuentes: código)**

## 7. Acceso a memoria física: varios Memory Sticks como uno solo

La memoria física total es la **concatenación** de los Memory Sticks conectados, cada uno con una
`base_fisica` creciente (`t_info_ms`, `cpu.h:23-27`; asignación de bases en `conectar_memory_sticks`,
`:179-218`). `leer_bytes_ms`/`escribir_bytes_ms` (`:115-177`) parten automáticamente un pedido que
cruce el límite entre dos Memory Sticks contiguos en varios tramos, uno por stick, hasta cubrir el
tamaño pedido — esto es clave para entender cómo "varios pendrives" se comportan como una única
memoria física ante el programa simulado. **Detalle de protocolo**: esta comunicación usa
`send`/`recv` crudos con opcodes (`LEER_MEMORIA`/`ESCRIBIR_MEMORIA`), **no** el `t_paquete` genérico
de so-commons que se usa para el resto de las comunicaciones — ver
[Informe de Comunicaciones](02-comunicaciones.md) §5. **(fuentes: código)**

## 8. Interrupciones

Hilo aparte, *detached*, escuchando un socket dedicado (`escuchar_interrupciones`, `:220-227`): al
recibir `INTERRUPCION`, simplemente marca `hay_interrupcion = 1` (variable `volatile`, no atómica).
El ciclo principal solo revisa esta bandera **entre instrucciones completas** (`:460-463`) — no hay
preempción a mitad de una instrucción. Si la interrupción llega mientras el proceso ya está
bloqueado esperando una syscall (ej. IO), queda pendiente hasta el próximo `EJECUTAR_PROCESO` de ese
mismo proceso. **(fuentes: código, inferencia)**

## 9. Sincronización

CPU **no tiene mutex propios**: el único hilo adicional (interrupciones) solo escribe una bandera
`volatile int`, y el ciclo principal solo la lee — no hay estructuras compartidas más complejas que
proteger. La variable global `sem_cpus_libres` (`main.c:10`) existe solo porque el enlazado con
`utils.c` la requiere (es la que usa kernel_scheduler para saber si hay una CPU libre), pero CPU no
la usa. **(fuentes: código)**

## 10. Configuración (`cpu/cpu.config`)

`IP_KSCHEDULER`, `PUERTO_KSCHEDULER`, `PUERTO_KINTERRUPT` (mismo IP que KS), `IP_KMEMORY`,
`PUERTO_KMEMORY`, `LOG_LEVEL`, `SEGMENT_MAX_SIZE`. Las claves `IP_MEMORYSTICK`/`PUERTO_MEMORYSTICK`
figuran en el archivo pero **no se leen** (`obtener_config`, `:673-691`) — la IP/puerto real de cada
Memory Stick llega dinámicamente desde KM en el handshake inicial (comentario explícito en el
código, `:687`). `CPU_ID` también es una dead key por la razón explicada en la sección 3.
**(fuentes: código)**

## 11. Puntos no triviales para la defensa

- **`CPU_ID`/`IP_MEMORYSTICK`/`PUERTO_MEMORYSTICK` en el config son vestigiales** — si preguntan
  "¿de dónde saca la CPU el ID?" o "¿cómo sabe la IP del Memory Stick?", la respuesta correcta es
  *por argumento de línea de comandos* y *porque se lo manda Kernel Memory dinámicamente*
  respectivamente, no por archivo de configuración.
- **Inconsistencia de protocolo**: CPU↔Memory Stick usa sends/recvs crudos, mientras que
  CPU↔KS/KM usa el protocolo de paquetes genérico.
- **`MUTEX_LOCK`/`MUTEX_UNLOCK` son las únicas syscalls con respuesta síncrona inmediata** (`recv`
  fuera del ciclo normal de `EJECUTAR_PROCESO`) — todas las demás simplemente cortan el ciclo
  (`seguir_ejecutando=false`) y esperan un futuro `EJECUTAR_PROCESO` para continuar.
- **Segfault no guarda contexto** — el estado del proceso en el momento del segfault se pierde
  desde la perspectiva de la CPU; es responsabilidad del resto del sistema (KS/KM) manejar el
  proceso desde ahí (normalmente, finalizarlo).

**(fuentes: código, inferencia)**
