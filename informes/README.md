# Informes de defensa — TP Sistemas Operativos

Guía rápida para encontrar información antes de la defensa. Empezá por el **mapa rápido** si tenés
poco tiempo; el resto está pensado para consultar el detalle de cada tema puntual.

| # | Informe | Para qué sirve |
|---|---|---|
| 1 | [Mapa rápido](01-mapa-rapido.md) | Chuleta de 10 minutos: arquitectura general, diagrama de comunicación, flujo de una instrucción de punta a punta. **Leer primero.** |
| 2 | [Comunicaciones](02-comunicaciones.md) | Protocolo de paquetes, sockets, handshakes, qué canales NO usan el protocolo genérico. |
| 3 | [Semáforos y sincronización](03-semaforos-sincronizacion.md) | Mutex/semáforos de cada módulo, herencia de prioridad, el fix de deadlock histórico. |
| 4 | [CPU](04-cpu.md) | Ciclo de instrucción, instrucciones soportadas, traducción de direcciones, interrupciones. |
| 5 | [Kernel Scheduler](05-kernel-scheduler.md) | Los 3 niveles de planificación, algoritmos, compactación, suspensión/desuspensión. |
| 6 | [Kernel Memory](06-kernel-memory.md) | Segmentación (no paginación), huecos, compactación, swap, el caso "fixes mutex". |
| 7 | [IO](07-io.md) | Dispositivo genérico, protocolo STDIN/STDOUT/SLEEP. |
| 8 | [Swap](08-swap.md) | Simulador de bloques en disco, protocolo con Kernel Memory. |
| 9 | [Memory Stick](09-memory-stick.md) | Memoria física pura (no filesystem), las 4 instancias ms1-ms4. |
| 10 | [Otras estructuras de control](10-otras-estructuras-de-control.md) | PCB, tabla de segmentos, huecos, tabla de IO, tabla de CPUs — quién guarda qué. |
| 11 | [Resumen de armado del proyecto](11-resumen-armado-proyecto.md) | Quién hizo qué + qué problemas surgieron y cómo se resolvieron (no es un timeline de git). |

## Cómo leer las fuentes

Cada bloque de cada informe termina con una etiqueta:

- **(fuentes: código)** — verificado leyendo el código, con archivo:línea.
- **(fuentes: inferencia)** — deducido de cómo encajan las piezas, no está dicho explícitamente en ningún lado.
- **(fuentes: historial de commits)** — reconstruido a partir de un commit puntual (mensaje y/o diff).
- **(fuentes: teoría SO)** — concepto general de la materia, no específico de este código.
