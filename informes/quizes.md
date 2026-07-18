# 🧠 Banco de Quizes Mejorado – TP "Plug & Pray"

> **Objetivo:** Evaluar comprensión de la arquitectura, sincronización, planificación y consistencia del sistema, priorizando el razonamiento por sobre la memorización.

---

# 📱 Quiz 1 – Módulo IO

## 1. ¿Por qué el módulo IO puede implementarse como un proceso monohilo?

A) Porque nunca recibe más de una conexión.

B) Porque el Kernel serializa el acceso al dispositivo y garantiza que sólo una operación llegue a la vez.

C) Porque cada operación crea automáticamente un thread independiente.

---

## 2. Dos procesos solicitan simultáneamente el mismo dispositivo STDOUT. ¿Qué debería ocurrir?

A) Ambos escriben en paralelo sobre la consola.

B) Uno utiliza el dispositivo mientras el otro permanece bloqueado hasta que el recurso se libere.

C) Ambos procesos son abortados para evitar condiciones de carrera.

---

## 3. ¿Por qué IO no necesita conocer el estado (READY, BLOCKED, EXEC, etc.) de los procesos?

A) Porque únicamente ejecuta operaciones sobre un dispositivo; la planificación pertenece al Kernel.

B) Porque esos estados son administrados por la CPU.

C) Porque el estado se almacena dentro del socket.

---

## 4. Durante una operación STDIN el usuario escribe más caracteres que los solicitados. ¿Qué comportamiento mantiene la consistencia del sistema?

A) Leer toda la entrada sin restricciones.

B) Limitar la lectura al tamaño solicitado y enviar únicamente esa cantidad de bytes.

C) Reservar más memoria automáticamente.

---

## 5. ¿Por qué el retardo del dispositivo debe implementarse mediante una llamada bloqueante (como `usleep`) y no con una espera activa?

A) Porque evita consumir CPU innecesariamente mientras el dispositivo está ocupado.

B) Porque hace que el Kernel planifique más rápido.

C) Porque elimina la necesidad de sincronización.

---

## 6. Durante una operación STDOUT el Kernel pierde la conexión con IO. ¿Cuál es el comportamiento más consistente?

A) Reintentar indefinidamente.

B) Finalizar el ciclo de atención y comenzar el apagado controlado del módulo.

C) Crear automáticamente una nueva conexión.

---

## 7. ¿Por qué el Kernel necesita conocer qué tipo de dispositivo acaba de conectarse?

A) Porque debe decidir qué cola de procesos utilizar para las solicitudes dirigidas a ese dispositivo.

B) Porque necesita calcular el tamaño máximo del buffer.

C) Porque cada dispositivo utiliza un algoritmo de planificación distinto.

---

## 8. Si el tamaño solicitado para una operación STDOUT es cero, ¿qué comportamiento resulta más consistente?

A) Intentar imprimir un byte nulo.

B) Ignorar la operación sin realizar ninguna escritura.

C) Finalizar el proceso solicitante.

---

## Respuestas

1-B • 2-B • 3-A • 4-B • 5-A • 6-B • 7-A • 8-B

---

# ⚡ Quiz 2 – CPU

## 1. ¿Cuál es la principal responsabilidad de la CPU dentro del sistema?

A) Planificar procesos.

B) Ejecutar instrucciones utilizando el contexto del proceso recibido.

C) Administrar la memoria física.

---

## 2. Cuando la CPU recibe un proceso para ejecutar, ¿qué información necesita como mínimo?

A) El PID únicamente.

B) El contexto de ejecución (PC, registros y demás información necesaria para continuar).

C) El algoritmo de planificación.

---

## 3. Durante la ejecución una instrucción necesita acceder a memoria. ¿Quién determina finalmente si el acceso es válido?

A) La CPU únicamente.

B) El módulo Memoria.

C) El módulo IO.

---

## 4. El quantum vence mientras el proceso está ejecutando instrucciones. ¿Qué debe ocurrir?

A) La CPU continúa hasta terminar el programa.

B) La CPU devuelve el contexto actualizado al Kernel indicando el motivo del desalojo.

C) El proceso vuelve automáticamente a READY.

---

