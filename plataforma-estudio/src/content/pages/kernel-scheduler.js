// Contenido pedagógico del módulo kernel_scheduler.
// Fuente: informes/05-kernel-scheduler.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'Un sistema operativo clásico organiza la planificación de procesos en tres niveles. `KS` (KS) es el módulo más denso del TP porque implementa los tres a la vez, cada uno en su propio {{g:hilo|una línea de ejecución dentro de un mismo proceso, corre en paralelo con las demás}}.',
    },
    {
      type: 'table',
      headers: ['Nivel', 'Decide', 'En este TP'],
      rows: [
        ['Largo plazo', 'Qué procesos nuevos entran al sistema (`NEW` → `READY`)', 'Sin límite de grado de multiprogramación — pasa todo lo que llega'],
        ['Mediano plazo', 'Qué procesos bloqueados se suspenden (van a memoria secundaria) y cuándo se desuspenden', 'Suspensión por timeout, desuspensión por prioridad'],
        ['Corto plazo', 'Cuál proceso en `READY` ejecuta en la próxima CPU libre (el "dispatcher")', '`FIFO`, `RR` o `CMN`, con desalojo por prioridad opcional'],
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Idea central',
      text: 'KS es el orquestador: mantiene el {{g:PCB|la "ficha" que el sistema arma para cada proceso, con todos sus datos: estado, prioridad, registros, etc.}} de cada proceso, decide quién ejecuta y cuándo, e intermedia entre CPU, IO y kernel_memory. Es, además, dueño de los {{g:mutex|un candado que solo un proceso puede tener a la vez}} simulados que puede pedir el proceso de usuario.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'Todo proceso tiene un PCB (`t_pcb`) que guarda su estado, prioridad, program counter, {{g:quantum|el tiempito máximo que un proceso puede usar la CPU antes de que se lo saquen}} restante, la cola de la que vino y el motivo de su último desalojo.',
    },
    {
      type: 'ul',
      items: [
        '`NEW`: el proceso acaba de crearse, todavía no tiene memoria asignada.',
        '`READY`: listo para ejecutar, esperando que lo elija el planificador de corto plazo.',
        '`EXEC`: corriendo en una CPU.',
        '`BLOCK`: esperando el fin de una operación de IO (o similar).',
        '`SUSP_READY`: listo para ejecutar pero su memoria fue movida a almacenamiento secundario.',
        '`SUSP_BLOCK`: bloqueado y además suspendido — el caso que dispara el planificador de mediano plazo.',
        '`EXIT`: terminado.',
      ],
    },
    {
      type: 'p',
      text: 'El PCB además guarda `generacion_bloqueo`, un contador que se incrementa cada vez que el proceso entra a `BLOCK`. Sirve para invalidar timeouts de suspensión de un bloqueo anterior que ya se resolvió (se explica en Detalles importantes).',
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'El corazón del módulo es la planificación de corto plazo: el hilo `hilo_planificador_corto_plazo` corre en loop infinito eligiendo, entre los procesos en `READY`, cuál ocupa la próxima CPU libre.',
    },
    {
      type: 'ul',
      items: [
        'Antes de elegir, espera que no haya una compactación en curso (ver Detalles importantes) y que se cumplan dos condiciones a la vez: hay al menos un proceso en alguna cola de `READY`, y hay una CPU libre.',
        'Si el algoritmo configurado es {{g:CMN|colas separadas por prioridad, donde primero se atiende siempre a la cola más importante}}, recorre las colas en orden de prioridad estricta — índice 0 es la más prioritaria — y toma el primer proceso de la primera cola no vacía. Nunca mira una cola de menor prioridad si hay algo esperando en una más prioritaria.',
        'Si el algoritmo es {{g:FIFO|el primero que llega es el primero que se atiende, sin importar nada más}} o {{g:RR|se reparte la CPU en turnos de tiempo iguales entre todos los procesos}} (una sola cola), simplemente saca el primero de esa cola.',
        'Al elegir un proceso lo marca `EXEC`, le asigna la CPU libre y le manda la orden de ejecutar.',
      ],
    },
    {
      type: 'table',
      headers: ['Algoritmo', 'Qué hace'],
      rows: [
        ['`FIFO`', 'Una sola cola, orden de llegada.'],
        ['`RR` (Round Robin)', 'Una sola cola, cada proceso corre hasta agotar su quantum.'],
        ['`CMN`', 'Varias colas con prioridad estricta entre ellas; cada cola puede tener su propio algoritmo (ej. `FIFO`, `RR`, `FIFO`, `RR`).'],
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'No hay SJF/SRT',
      text: 'Los únicos algoritmos implementados son `FIFO`, `RR` y `CMN`. Si preguntan por Shortest Job First o Shortest Remaining Time: no están.',
    },
    {
      type: 'p',
      text: 'Cuando una cola usa `RR`, KS lanza un hilo temporizador que, al vencer el quantum, manda una interrupción — pero solo si el proceso todavía sigue en `EXEC`, {{f:un chequeo necesario|Evita interrumpir a un proceso que ya terminó o se bloqueó por su cuenta justo antes de que venciera el quantum — es la misma lógica que resuelve la condición de carrera entre interrupciones y syscalls casi simultáneas, detallada en Errores comunes.}}',
    },
    {
      type: 'p',
      text: 'Además, si `QUEUE_PREEMPTION` está activo, hay desalojo por prioridad: cuando un proceso entra a `READY` en una cola más prioritaria que la del proceso que está corriendo en ese momento, se lo desaloja de inmediato mandando una interrupción puntual a esa CPU.',
    },
  ],

  stepByStep: [
    {
      type: 'p',
      text: 'Ciclo del dispatcher de corto plazo (se repite en loop infinito):',
    },
    {
      type: 'ol',
      items: [
        'Espera a que no haya una compactación en curso.',
        'Espera a que haya al menos un proceso en alguna cola de `READY`.',
        'Espera a que haya una CPU libre.',
        'Selecciona el proceso: por orden estricto de colas si el algoritmo es `CMN`, o de la única cola si es `FIFO`/`RR`.',
        'Marca el PCB como `EXEC` y le asigna la CPU libre.',
        'Le manda la orden de ejecutar al módulo CPU correspondiente.',
        'Si la cola usa Round Robin, lanza un hilo temporizador para el quantum de ese proceso.',
        'Vuelve al paso 1.',
      ],
    },
    {
      type: 'p',
      text: 'Suspensión y desuspensión de mediano plazo (dos flujos separados, disparados por eventos distintos):',
    },
    {
      type: 'ol',
      items: [
        'Un proceso se bloquea por IO. KS lanza un hilo monitor de suspensión que guarda la generación de bloqueo vigente en ese momento.',
        'Ese hilo duerme un tiempo configurado (`SUSPENSION_TIMEOUT`).',
        'Al despertar, chequea: ¿el proceso sigue bloqueado y sigue siendo la misma generación de bloqueo? Si no, no hace nada (el bloqueo viejo ya se resolvió).',
        'Si sigue vigente, pide a kernel_memory (el módulo que administra la memoria) que suspenda al proceso y lo mueve a `SUSP_BLOCK`.',
        'Por otro lado, la desuspensión se dispara ante tres eventos: kernel_memory libera memoria, se conecta un memory_stick nuevo, o termina una compactación.',
        'En cualquiera de esos casos, KS busca en la cola de suspendidos-listos el proceso de mayor prioridad (recorre toda la cola, no es `FIFO`).',
        'Le pide a kernel_memory que lo desuspenda; si hay espacio, lo pasa a `READY`.',
      ],
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'Herencia de prioridad',
      text: 'Los `mutex` simulados que puede pedir el proceso de usuario implementan {{g:herencia de prioridad|cuando un proceso "presta" temporalmente su prioridad alta a otro que tiene bloqueado un recurso que necesita}} para evitar {{g:inversión de prioridades|el problema donde un proceso importante queda esperando indefinidamente a uno menos importante que tiene el recurso que necesita}}: si un proceso de baja prioridad tiene tomado un mutex que necesita uno de alta prioridad, se le eleva temporalmente la prioridad al que lo tiene tomado para que libere el recurso antes. El detalle completo (incluido un fix de deadlock histórico) vive en el informe de sincronización — acá alcanza con saber que existe y por qué.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Compactación y coordinación con kernel_memory',
      text: 'Cuando kernel_memory no encuentra un hueco contiguo para asignar memoria, dispara una compactación y avisa a KS. KS entonces desaloja todas las CPUs activas salvo la que originó el pedido — {{f:así se evita un deadlock|Si hay una sola CPU, esa CPU está bloqueada esperando su propia respuesta y no podría además recibir una interrupción.}} — y bloquea el planificador de corto plazo hasta que kernel_memory avisa que terminó.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Por qué la desuspensión corre en un hilo aparte',
      text: 'El único hilo que lee respuestas de kernel_memory es `hilo_escucha_memoria`. Si la desuspensión se llamara inline desde ahí al recibir el aviso de memoria disponible, y esa lógica necesitara a su vez pedirle algo a kernel_memory y esperar la respuesta, el hilo terminaría esperándose a sí mismo — deadlock. Por eso se dispara en un hilo aparte.',
    },
    {
      type: 'p',
      text: '`generacion_bloqueo` es un patrón general reutilizable: cuando un temporizador asincrónico puede "sobrevivir" a un cambio de estado, conviene versionar el estado con un contador así para poder descartar avisos viejos.',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'Condición de carrera: interrupción vs. syscall casi simultánea',
      text: 'Una interrupción (por quantum vencido o por desalojo de prioridad) puede llegar casi al mismo tiempo que una syscall que ya liberó al proceso por otro camino. Está documentado explícitamente en el código: se resuelve chequeando que el proceso siga en `EXEC` antes de procesar la interrupción — si ya no lo está, se la ignora como "vieja".',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Si no se verifica que el proceso siga en EXEC',
      text: 'Sin ese chequeo, una interrupción tardía podría desalojar o reencolar un proceso que ya terminó, ya se bloqueó, o que ya está corriendo otra cosa en su lugar — corrompiendo el estado del PCB o el de la CPU. El chequeo explícito es lo que evita ese escenario.',
    },
  ],

  summary: [
    {
      type: 'ul',
      items: [
        '`KS` implementa los tres niveles clásicos de planificación (largo, mediano y corto plazo), cada uno en su propio hilo.',
        'Estados de proceso: `NEW`, `READY`, `EXEC`, `BLOCK`, `SUSP_READY`, `SUSP_BLOCK`, `EXIT` — todos registrados en el PCB.',
        'Corto plazo: elige según `FIFO`, `RR` o `CMN` (colas con prioridad estricta); soporta desalojo por prioridad y por quantum. No hay SJF/SRT.',
        'Mediano plazo: suspende procesos bloqueados tras un timeout (validado por generación de bloqueo) y desuspende por prioridad ante tres eventos distintos.',
        'La herencia de prioridad evita inversión de prioridades en los `mutex` simulados.',
        'La compactación de memoria pausa el planificador de corto plazo y desaloja CPUs para coordinarse con kernel_memory.',
        'Hay una condición de carrera documentada entre interrupciones y syscalls casi simultáneas, resuelta chequeando que el proceso siga en `EXEC`.',
      ],
    },
  ],
}

// Fuente: informes/05-kernel-scheduler.md
