// Contenido pedagógico del módulo CPU.
// Fuente: informes/04-cpu.md (podés descargarlo desde la página).
// Esquema de bloques soportados: p, ul, ol, code, callout, table — ver
// src/components/ContentBlock.jsx. Dentro de cualquier texto podés usar:
//   **negrita**, `código/instrucción`, {{g:TERMINO|explicación corta}},
//   {{f:TERMINO|explicación larga}} (nota al pie) — ver src/lib/richText.jsx.
export default {
  intro: [
    {
      type: 'p',
      text: 'En un SO real, la CPU ejecuta instrucciones de máquina directamente sobre memoria física, resolviendo direcciones lógicas a físicas mediante una {{g:MMU|la parte que traduce una dirección que usa el programa a la dirección real en la memoria física}} (Memory Management Unit) — típicamente con paginación y {{g:TLB|una caché rápida de traducciones de direcciones, para no recalcularlas siempre (este TP no la usa)}}. En este TP, la CPU es un proceso simulador: no ejecuta código de máquina real, sino un pseudo-lenguaje de instrucciones (`SET`, `SUM`, `MOV_IN`, `IO`, etc.) leído en tiempo real desde `Kernel Memory`.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Idea central',
      text: 'La MMU simulada acá resuelve direcciones **por segmentación, no por paginación**. Es una decisión de diseño del TP, no un detalle menor — conviene tenerla clara desde el arranque porque cambia todo el esquema de traducción de direcciones.',
    },
  ],

  concepts: [
    {
      type: 'p',
      text: 'CPU es el componente que ejecuta — no decide qué proceso corre (eso es de `KS`) ni administra la memoria (eso es de `KM`). Es deliberadamente "tonta".',
    },
    {
      type: 'ul',
      items: [
        'Recibe la orden de ejecutar un {{g:PID|el número que identifica a cada proceso, como un DNI}} y hace {{g:fetch-decode-execute|el ciclo básico de toda CPU: buscar la próxima instrucción, entender qué pide, y hacerla}} instrucción por instrucción.',
        'En el momento en que una instrucción implica una decisión (bloquearse por IO, pedir memoria, terminar), corta su propio ciclo y le pasa la pelota a `KS`.',
        'No tiene {{g:mutex|un candado que solo un proceso puede tener a la vez}} propios ni estructuras compartidas complejas que proteger: el único hilo adicional (interrupciones) solo escribe una bandera `volatile`, y el ciclo principal solo la lee.',
      ],
    },
  ],

  howItWorks: [
    {
      type: 'p',
      text: 'CPU arranca con dos argumentos: el path del config y el `cpu_id`. Ese `cpu_id` sale de la línea de comandos — no del config — y es el que se usa realmente en todo el sistema.',
    },
    {
      type: 'ol',
      items: [
        '{{g:Handshake|el "saludo" inicial donde dos procesos se identifican antes de empezar a hablar en serio}} con `KS`: conecta, manda su credencial `t_modulo=CPU` + `cpu_id`, espera confirmación.',
        'Handshake con `KM`: mismo patrón.',
        'Abre una segunda conexión hacia `KS`, el canal de interrupciones (mismo IP, puerto `PUERTO_KINTERRUPT`) — separado del canal de ejecución para que una interrupción pueda llegar aunque el canal principal esté ocupado esperando otra cosa.',
        'Justo después del handshake con `KM`, recibe la lista de `Memory Sticks` a los que debe conectarse directamente.',
        'Lanza un hilo detached `escuchar_interrupciones` que corre en paralelo al ciclo principal.',
        'Entra al `ciclo_cpu()`: bucle infinito que espera `EJECUTAR_PROCESO` de `KS`.',
        'Al cortar (`KS` desconectado): cierra los 3 sockets más cada socket de `Memory Stick`, y destruye logger y config.',
      ],
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Tres conexiones, no una',
      text: 'CPU mantiene simultáneamente: el canal de ejecución con `KS`, el canal de interrupciones (otra conexión aparte, mismo destino) y la conexión con `KM` — más una conexión directa a cada `Memory Stick`.',
    },
  ],

  stepByStep: [
    {
      type: 'p',
      text: 'El bucle externo (`ciclo_cpu`) bloquea esperando una operación de `KS` y descarta cualquier código que no sea `EJECUTAR_PROCESO`. Al recibir uno, arranca el ciclo de instrucción.',
    },
    {
      type: 'ol',
      items: [
        'Recibe el PID y pide el contexto completo a `Kernel Memory` con `pedir_contexto` — en la misma respuesta viaja también la tabla de {{g:segmentos|pedazos contiguos de memoria física que tiene asignados un proceso}} actualizada del proceso, no solo los registros.',
        'Entra al loop de instrucción, una iteración por instrucción: `Fetch` (pide a `KM` la instrucción en la posición actual del {{g:PC|el registro que indica cuál es la próxima instrucción a ejecutar}}), `Decode` (separa la instrucción por espacios) y `Execute` (dispatcher tipo if/else gigante según la instrucción).',
        'El `PC` se incrementa automáticamente salvo que la propia instrucción ya lo haya modificado (flag `pc_modificado`).',
        'Tras cada instrucción se chequea `hay_interrupcion` (seteado por el hilo de interrupciones) y, si está en 1, corta el loop.',
        'Al salir del loop interno: si corresponde, guarda el contexto en `KM`; si había una interrupción pendiente, avisa a `KS` con `INTERRUPCION`.',
      ],
    },
    {
      type: 'table',
      headers: ['Instrucción', 'Qué hace', '¿Corta el ciclo?'],
      rows: [
        ['`NOOP`', 'Acá la CPU no hace nada.', 'No'],
        ['`SET reg valor`', 'Acá la CPU escribe un valor en un registro.', 'No (salvo `SET PC`, que marca `pc_modificado`)'],
        ['`SUM reg1 reg2`', 'Acá la CPU suma reg2 a reg1 (`reg1 = reg1 + reg2`).', 'No'],
        ['`SUB reg1 reg2`', 'Acá la CPU resta reg2 a reg1 (`reg1 = reg1 - reg2`).', 'No'],
        ['`JNZ reg valor`', 'Acá la CPU salta condicionalmente: si reg es distinto de 0, mueve el `PC` a valor.', 'No'],
        ['`SLEEP ms`', 'Acá la CPU hace una syscall a `KS` y el proceso se bloquea.', 'Sí'],
        ['`STDIN dir tam` / `STDOUT dir tam`', 'Acá la CPU hace una syscall a `KS` para operar con un dispositivo de IO.', 'Sí'],
        ['`MUTEX_CREATE nombre`', 'Acá la CPU hace una syscall a `KS` que crea el mutex simulado si todavía no existe.', 'No (no bloquea)'],
        ['`MUTEX_LOCK nombre`', 'Acá la CPU espera una respuesta síncrona inmediata (por `recv`); si esa respuesta indica que el proceso queda bloqueado, corta el ciclo.', 'Depende de la respuesta'],
        ['`MUTEX_UNLOCK nombre`', 'Acá la CPU también espera una respuesta síncrona, pero esta nunca bloquea al proceso.', 'No'],
        ['`MEM_ALLOC id tam` / `MEM_FREE id`', 'Acá la CPU hace una syscall a `KS` para crear o eliminar un segmento.', 'Sí'],
        ['`INIT_PROC path prioridad`', 'Acá la CPU hace una syscall a `KS` para crear un proceso hijo.', 'Sí'],
        ['`MOV_IN reg` / `MOV_OUT reg`', 'Acá la CPU traduce una dirección lógica (guardada en el registro `SI` o `DI`) a una dirección física, y lee o escribe en el `Memory Stick` correspondiente.', 'Solo si hay {{g:segfault|cuando un proceso intenta acceder a una dirección de memoria que no le corresponde, y el sistema corta la ejecución}}'],
        ['`COPY_MEM tam`', 'Acá la CPU copia tam bytes entre dos direcciones lógicas (de `SI` a `DI`), traduciendo ambas a físicas.', 'Solo si hay segfault'],
        ['`EXIT`', 'Acá la CPU avisa `FIN_PROCESO` a `KS`.', 'Sí (y no guarda contexto)'],
      ],
    },
  ],

  details: [
    {
      type: 'callout',
      tone: 'info',
      title: 'Segmentación, no paginación',
      text: '`traducir_direccion` divide la dirección lógica en `id_segmento = dir_logica / segment_max_size` y `desplazamiento = dir_logica % segment_max_size`. Busca ese id en la `tabla_segmentos` local (caché refrescada en cada `pedir_contexto`, hasta 256 segmentos). Si no existe el segmento o el desplazamiento + tamaño excede el límite, es segfault: se aborta la instrucción sin guardar contexto. Si es válida, `dirección física = base + desplazamiento`. No hay TLB ni caché de traducciones — se recalcula siempre.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Varios Memory Sticks, una sola memoria',
      text: 'La memoria física total es la concatenación de los `Memory Sticks` conectados, cada uno con una `base_fisica` creciente. Si un pedido de lectura/escritura cruza el límite entre dos `Memory Sticks` contiguos, se parte automáticamente en varios tramos, uno por stick, hasta cubrir el tamaño pedido — así es como "varios pendrives" se comportan como una única memoria física ante el proceso simulado.',
    },
    {
      type: 'callout',
      tone: 'info',
      title: 'Interrupciones: chequeo entre instrucciones, no dentro',
      text: 'Un hilo aparte, detached, escucha un socket dedicado de interrupciones: al recibir `INTERRUPCION`, solo marca `hay_interrupcion = 1` (variable `volatile`, no atómica). El ciclo principal revisa esta bandera únicamente entre instrucciones completas — no hay preempción a mitad de una instrucción. Si la interrupción llega mientras el proceso ya está bloqueado esperando una syscall, queda pendiente hasta el próximo `EJECUTAR_PROCESO` de ese mismo proceso.',
    },
  ],

  commonErrors: [
    {
      type: 'callout',
      tone: 'warning',
      title: 'Claves del config que no se usan',
      text: '`CPU_ID`, `IP_MEMORYSTICK` y `PUERTO_MEMORYSTICK` figuran en `cpu.config` pero son vestigiales — no se leen. Si preguntan "¿de dónde saca la CPU el ID?" o "¿cómo sabe la IP del Memory Stick?": el ID sale por argumento de línea de comandos, y la IP/puerto de cada `Memory Stick` llega dinámicamente desde `Kernel Memory` en el handshake inicial. No es del archivo de config.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Protocolo inconsistente entre canales',
      text: 'CPU↔`Memory Stick` usa sends/recvs crudos con opcodes propios (`LEER_MEMORIA`/`ESCRIBIR_MEMORIA`), mientras que CPU↔`KS` y CPU↔`KM` usan el protocolo de paquetes genérico de `so-commons`. No es el mismo esquema de comunicación en todos lados — típica pregunta trampa.',
    },
    {
      type: 'callout',
      tone: 'warning',
      title: '`MUTEX_LOCK` y `MUTEX_UNLOCK` son la excepción',
      text: 'Son las únicas syscalls con respuesta síncrona inmediata (un `recv` fuera del ciclo normal de `EJECUTAR_PROCESO`). Todas las demás syscalls simplemente cortan el ciclo (`seguir_ejecutando = false`) y esperan un futuro `EJECUTAR_PROCESO` para continuar. No asumir que el resto también responde al toque.',
    },
  ],

  summary: [
    {
      type: 'ul',
      items: [
        'CPU ejecuta pseudo-instrucciones leídas de `Kernel Memory`; no decide planificación ni administra memoria.',
        'Mantiene tres conexiones (`KS`, canal de interrupciones, `KM`) más una conexión directa por cada `Memory Stick`.',
        'El ciclo fetch-decode-execute corta apenas una instrucción implica una decisión externa (IO, memoria, fin de proceso) o si hay una interrupción pendiente entre instrucciones.',
        'La traducción de direcciones es por segmentación (no paginación), sin TLB, recalculada en cada acceso; un desplazamiento fuera de límite es segfault y no guarda contexto.',
        'Varios `Memory Sticks` se comportan como una sola memoria física gracias al particionado automático de lecturas/escrituras que cruzan el límite entre sticks.',
        '`MUTEX_LOCK`/`MUTEX_UNLOCK` son las únicas syscalls con respuesta síncrona inmediata; el resto corta el ciclo y espera el próximo `EJECUTAR_PROCESO`.',
        '`CPU_ID`, `IP_MEMORYSTICK` y `PUERTO_MEMORYSTICK` son claves muertas en el config: el ID viene por línea de comandos y los datos del `Memory Stick` llegan dinámicamente desde `Kernel Memory`.',
      ],
    },
  ],
}

// Fuente: informes/04-cpu.md
