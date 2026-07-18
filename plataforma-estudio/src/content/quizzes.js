// Banco de quizzes — TRANSCRITO de informes/quizes.md (preguntas, opciones y
// respuesta correcta verbatim, no se inventaron preguntas nuevas). Lo único
// agregado acá son las explicaciones de cada opción (por qué es correcta o
// incorrecta), redactadas en base a lo ya verificado en los informes de
// contenido (content/pages/*.js e informes/*.md) — no se inventó ningún
// dato técnico nuevo para justificarlas.
//
// Cada quiz se identifica con la key usada en `quizId` de content/modules.js.

export const QUIZZES = {
  io: {
    title: 'Quiz — Módulo IO',
    questions: [
      {
        question: '¿Por qué el módulo IO puede implementarse como un proceso monohilo?',
        options: [
          {
            text: 'Porque nunca recibe más de una conexión.',
            correct: false,
            explanation:
              'IO sí mantiene una única conexión persistente con kernel_scheduler, pero esa no es la razón de fondo: aunque tuviera más conexiones, lo que evita el caos es que alguien serialice los pedidos.',
          },
          {
            text: 'Porque el Kernel serializa el acceso al dispositivo y garantiza que sólo una operación llegue a la vez.',
            correct: true,
            explanation:
              'Correcto: toda la coordinación de "varios procesos pidiendo el mismo IO" vive del lado de kernel_scheduler (una cola + mutex + semáforo por dispositivo, t_io_modulo). IO en sí es secuencial porque nunca le llega más de un pedido a la vez.',
          },
          {
            text: 'Porque cada operación crea automáticamente un thread independiente.',
            correct: false,
            explanation:
              'Es lo opuesto a lo que implementa el código: IO no lanza threads por operación, procesa un pedido a la vez en su único loop principal.',
          },
        ],
      },
      {
        question: 'Dos procesos solicitan simultáneamente el mismo dispositivo STDOUT. ¿Qué debería ocurrir?',
        options: [
          {
            text: 'Ambos escriben en paralelo sobre la consola.',
            correct: false,
            explanation:
              'Escribir en paralelo mezclaría la salida de ambos procesos — es justo lo que el sistema evita serializando el acceso al dispositivo.',
          },
          {
            text: 'Uno utiliza el dispositivo mientras el otro permanece bloqueado hasta que el recurso se libere.',
            correct: true,
            explanation:
              'Correcto: kernel_scheduler encola el segundo pedido en la cola del t_io_modulo correspondiente; ese proceso queda BLOCKED hasta que el dispositivo atienda su turno.',
          },
          {
            text: 'Ambos procesos son abortados para evitar condiciones de carrera.',
            correct: false,
            explanation:
              'No hace falta abortar nada — encolar y bloquear es suficiente para evitar la condición de carrera sin perder trabajo de ningún proceso.',
          },
        ],
      },
      {
        question: '¿Por qué IO no necesita conocer el estado (READY, BLOCKED, EXEC, etc.) de los procesos?',
        options: [
          {
            text: 'Porque únicamente ejecuta operaciones sobre un dispositivo; la planificación pertenece al Kernel.',
            correct: true,
            explanation:
              'Correcto: IO es deliberadamente "tonto" — recibe pid + operación + parámetros, la ejecuta, y avisa que terminó. El PCB y sus estados viven enteramente en kernel_scheduler.',
          },
          {
            text: 'Porque esos estados son administrados por la CPU.',
            correct: false,
            explanation:
              'Los estados del proceso (t_estado, en el PCB) los administra kernel_scheduler, no la CPU — la CPU sólo ejecuta instrucciones del proceso que le asignaron.',
          },
          {
            text: 'Porque el estado se almacena dentro del socket.',
            correct: false,
            explanation:
              'Un socket es solo un canal de comunicación; no tiene capacidad de "almacenar" el estado de un proceso.',
          },
        ],
      },
      {
        question:
          'Durante una operación STDIN el usuario escribe más caracteres que los solicitados. ¿Qué comportamiento mantiene la consistencia del sistema?',
        options: [
          {
            text: 'Leer toda la entrada sin restricciones.',
            correct: false,
            explanation:
              'Rompería el protocolo: kernel_scheduler espera exactamente la cantidad de bytes que pidió, ni más ni menos.',
          },
          {
            text: 'Limitar la lectura al tamaño solicitado y enviar únicamente esa cantidad de bytes.',
            correct: true,
            explanation:
              'Correcto: IO corta la entrada leída al tamaño (longitud) pedido antes de mandarla — es lo que garantiza que el kernel reciba exactamente lo que esperaba.',
          },
          {
            text: 'Reservar más memoria automáticamente.',
            correct: false,
            explanation:
              'No existe tal mecanismo, y no tendría sentido: el contrato es que IO respeta el tamaño pedido, no que la memoria del proceso crezca sola.',
          },
        ],
      },
      {
        question:
          '¿Por qué el retardo del dispositivo debe implementarse mediante una llamada bloqueante (como usleep) y no con una espera activa?',
        options: [
          {
            text: 'Porque evita consumir CPU innecesariamente mientras el dispositivo está ocupado.',
            correct: true,
            explanation:
              'Correcto: una espera activa (busy-wait) quemaría CPU real sin hacer nada útil; usleep libera el procesador durante la espera simulada.',
          },
          {
            text: 'Porque hace que el Kernel planifique más rápido.',
            correct: false,
            explanation:
              'El retardo de IO no tiene ninguna relación con la velocidad de planificación del kernel_scheduler.',
          },
          {
            text: 'Porque elimina la necesidad de sincronización.',
            correct: false,
            explanation:
              'Dormir un thread no elimina la necesidad de sincronización en el resto del sistema — son dos problemas distintos.',
          },
        ],
      },
      {
        question: 'Durante una operación STDOUT el Kernel pierde la conexión con IO. ¿Cuál es el comportamiento más consistente?',
        options: [
          {
            text: 'Reintentar indefinidamente.',
            correct: false,
            explanation:
              'IO no implementa reconexión: si recv falla, corta el loop y termina el proceso — no hay lógica de reintento en ningún lado del protocolo.',
          },
          {
            text: 'Finalizar el ciclo de atención y comenzar el apagado controlado del módulo.',
            correct: true,
            explanation:
              'Correcto: cuando falla la lectura del socket, IO loguea el error, corta su bucle principal y termina el proceso — un apagado controlado, sin intentar reconectar.',
          },
          {
            text: 'Crear automáticamente una nueva conexión.',
            correct: false,
            explanation:
              'No existe reconexión automática: sin la conexión con el Kernel, el proceso de IO no tiene sentido por sí solo y simplemente termina.',
          },
        ],
      },
      {
        question: '¿Por qué el Kernel necesita conocer qué tipo de dispositivo acaba de conectarse?',
        options: [
          {
            text: 'Porque debe decidir qué cola de procesos utilizar para las solicitudes dirigidas a ese dispositivo.',
            correct: true,
            explanation:
              'Correcto: kernel_scheduler registra cada IO por nombre (t_io_modulo) para saber a cuál de sus colas/dispositivos dirigir cada pedido futuro.',
          },
          {
            text: 'Porque necesita calcular el tamaño máximo del buffer.',
            correct: false,
            explanation:
              'El tamaño de cada pedido lo define la instrucción del proceso (ej. STDIN dir tam), no el tipo de dispositivo conectado.',
          },
          {
            text: 'Porque cada dispositivo utiliza un algoritmo de planificación distinto.',
            correct: false,
            explanation:
              'El algoritmo de planificación (FIFO/RR/CMN) es una propiedad de la planificación de CPU, no de los dispositivos de IO.',
          },
        ],
      },
      {
        question: 'Si el tamaño solicitado para una operación STDOUT es cero, ¿qué comportamiento resulta más consistente?',
        options: [
          {
            text: 'Intentar imprimir un byte nulo.',
            correct: false,
            explanation:
              'No es lo que hace el código, y no aportaría nada: imprimir un byte nulo no tiene ningún propósito.',
          },
          {
            text: 'Ignorar la operación sin realizar ninguna escritura.',
            correct: true,
            explanation:
              'Correcto: tamaño 0 es un caso normal y esperado (el kernel todavía no tenía los datos listos), así que IO lo ignora sin escribir nada y sin cortar la conexión.',
          },
          {
            text: 'Finalizar el proceso solicitante.',
            correct: false,
            explanation:
              'Sería una reacción desproporcionada frente a un caso transitorio y esperado del protocolo, no un error real.',
          },
        ],
      },
    ],
  },

  cpu: {
    title: 'Quiz — CPU',
    questions: [
      {
        question: '¿Cuál es la principal responsabilidad de la CPU dentro del sistema?',
        options: [
          {
            text: 'Planificar procesos.',
            correct: false,
            explanation: 'Planificar (decidir qué proceso corre y cuándo) es responsabilidad de kernel_scheduler, no de la CPU.',
          },
          {
            text: 'Ejecutar instrucciones utilizando el contexto del proceso recibido.',
            correct: true,
            explanation:
              'Correcto: la CPU hace fetch-decode-execute instrucción por instrucción sobre el proceso que le asignó kernel_scheduler, usando el contexto (registros, PC) que le da kernel_memory.',
          },
          {
            text: 'Administrar la memoria física.',
            correct: false,
            explanation: 'Administrar la memoria física (segmentos, huecos) es responsabilidad de kernel_memory.',
          },
        ],
      },
      {
        question: 'Cuando la CPU recibe un proceso para ejecutar, ¿qué información necesita como mínimo?',
        options: [
          {
            text: 'El PID únicamente.',
            correct: false,
            explanation:
              'El PID es lo primero que recibe (junto con EJECUTAR_PROCESO), pero con eso solo no alcanza para ejecutar: necesita pedir el contexto completo a Kernel Memory antes de poder continuar.',
          },
          {
            text: 'El contexto de ejecución (PC, registros y demás información necesaria para continuar).',
            correct: true,
            explanation:
              'Correcto: apenas recibe el PID, la CPU pide el contexto (PC + registros) a Kernel Memory — sin eso no sabe desde dónde retomar ni qué valores tienen los registros.',
          },
          {
            text: 'El algoritmo de planificación.',
            correct: false,
            explanation: 'La CPU no necesita saber con qué algoritmo fue seleccionado el proceso — eso es un detalle interno de kernel_scheduler.',
          },
        ],
      },
      {
        question: 'Durante la ejecución una instrucción necesita acceder a memoria. ¿Quién determina finalmente si el acceso es válido?',
        options: [
          {
            text: 'La CPU únicamente.',
            correct: false,
            explanation:
              'La CPU evalúa el acceso contra una tabla de segmentos, pero es solo una copia local en caché que le entrega Kernel Memory en cada pedido de contexto — no es la fuente de verdad.',
          },
          {
            text: 'El módulo Memoria.',
            correct: true,
            explanation:
              'Correcto: Kernel Memory es quien crea y administra los segmentos (base, límite) de cada proceso; la CPU solo aplica esa información para traducir la dirección y detectar un segfault.',
          },
          {
            text: 'El módulo IO.',
            correct: false,
            explanation: 'IO no tiene ninguna relación con el acceso a memoria de un proceso.',
          },
        ],
      },
      {
        question: 'El quantum vence mientras el proceso está ejecutando instrucciones. ¿Qué debe ocurrir?',
        options: [
          {
            text: 'La CPU continúa hasta terminar el programa.',
            correct: false,
            explanation: 'Ignorar el vencimiento del quantum anularía por completo el sentido de Round Robin.',
          },
          {
            text: 'La CPU devuelve el contexto actualizado al Kernel indicando el motivo del desalojo.',
            correct: true,
            explanation:
              'Correcto: la CPU chequea la interrupción entre instrucciones, corta su ciclo, guarda el contexto actualizado y avisa a kernel_scheduler con el motivo (fin de quantum).',
          },
          {
            text: 'El proceso vuelve automáticamente a READY.',
            correct: false,
            explanation:
              'Ese paso lo ejecuta kernel_scheduler al recibir el aviso de la CPU — la CPU no decide ni mueve al proceso de estado por su cuenta.',
          },
        ],
      },
      {
        question: '¿Qué consecuencia tendría ignorar una interrupción por fin de quantum?',
        options: [
          {
            text: 'Round Robin se comportaría como FIFO.',
            correct: true,
            explanation:
              'Correcto: si nunca se desaloja por tiempo, cada proceso correría hasta bloquearse o terminar por su cuenta — exactamente el comportamiento de FIFO, no de Round Robin.',
          },
          {
            text: 'Todos los procesos finalizarían inmediatamente.',
            correct: false,
            explanation: 'No hay ninguna relación entre ignorar una interrupción de quantum y finalizar procesos.',
          },
          {
            text: 'La memoria comenzaría una compactación.',
            correct: false,
            explanation: 'La compactación la dispara la falta de espacio contiguo en memoria, no el vencimiento de un quantum.',
          },
        ],
      },
      {
        question: 'Si la CPU intenta acceder fuera del espacio asignado al proceso, ¿qué debe suceder?',
        options: [
          {
            text: 'Ignorar el acceso.',
            correct: false,
            explanation: 'Ignorarlo dejaría al proceso en un estado inconsistente y ocultaría un error real de programa.',
          },
          {
            text: 'Informar el error al Kernel para que actúe según corresponda.',
            correct: true,
            explanation:
              'Correcto: la CPU envía SEG_FAULT a kernel_scheduler (sin guardar contexto) y es el Kernel quien decide qué hacer, típicamente finalizar el proceso.',
          },
          {
            text: 'Reiniciar la CPU.',
            correct: false,
            explanation: 'Sería completamente desproporcionado: un acceso inválido de un proceso no debería afectar al módulo CPU en sí ni a los demás procesos.',
          },
        ],
      },
    ],
  },

  memoria: {
    title: 'Quiz — Memoria',
    questions: [
      {
        question: '¿Cuál es la responsabilidad principal del módulo Memoria?',
        options: [
          {
            text: 'Ejecutar instrucciones.',
            correct: false,
            explanation: 'Ejecutar instrucciones es responsabilidad de la CPU, no de Kernel Memory.',
          },
          {
            text: 'Administrar el espacio de memoria y validar los accesos realizados por los procesos.',
            correct: true,
            explanation:
              'Correcto: Kernel Memory es dueño de los segmentos, los huecos libres, la compactación y de validar que cada acceso caiga dentro del segmento correspondiente.',
          },
          {
            text: 'Planificar procesos.',
            correct: false,
            explanation: 'Planificar procesos es responsabilidad de kernel_scheduler.',
          },
        ],
      },
      {
        question: '¿Qué información debe mantener Memoria para evitar que dos procesos utilicen el mismo espacio físico?',
        options: [
          {
            text: 'Una estructura que relacione proceso, dirección base y tamaño asignado.',
            correct: true,
            explanation:
              'Correcto: es exactamente el segmento (t_segmento: id, base, límite) que Kernel Memory asigna a cada proceso al crear memoria, controlando que los rangos no se superpongan.',
          },
          {
            text: 'El quantum de cada proceso.',
            correct: false,
            explanation: 'El quantum es un concepto de planificación de CPU, no tiene ninguna relación con la protección de memoria física.',
          },
          {
            text: 'La prioridad del proceso.',
            correct: false,
            explanation: 'La prioridad determina el orden de ejecución en el scheduler, no previene solapamiento de memoria física.',
          },
        ],
      },
      {
        question: 'No existe un bloque libre suficientemente grande, pero la suma de los espacios libres alcanza. ¿Qué debería hacer Memoria?',
        options: [
          {
            text: 'Finalizar el proceso.',
            correct: false,
            explanation: 'Finalizar sería prematuro: hay espacio total suficiente, solo está fragmentado — la respuesta correcta es reorganizarlo, no descartar el pedido.',
          },
          {
            text: 'Ejecutar una compactación.',
            correct: true,
            explanation:
              'Correcto: cuando la suma de huecos alcanza pero ninguno individual es suficiente (fragmentación externa), Kernel Memory dispara una compactación para unificarlos.',
          },
          {
            text: 'Solicitar inmediatamente espacio en SWAP.',
            correct: false,
            explanation: 'Suspender a swap es el recurso para cuando NO alcanza la memoria ni compactando — acá sí alcanza, solo falta reordenar.',
          },
        ],
      },
      {
        question: '¿Cuál es el objetivo principal de una compactación?',
        options: [
          {
            text: 'Reducir la cantidad de procesos.',
            correct: false,
            explanation: 'La compactación no elimina ni afecta la cantidad de procesos en el sistema, solo reorganiza su memoria.',
          },
          {
            text: 'Unificar los espacios libres para generar bloques contiguos mayores.',
            correct: true,
            explanation:
              'Correcto: se mueven los segmentos activos hacia el inicio de la memoria, dejando toda la fragmentación externa unificada en un único hueco grande al final.',
          },
          {
            text: 'Liberar la memoria utilizada por el Kernel.',
            correct: false,
            explanation: 'El espacio administrado es para los segmentos de los procesos de usuario, no para el propio proceso Kernel Memory.',
          },
        ],
      },
      {
        question: 'Después de compactar, ¿qué debe garantizarse?',
        options: [
          {
            text: 'Que los datos sigan siendo exactamente los mismos.',
            correct: true,
            explanation:
              'Correcto: compactar mueve físicamente los datos de una posición a otra, pero su contenido debe quedar intacto — solo cambia la ubicación, no el contenido.',
          },
          {
            text: 'Que los PID cambien.',
            correct: false,
            explanation: 'El PID es la identidad del proceso y nunca cambia por una operación de memoria como la compactación.',
          },
          {
            text: 'Que aumente la memoria disponible.',
            correct: false,
            explanation: 'La memoria total libre no aumenta: compactar solo elimina la fragmentación externa, no crea espacio nuevo.',
          },
        ],
      },
      {
        question: 'Si luego de compactar no se actualizan las direcciones físicas, ¿qué problema aparecería?',
        options: [
          {
            text: 'Los procesos accederían a información incorrecta.',
            correct: true,
            explanation:
              'Correcto: si la tabla de segmentos sigue apuntando a la base vieja después de mover los datos, el proceso terminaría leyendo/escribiendo sobre memoria que ya no le corresponde.',
          },
          {
            text: 'Solamente aumentaría el tiempo de ejecución.',
            correct: false,
            explanation: 'El problema real es de corrección (datos incorrectos), no de performance — subestima la gravedad del bug.',
          },
          {
            text: 'No ocurriría nada.',
            correct: false,
            explanation: 'Sí ocurriría un problema grave: las bases físicas cambiaron, así que ignorar la actualización rompe la consistencia de los datos.',
          },
        ],
      },
    ],
  },

  swap: {
    title: 'Quiz — SWAP',
    questions: [
      {
        question: '¿Cuál es el objetivo principal de SWAP?',
        options: [
          {
            text: 'Ejecutar procesos suspendidos.',
            correct: false,
            explanation: 'SWAP no ejecuta nada — es un simulador de almacenamiento en bloques, no un módulo de ejecución.',
          },
          {
            text: 'Almacenar temporalmente la información de procesos que abandonan la memoria principal.',
            correct: true,
            explanation:
              'Correcto: cuando Kernel Memory suspende un proceso, sus segmentos se escriben en bloques de SWAP hasta que haya lugar para desuspenderlo.',
          },
          {
            text: 'Administrar dispositivos IO.',
            correct: false,
            explanation: 'Administrar dispositivos de IO es responsabilidad de kernel_scheduler y del módulo io, no de swap.',
          },
        ],
      },
      {
        question: '¿Qué dato resulta indispensable para identificar correctamente la información almacenada?',
        options: [
          {
            text: 'El PID del proceso.',
            correct: true,
            explanation:
              'Correcto: sin asociar cada bloque guardado al proceso (y segmento) al que pertenece, sería imposible distinguir de quién es cada dato al desuspender.',
          },
          {
            text: 'El quantum restante.',
            correct: false,
            explanation: 'El quantum es un dato de planificación de CPU, irrelevante para identificar contenido almacenado en disco.',
          },
          {
            text: 'El puerto del módulo CPU.',
            correct: false,
            explanation: 'El puerto de la CPU no tiene relación con qué proceso es dueño de qué datos suspendidos.',
          },
        ],
      },
      {
        question: 'Un proceso suspendido vuelve a READY. Antes de ejecutarlo nuevamente, ¿qué debe ocurrir?',
        options: [
          {
            text: 'Recuperar su información desde SWAP hacia memoria principal.',
            correct: true,
            explanation:
              'Correcto: es la desuspensión — Kernel Memory busca un hueco y trae de vuelta los segmentos suspendidos antes de que el proceso pueda volver a ejecutar.',
          },
          {
            text: 'Reiniciar el programa.',
            correct: false,
            explanation: 'El proceso no se reinicia: se restaura exactamente el estado que tenía al momento de suspenderse.',
          },
          {
            text: 'Asignarle un nuevo PID.',
            correct: false,
            explanation: 'El PID es la identidad del proceso y se mantiene igual durante toda la suspensión/desuspensión.',
          },
        ],
      },
      {
        question: '¿Qué ocurriría si SWAP perdiera la relación entre bloques y procesos?',
        options: [
          {
            text: 'Podrían recuperarse datos pertenecientes a otro proceso.',
            correct: true,
            explanation:
              'Correcto: sin esa relación, un proceso podría desuspenderse con bloques que en realidad son de otro — una falla grave de consistencia y aislamiento entre procesos.',
          },
          {
            text: 'Solamente disminuiría el rendimiento.',
            correct: false,
            explanation: 'El problema no es de performance, sino de corrección: se mezclarían datos entre procesos distintos.',
          },
          {
            text: 'No tendría consecuencias.',
            correct: false,
            explanation: 'Sí tendría consecuencias graves — es exactamente el tipo de bug que rompe el aislamiento entre procesos.',
          },
        ],
      },
      {
        question: 'Cuando un proceso finaliza definitivamente, ¿qué debería hacer SWAP?',
        options: [
          {
            text: 'Liberar el espacio asociado al proceso.',
            correct: true,
            explanation:
              'Correcto: los bloques que tenía asignados el proceso vuelven al pool de bloques libres, para que otros procesos puedan usarlos.',
          },
          {
            text: 'Mantener la información para futuras ejecuciones.',
            correct: false,
            explanation: 'Un proceso finalizado no vuelve a ejecutarse con esos mismos datos — no hay ningún mecanismo de reuso entre ejecuciones distintas.',
          },
          {
            text: 'Copiar automáticamente los datos al siguiente proceso.',
            correct: false,
            explanation: 'No existe tal mecanismo, y no tendría sentido: cada proceso tiene su propio espacio aislado.',
          },
        ],
      },
    ],
  },

  'kernel-scheduler': {
    title: 'Quiz — Kernel Scheduler',
    questions: [
      {
        question: '¿Cuál es la principal responsabilidad del Scheduler?',
        options: [
          {
            text: 'Ejecutar instrucciones.',
            correct: false,
            explanation: 'Ejecutar instrucciones es tarea de la CPU, no del Scheduler.',
          },
          {
            text: 'Decidir qué proceso utiliza la CPU y administrar los cambios de estado.',
            correct: true,
            explanation:
              'Correcto: kernel_scheduler mantiene el PCB de cada proceso, decide quién ejecuta según el algoritmo configurado, y administra las transiciones entre NEW/READY/EXEC/BLOCK/SUSP_*/EXIT.',
          },
          {
            text: 'Traducir direcciones lógicas.',
            correct: false,
            explanation: 'Traducir direcciones es tarea de la CPU (usando la tabla de segmentos que provee Kernel Memory), no del Scheduler.',
          },
        ],
      },
      {
        question: 'Un proceso solicita un dispositivo ocupado. ¿Qué debe hacer el Scheduler?',
        options: [
          {
            text: 'Mantenerlo ejecutando.',
            correct: false,
            explanation: 'No tiene sentido: si el proceso necesita el dispositivo para continuar, debe ceder la CPU mientras espera.',
          },
          {
            text: 'Pasarlo a BLOCKED hasta que el recurso esté disponible.',
            correct: true,
            explanation:
              'Correcto: el proceso se encola en el t_io_modulo correspondiente y pasa a BLOCK; vuelve a READY recién cuando el dispositivo confirma que terminó su pedido.',
          },
          {
            text: 'Finalizarlo.',
            correct: false,
            explanation: 'Pedir un dispositivo ocupado no es un error — es una situación normal que se resuelve bloqueando y esperando el turno.',
          },
        ],
      },
      {
        question: '¿Qué necesita Round Robin para poder desalojar procesos?',
        options: [
          {
            text: 'Un mecanismo que controle el tiempo y notifique a la CPU cuando vence el quantum.',
            correct: true,
            explanation:
              'Correcto: kernel_scheduler lanza un hilo temporizador por cada proceso puesto en ejecución con RR, que manda una interrupción a la CPU al vencer el quantum.',
          },
          {
            text: 'Un algoritmo de compactación.',
            correct: false,
            explanation: 'La compactación es un mecanismo de memoria, no tiene relación con el desalojo por tiempo de Round Robin.',
          },
          {
            text: 'Una tabla de memoria.',
            correct: false,
            explanation: 'El desalojo por quantum es puramente temporal — no depende de ninguna tabla de memoria.',
          },
        ],
      },
      {
        question: '¿Qué diferencia existe entre READY y BLOCKED?',
        options: [
          {
            text: 'READY espera CPU; BLOCKED espera un evento externo.',
            correct: true,
            explanation:
              'Correcto: un proceso READY está listo para ejecutar en cuanto le toque turno; uno BLOCKED necesita que ocurra algo externo (ej. que IO termine) antes de poder volver a READY.',
          },
          {
            text: 'READY espera memoria; BLOCKED espera CPU.',
            correct: false,
            explanation: 'Invierte los conceptos: ninguno de los dos estados está definido en términos de esperar memoria.',
          },
          {
            text: 'No existe diferencia.',
            correct: false,
            explanation: 'Son estados claramente distintos del PCB, con transiciones y significados diferentes.',
          },
        ],
      },
      {
        question: '¿Qué busca resolver la Herencia de Prioridades?',
        options: [
          {
            text: 'Reducir la fragmentación.',
            correct: false,
            explanation: 'La fragmentación es un problema de memoria (huecos), no tiene relación con mutex ni prioridades de CPU.',
          },
          {
            text: 'Evitar la inversión de prioridades cuando un proceso de baja prioridad posee un recurso necesario para otro de alta prioridad.',
            correct: true,
            explanation:
              'Correcto: si el dueño de un mutex tiene baja prioridad y alguien de alta prioridad lo necesita, el dueño "hereda" temporalmente la prioridad más alta para no quedar atascado detrás de procesos intermedios.',
          },
          {
            text: 'Reducir el tiempo de acceso a memoria.',
            correct: false,
            explanation: 'La herencia de prioridad es un mecanismo de planificación de CPU sobre mutex de usuario, no afecta el acceso a memoria física.',
          },
        ],
      },
      {
        question: '¿Qué ocurriría si el Scheduler olvidara despertar un proceso cuyo IO ya terminó?',
        options: [
          {
            text: 'Permanecería bloqueado indefinidamente.',
            correct: true,
            explanation:
              'Correcto: sin que el Scheduler lo mueva explícitamente de BLOCK a READY, el proceso no tiene ninguna otra forma de retomar ejecución — queda bloqueado para siempre.',
          },
          {
            text: 'Comenzaría a ejecutarse automáticamente.',
            correct: false,
            explanation: 'No hay ningún mecanismo automático: el cambio de estado lo hace explícitamente el Scheduler al recibir la confirmación de IO.',
          },
          {
            text: 'Cambiaría de prioridad.',
            correct: false,
            explanation: 'Olvidar despertar a un proceso no dispara ningún cambio de prioridad — simplemente lo deja atascado en BLOCK.',
          },
        ],
      },
    ],
  },

  'arquitectura-general': {
    title: 'Quiz — Arquitectura General',
    questions: [
      {
        question: '¿Qué módulo conoce el estado de los procesos?',
        options: [
          {
            text: 'Kernel Scheduler.',
            correct: true,
            explanation: 'Correcto: el PCB (con su t_estado: NEW/READY/EXEC/BLOCK/SUSP_*/EXIT) es una estructura propia de kernel_scheduler.',
          },
          {
            text: 'IO.',
            correct: false,
            explanation: 'IO ejecuta operaciones puntuales sin conocer en qué estado general está el proceso que las pidió.',
          },
          {
            text: 'SWAP.',
            correct: false,
            explanation: 'SWAP solo administra bloques de datos; no tiene ninguna noción de estados de proceso.',
          },
        ],
      },
      {
        question: '¿Qué módulo conoce la ubicación física de los datos?',
        options: [
          {
            text: 'CPU.',
            correct: false,
            explanation: 'La CPU solo tiene una copia en caché de la tabla de segmentos que le manda Kernel Memory — no es la fuente de verdad.',
          },
          {
            text: 'Kernel Memory.',
            correct: true,
            explanation: 'Correcto: Kernel Memory es dueño de los segmentos, los huecos libres y el mapeo a cada Memory Stick — es la autoridad sobre direcciones físicas.',
          },
          {
            text: 'IO.',
            correct: false,
            explanation: 'IO no tiene ninguna relación con la ubicación física de los datos en memoria.',
          },
        ],
      },
      {
        question: '¿Qué módulo ejecuta instrucciones?',
        options: [
          {
            text: 'CPU.',
            correct: true,
            explanation: 'Correcto: la CPU es el único módulo que hace fetch-decode-execute sobre el pseudocódigo de un proceso.',
          },
          {
            text: 'SWAP.',
            correct: false,
            explanation: 'SWAP solo lee/escribe bloques de un archivo — no ejecuta nada.',
          },
          {
            text: 'Memory Stick.',
            correct: false,
            explanation: 'Memory Stick solo almacena bytes en un buffer — tampoco ejecuta instrucciones.',
          },
        ],
      },
      {
        question: '¿Qué módulo almacena información de procesos suspendidos?',
        options: [
          {
            text: 'SWAP.',
            correct: true,
            explanation: 'Correcto: cuando un proceso se suspende, sus segmentos se mueven a bloques de SWAP hasta que se los desuspenda.',
          },
          {
            text: 'CPU.',
            correct: false,
            explanation: 'La CPU no almacena datos persistentes de ningún proceso, y menos de uno suspendido.',
          },
          {
            text: 'Scheduler.',
            correct: false,
            explanation: 'El Scheduler sabe QUE el proceso está suspendido (su estado), pero los datos en sí viven en SWAP, no en el Scheduler.',
          },
        ],
      },
      {
        question: '¿Qué módulo representa el hardware de almacenamiento principal?',
        options: [
          {
            text: 'Memory Stick.',
            correct: true,
            explanation: 'Correcto: Memory Stick simula la memoria física (RAM) del sistema — un buffer plano de bytes, sin lógica de archivos.',
          },
          {
            text: 'Scheduler.',
            correct: false,
            explanation: 'El Scheduler es un módulo de decisión (planificación), no representa hardware de almacenamiento.',
          },
          {
            text: 'CPU.',
            correct: false,
            explanation: 'La CPU ejecuta y accede a la memoria, pero no es ella misma el hardware de almacenamiento.',
          },
        ],
      },
      {
        question:
          'Si un proceso realiza: CPU → STDIN → CPU → EXIT, ¿cuál es la secuencia correcta de estados?',
        options: [
          {
            text: 'EXEC → BLOCKED → READY → EXEC → EXIT',
            correct: true,
            explanation:
              'Correcto: ejecuta (EXEC), pide STDIN y se bloquea (BLOCKED) esperando el dato, cuando IO confirma que terminó vuelve a READY, el Scheduler lo pone otra vez en EXEC, y ahí ejecuta EXIT.',
          },
          {
            text: 'READY → EXEC → EXIT',
            correct: false,
            explanation: 'Omite por completo el bloqueo por STDIN — no refleja que el proceso tuvo que esperar a que el dispositivo termine.',
          },
          {
            text: 'EXEC → READY → BLOCKED → EXIT',
            correct: false,
            explanation: 'El orden está invertido: el proceso se bloquea primero (esperando STDIN) y recién después vuelve a READY, no al revés.',
          },
        ],
      },
      {
        question: 'Si Memoria rechaza un acceso inválido, ¿quién debe decidir qué hacer con el proceso?',
        options: [
          {
            text: 'El Kernel.',
            correct: true,
            explanation: 'Correcto: la CPU reporta el SEG_FAULT a kernel_scheduler, y es el Kernel quien decide la consecuencia (normalmente, finalizar el proceso).',
          },
          {
            text: 'SWAP.',
            correct: false,
            explanation: 'SWAP no tiene ninguna participación en la decisión sobre un acceso inválido a memoria.',
          },
          {
            text: 'IO.',
            correct: false,
            explanation: 'IO no está involucrado en absoluto en un error de acceso a memoria.',
          },
        ],
      },
      {
        question: '¿Cuál de estos módulos nunca debería decidir qué proceso ejecuta la CPU?',
        options: [
          {
            text: 'IO.',
            correct: true,
            explanation:
              'Correcto: IO solo ejecuta operaciones de dispositivo cuando se lo piden — no tiene ni debería tener ninguna lógica de planificación.',
          },
          {
            text: 'Scheduler.',
            correct: false,
            explanation: 'Es exactamente lo opuesto: decidir qué proceso ejecuta la CPU es la razón de ser del Scheduler.',
          },
          {
            text: 'Kernel.',
            correct: false,
            explanation: 'En esta arquitectura, "Kernel" y "Scheduler" son el mismo proceso (kernel_scheduler) — es quien sí debe tomar esa decisión.',
          },
        ],
      },
    ],
  },

  'resumen-proyecto': {
    title: 'Quiz — Escenarios Integradores',
    questions: [
      {
        question:
          'Dos procesos solicitan simultáneamente el mismo dispositivo IO. ¿Qué propiedad del sistema garantiza que no se mezclen las operaciones?',
        options: [
          {
            text: 'Exclusión mutua administrada por el Kernel.',
            correct: true,
            explanation:
              'Correcto: kernel_scheduler encola los pedidos de cada dispositivo (cola + mutex + semáforo por t_io_modulo), garantizando que solo uno se atienda a la vez.',
          },
          {
            text: 'Compactación.',
            correct: false,
            explanation: 'La compactación es un mecanismo de memoria, sin ninguna relación con el acceso concurrente a dispositivos de IO.',
          },
          {
            text: 'SWAP.',
            correct: false,
            explanation: 'SWAP administra bloques en disco para procesos suspendidos — no tiene relación con la exclusión mutua sobre IO.',
          },
        ],
      },
      {
        question: 'Se produce una compactación mientras existen procesos cargados en memoria. ¿Qué debe mantenerse constante?',
        options: [
          {
            text: 'El contenido de los datos.',
            correct: true,
            explanation:
              'Correcto: la compactación mueve los datos de lugar, pero su contenido debe permanecer exactamente igual — solo cambia la dirección física donde viven.',
          },
          {
            text: 'Las direcciones físicas.',
            correct: false,
            explanation: 'Es justo lo contrario: las direcciones físicas son lo que SÍ cambia durante una compactación (por eso hay que actualizar la tabla de segmentos).',
          },
          {
            text: 'Los puertos utilizados.',
            correct: false,
            explanation: 'La compactación es un concepto de memoria; no tiene ninguna relación con los puertos de red de los módulos.',
          },
        ],
      },
      {
        question: 'Un proceso es suspendido por mediano plazo. ¿Qué combinación de acciones es correcta?',
        options: [
          {
            text: 'Liberar memoria principal y conservar los datos en SWAP.',
            correct: true,
            explanation:
              'Correcto: los segmentos activos se mueven a bloques de SWAP y la memoria principal que ocupaban queda libre para otros procesos — el proceso conserva su estado, solo cambia dónde vive.',
          },
          {
            text: 'Reiniciar completamente el proceso.',
            correct: false,
            explanation: 'La suspensión no reinicia nada: el objetivo es justamente preservar el estado del proceso para poder retomarlo después.',
          },
          {
            text: 'Eliminar su PCB.',
            correct: false,
            explanation: 'El PCB se mantiene (el proceso sigue existiendo, solo cambia a estado SUSP_READY/SUSP_BLOCK) — eliminarlo sería lo mismo que finalizarlo, que no es lo que ocurre acá.',
          },
        ],
      },
      {
        question: 'Si la CPU continúa ejecutando un proceso luego de vencer el quantum, ¿qué algoritmo deja de comportarse correctamente?',
        options: [
          {
            text: 'FIFO.',
            correct: false,
            explanation: 'FIFO ni siquiera usa el concepto de quantum para desalojar — no depende de este mecanismo.',
          },
          {
            text: 'Round Robin.',
            correct: true,
            explanation:
              'Correcto: la esencia de Round Robin es repartir la CPU por tiempo; si no se respeta el vencimiento del quantum, deja de comportarse como RR y pasa a comportarse como FIFO.',
          },
          {
            text: 'SJF.',
            correct: false,
            explanation: 'SJF no está implementado en este TP y, conceptualmente, tampoco se basa en el vencimiento de un quantum.',
          },
        ],
      },
      {
        question: '¿Cuál es la principal ventaja de dividir el sistema en módulos independientes comunicados mediante sockets?',
        options: [
          {
            text: 'Cada componente puede evolucionar o reemplazarse sin modificar toda la arquitectura.',
            correct: true,
            explanation:
              'Correcto: al estar separados por un protocolo de red bien definido, se puede cambiar la implementación interna de un módulo (o hasta correrlo en otra máquina) sin tocar a los demás.',
          },
          {
            text: 'Elimina completamente la necesidad de sincronización.',
            correct: false,
            explanation: 'Es lo contrario: dividir en procesos separados agrega la necesidad de protocolos y sincronización explícitos que en un sistema monolítico no harían falta.',
          },
          {
            text: 'Hace innecesario el Kernel.',
            correct: false,
            explanation: 'El Kernel (kernel_scheduler + kernel_memory) sigue siendo el componente central de decisión en esta arquitectura, sockets o no.',
          },
        ],
      },
      {
        question: '¿Qué propiedad se intenta preservar en prácticamente todas las pruebas del TP?',
        options: [
          {
            text: 'La consistencia del sistema aun frente a cambios de estado, compactaciones y operaciones concurrentes.',
            correct: true,
            explanation:
              'Correcto: las pruebas de la cátedra (planificación, memoria, suspensión, herencia de prioridades) apuntan a verificar que el sistema se mantenga consistente bajo distintos escenarios concurrentes.',
          },
          {
            text: 'Que todos los procesos terminen exactamente al mismo tiempo.',
            correct: false,
            explanation: 'No es un objetivo del sistema ni tiene sentido como propiedad a garantizar — los procesos terminan en momentos distintos según su ejecución.',
          },
          {
            text: 'Que nunca exista un proceso bloqueado.',
            correct: false,
            explanation: 'BLOCK es un estado normal y esperado (por ejemplo, mientras se espera IO) — no es algo que el sistema busque evitar.',
          },
        ],
      },
    ],
  },
}