## 5. ¿Qué consecuencia tendría ignorar una interrupción por fin de quantum?

A) Round Robin se comportaría como FIFO.

B) Todos los procesos finalizarían inmediatamente.

C) La memoria comenzaría una compactación.

---

## 6. Si la CPU intenta acceder fuera del espacio asignado al proceso, ¿qué debe suceder?

A) Ignorar el acceso.

B) Informar el error al Kernel para que actúe según corresponda.

C) Reiniciar la CPU.

---

## Respuestas

1-B • 2-B • 3-B • 4-B • 5-A • 6-B

---

# 💾 Quiz 3 – Memoria

## 1. ¿Cuál es la responsabilidad principal del módulo Memoria?

A) Ejecutar instrucciones.

B) Administrar el espacio de memoria y validar los accesos realizados por los procesos.

C) Planificar procesos.

---

## 2. ¿Qué información debe mantener Memoria para evitar que dos procesos utilicen el mismo espacio físico?

A) Una estructura que relacione proceso, dirección base y tamaño asignado.

B) El quantum de cada proceso.

C) La prioridad del proceso.

---

## 3. No existe un bloque libre suficientemente grande, pero la suma de los espacios libres alcanza. ¿Qué debería hacer Memoria?

A) Finalizar el proceso.

B) Ejecutar una compactación.

C) Solicitar inmediatamente espacio en SWAP.

---

## 4. ¿Cuál es el objetivo principal de una compactación?

A) Reducir la cantidad de procesos.

B) Unificar los espacios libres para generar bloques contiguos mayores.

C) Liberar la memoria utilizada por el Kernel.

---

## 5. Después de compactar, ¿qué debe garantizarse?

A) Que los datos sigan siendo exactamente los mismos.

B) Que los PID cambien.

C) Que aumente la memoria disponible.

---

## 6. Si luego de compactar no se actualizan las direcciones físicas, ¿qué problema aparecería?

A) Los procesos accederían a información incorrecta.

B) Solamente aumentaría el tiempo de ejecución.

C) No ocurriría nada.

---

## Respuestas

1-B • 2-A • 3-B • 4-B • 5-A • 6-A

---

# 🗄️ Quiz 4 – SWAP

## 1. ¿Cuál es el objetivo principal de SWAP?

A) Ejecutar procesos suspendidos.

B) Almacenar temporalmente la información de procesos que abandonan la memoria principal.

C) Administrar dispositivos IO.

---

## 2. ¿Qué dato resulta indispensable para identificar correctamente la información almacenada?

A) El PID del proceso.

B) El quantum restante.

C) El puerto del módulo CPU.

---

## 3. Un proceso suspendido vuelve a READY. Antes de ejecutarlo nuevamente, ¿qué debe ocurrir?

A) Recuperar su información desde SWAP hacia memoria principal.

B) Reiniciar el programa.

C) Asignarle un nuevo PID.

---

## 4. ¿Qué ocurriría si SWAP perdiera la relación entre bloques y procesos?

A) Podrían recuperarse datos pertenecientes a otro proceso.

B) Solamente disminuiría el rendimiento.

C) No tendría consecuencias.

---

## 5. Cuando un proceso finaliza definitivamente, ¿qué debería hacer SWAP?

A) Liberar el espacio asociado al proceso.

B) Mantener la información para futuras ejecuciones.

C) Copiar automáticamente los datos al siguiente proceso.

---

## Respuestas

1-B • 2-A • 3-A • 4-A • 5-A

---

# 🧠 Quiz 5 – Kernel Scheduler

## 1. ¿Cuál es la principal responsabilidad del Scheduler?

A) Ejecutar instrucciones.

B) Decidir qué proceso utiliza la CPU y administrar los cambios de estado.

C) Traducir direcciones lógicas.

---

## 2. Un proceso solicita un dispositivo ocupado. ¿Qué debe hacer el Scheduler?

A) Mantenerlo ejecutando.

B) Pasarlo a BLOCKED hasta que el recurso esté disponible.

C) Finalizarlo.

---

## 3. ¿Qué necesita Round Robin para poder desalojar procesos?

A) Un mecanismo que controle el tiempo y notifique a la CPU cuando vence el quantum.

