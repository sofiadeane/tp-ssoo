// Contenido pedagógico de otras estructuras de control del sistema.
// Fuente: informes/10-otras-estructuras-de-control.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'Todo SO necesita mantener el estado de lo que administra en estructuras dedicadas — clásicamente agrupadas en 4 categorías: tablas de procesos (PCB), tablas de memoria (segmentos/páginas y espacio libre), tablas de E/S (qué dispositivo está haciendo qué) y tablas de archivos (no aplica en este TP, ya que memory_stick no es un filesystem).',
    },
    {
      type: 'p',
      text: 'Este TP tiene una estructura por cada una de las primeras tres categorías, repartidas entre kernel_scheduler y kernel_memory según a quién le corresponde esa responsabilidad. Esta página funciona como catálogo: recorre esas estructuras a través de todos los módulos.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Qué NO cubre esta página',
      text: 'La sincronización (mutex, semáforos, herencia de prioridad) ya se explica en la página de Sincronización. Acá se cubren las estructuras de datos en sí, independientemente de cómo se protegen.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'El PCB (Process Control Block) es la estructura de control central: representa a cada proceso en kernel_scheduler. En este TP es el t_pcb, definido en kernel_scheduler/src/scheduler.h:11-27.',
    },
    {
      type: 'code',
      text: `typedef struct {
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
} t_pcb;`,
    },
    {
      type: 'ul',
      items: [
        'Se mantiene en lista_todos_pcb (una t_list* de so-commons, protegida por mutex_lista_todos_pcb).',
        'Además está referenciado desde la cola correspondiente a su estado actual (colas_ready[], cola_new, cola_susp_ready, cola_susp_block).',
        'No hay un PCB separado del lado de kernel_memory: KM tiene su propia estructura equivalente para lo que le corresponde (t_proceso_km, ver sección de detalles).',
      ],
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'Todas las colas de procesos viven en kernel_scheduler y están implementadas con t_queue* de so-commons-library (commons/collections/queue.h) — ninguna es una estructura propia reimplementada. No se usa t_dictionary en ningún módulo del repo, aunque kernel_scheduler/src/main.c incluye el header sin llegar a usarlo.',
    },
    {
      type: 'table',
      headers: ['Cola', 'Qué contiene', 'Protegida por'],
      rows: [
        ['cola_new', 'Procesos recién creados, esperando pasar a READY', 'mutex_new'],
        ['colas_ready[] (array, una por prioridad)', 'Procesos listos para ejecutar', 'mutexes_ready[]'],
        ['cola_susp_ready', 'Procesos suspendidos (en swap) pero ya sin motivo de bloqueo', 'mutex_susp_ready'],
        ['cola_susp_block', 'Procesos suspendidos y todavía bloqueados (ej. esperando IO)', 'mutex_susp_block'],
        ['cola_bloqueados (una por t_mutex_simulado)', 'Procesos esperando tomar un mutex de usuario', 'mutex_interno del mutex'],
        ['cola (una por t_io_modulo)', 'Pedidos de IO pendientes para ese dispositivo', 'mutex del t_io_modulo'],
      ],
    },
  ],

  stepByStep: [
    {
      type: 'p',
      text: 'Esta página no describe un flujo temporal de ejecución sino un catálogo de responsabilidades. La pregunta útil para orientarse es "quién es dueño de qué tabla":',
    },
    {
      type: 'table',
      headers: ['Tabla', 'Vive en', 'Estructura', 'Lista/cola que la contiene'],
      rows: [
        ['Procesos (PCB)', 'kernel_scheduler', 't_pcb', 'lista_todos_pcb + colas por estado'],
        ['Segmentos activos/suspendidos', 'kernel_memory', 't_segmento / t_segmento_suspendido', 't_proceso_km.segmentos[_suspendidos]'],
        ['Espacio libre', 'kernel_memory', 't_hueco', 'lista_huecos'],
        ['Memory Sticks conectados', 'kernel_memory', 't_memory_stick_info', 'memory_sticks'],
        ['Dispositivos IO', 'kernel_scheduler', 't_io_modulo / t_io_pedido', 'lista_modulos_io + cola propia por dispositivo'],
        ['Mutex de usuario', 'kernel_scheduler', 't_mutex_simulado', 'lista_mutexes'],
        ['CPUs conectadas', 'compartida (utils)', 't_cpu', 'cpus_conectadas'],
      ],
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 't_proceso_km, t_segmento y t_segmento_suspendido',
      text: 't_proceso_km (kernel_memory.h:32-39) es la "vista de memoria" de cada proceso desde KM: path del pseudocódigo, contexto de registros, lista de segmentos activos y lista de segmentos suspendidos. t_segmento (compartido con CPU, utils.h:67-71) es {id_segmento, base, limite}: la unidad de memoria contigua asignada. t_segmento_suspendido (kernel_memory.h:12-16) es igual pero con una lista de números de bloque en swap en vez de una base física.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 't_hueco',
      text: 't_hueco (kernel_memory.h:54-57) es {base, limite}: espacio libre contiguo, guardado en lista_huecos, la estructura que usa encontrar_hueco para first/best/worst-fit.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 't_memory_stick_info',
      text: 't_memory_stick_info (kernel_memory.h:45-52) representa cada Memory Stick conectado como una franja [dir_inicio, dir_inicio+tamanio) del espacio físico global.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 't_io_modulo y t_io_pedido',
      text: 't_io_modulo (scheduler.h:46-53) representa cada dispositivo IO conectado: nombre, socket, cola de pedidos pendientes, mutex+semáforo propios, y el PCB atendido en este momento (pcb_actual, NULL si está libre). Se guardan en lista_modulos_io (protegida por mutex_lista_io). t_io_pedido (scheduler.h, ~líneas 35-43) representa un pedido puntual de IO: tipo (SLEEP/STDIN/STDOUT), parámetros, y la dirección lógica involucrada (para STDIN/STDOUT, que necesitan hablar con Kernel Memory).',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 't_mutex_simulado',
      text: 'Aunque el mutex en sí es una primitiva de sincronización, la estructura que lo representa (scheduler.h:56-63) es una estructura de control más: nombre, si está libre, quién es el dueño, cola de bloqueados, y la prioridad original del dueño (para restaurarla tras la herencia de prioridad). Se crean al arrancar según la clave RECURSOS del config, y viven en lista_mutexes.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 't_cpu',
      text: 't_cpu (utils.h:107-113) es {id, socket, socket_interrupt, libre, cpu_socket}: cada CPU conectada al sistema, si está libre u ocupada, y sus dos sockets (ejecución + interrupciones). Vive en cpus_conectadas (t_list*, compartida entre kernel_scheduler y kernel_memory vía utils.c), protegida por mutex_cpus. El semáforo sem_cpus_libres (contador de CPUs libres) es la otra cara de esta misma tabla.',
    },
    {
      type: 'p',
      text: 'Extra: t_info_finalizado (kernel_scheduler/src/main.c:106-109) es {pid, motivo} — un log acumulativo (no una tabla de control en el sentido clásico, pero sí una estructura de estado del sistema) que se imprime completo cada vez que termina un proceso (registrar_fin_proceso, :113-133), protegido por mutex_lista_finalizados. Útil para mostrar en la defensa como evidencia de qué terminó y por qué.',
    },
  ],

  commonErrors: [],

  summary: [
    {
      type: 'ul',
      items: [
        'El PCB (t_pcb) es la tabla de procesos: vive en kernel_scheduler, en lista_todos_pcb más las colas por estado.',
        'Las colas de procesos (cola_new, colas_ready[], cola_susp_ready, cola_susp_block, colas de bloqueados por mutex, colas de pedidos por dispositivo IO) usan todas t_queue* de so-commons — no hay reimplementación propia.',
        'La memoria se administra por segmentación, no paginación: t_segmento, t_segmento_suspendido y t_hueco viven en kernel_memory, junto con t_memory_stick_info para los Memory Sticks conectados.',
        't_io_modulo/t_io_pedido representan los dispositivos IO y sus pedidos, del lado de kernel_scheduler.',
        't_mutex_simulado es la estructura de control detrás de los mutex de usuario (la lógica de sincronización se explica aparte, en el informe de Semáforos y Sincronización).',
        't_cpu es la tabla de CPUs conectadas, compartida entre kernel_scheduler y kernel_memory.',
        'Tabla resumen de quién es dueño de qué: Procesos → kernel_scheduler (t_pcb); Segmentos → kernel_memory (t_segmento/t_segmento_suspendido); Espacio libre → kernel_memory (t_hueco); Memory Sticks → kernel_memory (t_memory_stick_info); Dispositivos IO → kernel_scheduler (t_io_modulo/t_io_pedido); Mutex de usuario → kernel_scheduler (t_mutex_simulado); CPUs → compartida (t_cpu).',
      ],
    },
  ],
}

// Fuente: informes/10-otras-estructuras-de-control.md
