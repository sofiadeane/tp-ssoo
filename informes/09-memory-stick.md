# Informe: módulo `memory_stick`

> **(fuentes: código)** / **(fuentes: inferencia)** al final de cada bloque.

## 1. Aclaración importante: no es un filesystem

`memory_stick` simula **memoria física (RAM) de un "pendrive"/placa enchufable**, **no** un
filesystem. No hay archivos, directorios, bloques con metadata ni journaling en este módulo — es un
único buffer plano de bytes. Si preguntan por compactación o fragmentación de un memory stick, la
respuesta correcta es que esa lógica vive en `kernel_memory`, no acá — ver
[Informe de Kernel Memory](06-kernel-memory.md). **(fuentes: código)**

## 2. ¿Qué son las carpetas `ms1`–`ms4`?

Son **4 juegos de config duplicados** (`memory_stick/ms{1..4}/memory_stick.config`, idénticos a
`memory_stick/MemoryStick_{1..4}.config` en la raíz del módulo) para correr **4 instancias
simultáneas** del mismo binario como 4 "pendrives" independientes — cada uno con su propio
`PUERTO_ESCUCHA` (4321/4322/4323/4324 típicamente) y `TAMANIO`. No contienen datos ni son
particiones de un filesystem: son solo configuración para simular memoria física expansible/
"plug-n-play" (coherente con el mensaje `NUEVA_MEMORIA_DISPONIBLE` que kernel_memory le manda a
kernel_scheduler cuando se conecta uno). **(fuentes: código, inferencia)**

## 3. Responsabilidad del módulo

Guardar bytes y devolverlos cuando se los piden — sin saber para qué proceso, segmento, o página
son. Un único buffer `uint8_t* memoria` (`memory_stick.h`) de `tamanio_memoria` bytes.
**(fuentes: código)**

## 4. Ciclo de vida / `main()` (`memory_stick/src/main.c:22-91`)

1. Requiere **dos** argumentos: `argv[1]`=config, `argv[2]`=**tamaño**. El tamaño real del buffer
   viene de acá (`:36`), **no** de la clave `TAMANIO` que figura en el `.config` — esa clave queda
   sin usar (`obtener_config`, `:93-102`, nunca la lee).
2. Reserva el buffer con `malloc` + `memset` a 0 (`:37-38`).
3. **Registro ante Kernel Memory** (`:40-69`): conecta, manda `tipo=MEMSTICK`, tamaño, y además **su
   propia IP y puerto de escucha** (`:59-65`) — así KM puede reenviárselos después a las CPUs para
   que se conecten directo (ver [Informe de CPU](04-cpu.md) §7).
4. Lanza un hilo dedicado (`manejar_operaciones_km`, `:169-176`) para atender pedidos que lleguen por
   **esa misma conexión** de registro.
5. Levanta su **propio servidor** (`iniciar_servidor`, `:77`) para que las CPUs se conecten
   directamente — bypass de KM para las lecturas/escrituras de datos, por performance
   (`servidor_cpus`, `:199-226`, un hilo por CPU conectada).

**(fuentes: código)**

## 5. Las dos operaciones soportadas

Una única función (`atender_operaciones_memoria`, `:123-164`) atiende tanto el socket de registro
con KM como cada socket de CPU:

| Operación | Recibe | Hace |
|---|---|---|
| `LEER_MEMORIA` | `dir` (uint32) + `tam` (uint32) | Duerme `MEMORY_DELAY` ms, toma `mutex_memoria`, `send(&memoria[dir], tam)` |
| `ESCRIBIR_MEMORIA` | `dir` + `tam` | Duerme `MEMORY_DELAY` ms, toma `mutex_memoria`, `recv` directo sobre `&memoria[dir]`, responde `ok=1` |

**Sin validación de límites**: no se chequea `dir + tam <= tamanio_memoria` antes de leer/escribir —
confía ciegamente en que quien pide (KM, que ya validó contra `SEGMENT_MAX_SIZE` y el segmento del
proceso) mandó una dirección válida. Un `dir`/`tam` mal calculado produciría un acceso fuera del
buffer. **(fuentes: código)**

## 6. Comunicación con otros módulos

Dos canales distintos comparten la misma lógica de atención:

1. **Conexión de registro con Kernel Memory**: usada por KM cuando necesita leer/escribir
   directamente (ej. durante compactación).
2. **Servidor propio para CPUs**: las CPUs se conectan acá después de recibir la lista de sticks de
   parte de KM, y hacen sus lecturas/escrituras de memoria **directo**, sin pasar por KM.

Protocolo: opcode (`int`) + payload crudo por `send`/`recv` — **no** usa el `t_paquete` de
so-commons, igual que el resto de las comunicaciones de datos de memoria (ver
[Informe de Comunicaciones](02-comunicaciones.md) §5). **(fuentes: código)**

## 7. Sincronización

Un único `mutex_memoria` global (`memory_stick.h`) protege **todo el buffer completo** —
granularidad gruesa: se toma el mutex para cualquier lectura o escritura sin importar la dirección
o el tamaño, no hay locks por región/bloque. Esto es simple y correcto, aunque serializa
completamente el acceso al stick entre CPUs concurrentes. **Código vestigial**: `cpus_conectadas` y
`sem_cpus_libres` se declaran e inicializan (`:83-84`) pero no se usan después de eso.
**(fuentes: código)**

## 8. Configuración (`memory_stick/memory_stick.config` y variantes `ms1`–`ms4`)

`IP_KMEM`/`PUERTO_KMEM` (a quién registrarse), `IP`/`PUERTO_ESCUCHA` (servidor propio, para las
CPUs), `MEMORY_DELAY` (ms de retardo simulado por acceso), `LOG_LEVEL`. `TAMANIO` figura mas es
**dead key** — el tamaño real llega por `argv[2]`. También hay una clave `CLAVE=MensajeSuperSecreto`
en el config que no se usa en ningún lado del código relevado — probablemente vestigial de una
plantilla anterior. **(fuentes: código)**

## 9. Puntos no triviales para la defensa

- **Si se cae la conexión con Kernel Memory, el proceso hace `exit(EXIT_FAILURE)`** (`:174-175`) —
  decisión de diseño explícita: sin KM administrándolo, el stick no tiene sentido por sí solo.
- **`terminar_programa`** (`:113-117`) es efectivamente **inalcanzable** en la práctica: el servidor
  de CPUs corre en un loop infinito y no hay manejo de señales (`SIGINT`) para salir limpio — el
  proceso normalmente termina por `Ctrl+C` o al matarlo, no por este camino.
- **No valida límites de dirección/tamaño** — ver §5, es un punto para mencionar si preguntan por
  robustez, no un bug para "arreglar" en el informe.
- **`TAMANIO` y `CLAVE` en el config son dead keys** — si preguntan de dónde sale el tamaño real, la
  respuesta es *por argumento de línea de comandos*.

**(fuentes: código, inferencia)**