B) Un algoritmo de compactación.

C) Una tabla de memoria.

---

## 4. ¿Qué diferencia existe entre READY y BLOCKED?

A) READY espera CPU; BLOCKED espera un evento externo.

B) READY espera memoria; BLOCKED espera CPU.

C) No existe diferencia.

---

## 5. ¿Qué busca resolver la Herencia de Prioridades?

A) Reducir la fragmentación.

B) Evitar la inversión de prioridades cuando un proceso de baja prioridad posee un recurso necesario para otro de alta prioridad.

C) Reducir el tiempo de acceso a memoria.

---

## 6. ¿Qué ocurriría si el Scheduler olvidara despertar un proceso cuyo IO ya terminó?

A) Permanecería bloqueado indefinidamente.

B) Comenzaría a ejecutarse automáticamente.

C) Cambiaría de prioridad.

---

## Respuestas

1-B • 2-B • 3-A • 4-A • 5-B • 6-A

---

# 🔌 Quiz 6 – Arquitectura General

## 1. ¿Qué módulo conoce el estado de los procesos?

A) Kernel Scheduler.

B) IO.

C) SWAP.

---

## 2. ¿Qué módulo conoce la ubicación física de los datos?

A) CPU.

B) Kernel Memory.

C) IO.

---

## 3. ¿Qué módulo ejecuta instrucciones?

A) CPU.

B) SWAP.

C) Memory Stick.

---

## 4. ¿Qué módulo almacena información de procesos suspendidos?

A) SWAP.

B) CPU.

C) Scheduler.

---

## 5. ¿Qué módulo representa el hardware de almacenamiento principal?

A) Memory Stick.

B) Scheduler.

C) CPU.

---

## 6. Si un proceso realiza:

```text
CPU
↓
STDIN
↓
CPU
↓
EXIT
```

¿Cuál es la secuencia correcta de estados?

A) EXEC → BLOCKED → READY → EXEC → EXIT

B) READY → EXEC → EXIT

C) EXEC → READY → BLOCKED → EXIT

---

## 7. Si Memoria rechaza un acceso inválido, ¿quién debe decidir qué hacer con el proceso?

A) El Kernel.

B) SWAP.

C) IO.

---

## 8. ¿Cuál de estos módulos nunca debería decidir qué proceso ejecuta la CPU?

A) IO.

B) Scheduler.

C) Kernel.

---

## Respuestas

1-A • 2-B • 3-A • 4-A • 5-A • 6-A • 7-A • 8-A

---

# 🎯 Quiz 7 – Escenarios Integradores

## 1. Dos procesos solicitan simultáneamente el mismo dispositivo IO. ¿Qué propiedad del sistema garantiza que no se mezclen las operaciones?

A) Exclusión mutua administrada por el Kernel.

B) Compactación.

C) SWAP.

---

## 2. Se produce una compactación mientras existen procesos cargados en memoria. ¿Qué debe mantenerse constante?

A) El contenido de los datos.

B) Las direcciones físicas.

C) Los puertos utilizados.

---

## 3. Un proceso es suspendido por mediano plazo. ¿Qué combinación de acciones es correcta?

A) Liberar memoria principal y conservar los datos en SWAP.

B) Reiniciar completamente el proceso.

C) Eliminar su PCB.

---

## 4. Si la CPU continúa ejecutando un proceso luego de vencer el quantum, ¿qué algoritmo deja de comportarse correctamente?

A) FIFO.

B) Round Robin.

C) SJF.

---

## 5. ¿Cuál es la principal ventaja de dividir el sistema en módulos independientes comunicados mediante sockets?

A) Cada componente puede evolucionar o reemplazarse sin modificar toda la arquitectura.

B) Elimina completamente la necesidad de sincronización.

C) Hace innecesario el Kernel.

---

## 6. ¿Qué propiedad se intenta preservar en prácticamente todas las pruebas del TP?

A) La consistencia del sistema aun frente a cambios de estado, compactaciones y operaciones concurrentes.

B) Que todos los procesos terminen exactamente al mismo tiempo.

C) Que nunca exista un proceso bloqueado.

---

## Respuestas

1-A • 2-A • 3-A • 4-B • 5-A • 6-A

