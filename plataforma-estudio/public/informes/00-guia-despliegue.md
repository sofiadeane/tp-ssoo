

**GUÍA DE PRUEBAS DE SISTEMAS OPERATIVOS**

Procedimientos de Ejecución, Parámetros y Configuración de Módulos  
Grupo R2D2 \- 1C 2026

*Entorno de Pruebas: VM UTNSO*  
*Documento de Referencia Técnica*

**Setup**

\> Abrir Oracle

\> Crear nueva VM

GENERAL  
| OS: Linux   
| Dist: Ubuntu

HW  
| Darle ram

SW  
| Instalar el Server.vmi como virtual disk

SETTINGS \> NETWORK  
| Attached to: Bridged Adapter  
| General \> Advanced \> Shared Clipboard: Bidireccional

\-\> START

 View \> Virtual Screen \> Subirle la scale para q tipo, se lea

\> escribir {utnso \+ Enter} dos veces

**\> Ir al repo:** [https://github.com/sisoputnfrba/tp-2026-1c-R2D2](https://github.com/sisoputnfrba/tp-2026-1c-R2D2)

\>  
 ![][image1]

\> Desde la VM:  
| correr `ip a`  
| buscar ip `siempre empieza con 192.168`  
| correr `ssh utnso@192.168.XXX.YYY`  
| confirmar tipiando `yes`  
| escribir la contraseña: utnso

**CLONAR EL REPO \+ LAS COMMONS:**  
git clone [https://github.com/sisoputnfrba/so-deploy.git](https://github.com/sisoputnfrba/so-deploy.git)

cd so-deploy

./deploy.sh \-r=release \-p=utils \-p=kernel\_scheduler \-p=kernel\_memory \-p=cpu \-p=memory\_stick \-p=swap \-p=io "tp-2026-1c-R2D2"

cd \~/so-deploy/tp-2026-1c-R2D2 && git submodule update \--init \--recursive

**Te tiene q pedir:**   
1\. Contra de utnso  
2\. User: sdeane  
3\. Password: \[REDACTADO — Personal Access Token de GitHub. Se sacó de este archivo por seguridad; si lo necesitás, generá uno nuevo desde tu cuenta de GitHub y rotá/revocá el viejo.\]

**1\. Prueba Base**

| Consola | Módulo | Comando de Ejecución |
| :---- | :---- | :---- |
| TERMINAL 1 | kernel\_memory | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_memory && ./bin/kernel\_memory kernel\_memory.config |
| TERMINAL 2 (P1) | kernel\_scheduler | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_scheduler && ./bin/kernel\_scheduler scheduler.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/PLANI\_PRE\_0.prc |
| TERMINAL 3 | memory\_stick | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick && ./bin/memory\_stick memory\_stick.config 256 |
| TERMINAL 4 | swap | cd \~/so-deploy/tp-2026-1c-R2D2/swap && ./bin/swap swap.config |
| TERMINAL 5 (P1) | io | cd \~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config SLEEP |
| TERMINAL 6 | cpu | cd \~/so-deploy/tp-2026-1c-R2D2/cpu && ./bin/cpu cpu.config 0 |

**⚡ REINICIO INTERMEDIO:** *Reiniciar todos los módulos del sistema antes de proceder con la Parte 2\.*

| Consola | Módulo | Comando de Ejecución |
| :---- | :---- | :---- |
| TERMINAL 2 (P2) | kernel\_scheduler | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_scheduler && ./bin/kernel\_scheduler scheduler.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/MEMORIA\_PRE\_0.prc |
| TERMINAL 5 (P1 \+ P2) se necesitan ambas  | io | cd \~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config STDIN\_STDOUT |

**2\. Prueba Planificación Corto Plazo (PCP) → loop**

| Consola | Módulo | Comando de Ejecución |
| :---- | :---- | :---- |
| TERMINAL 1 | kernel\_memory | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_memory && ./bin/kernel\_memory kernel\_memory2.config |
| TERMINAL 6 | kernel\_scheduler | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_scheduler && ./bin/kernel\_scheduler scheduler2.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/PCP.prc |
| TERMINAL 2 | memory\_stick | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick && ./bin/memory\_stick memory\_stick.config 256 |
| TERMINAL 3 | swap | cd \~/so-deploy/tp-2026-1c-R2D2/swap && ./bin/swap swap.config |
| TERMINAL 4 | io | cd \~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config SLEEP |
| TERMINAL 5 | cpu | cd \~/so-deploy/tp-2026-1c-R2D2/cpu && ./bin/cpu cpu.config 0 |

**3\. Prueba Memoria**

| Consola | Módulo | Comando de Ejecución |
| :---- | :---- | :---- |
| TERMINAL 1 | kernel\_memory | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_memory && ./bin/kernel\_memory kernel\_memory\_3\_best.config Para segunda vuelta: cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_memory && ./bin/kernel\_memory kernel\_memory\_3\_worse.config |
| TERMINAL 9 | kernel\_scheduler | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_scheduler && ./bin/kernel\_scheduler scheduler3.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/PLANI\_MEM.prc |
| TERMINAL 2 | ms1 | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick/ms1 && ../bin/memory\_stick memory\_stick.config 16 |
| TERMINAL 3 | ms2 | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick/ms2 && ../bin/memory\_stick memory\_stick.config 32 |
| TERMINAL 4 | ms3 | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick/ms3 && ../bin/memory\_stick memory\_stick.config 64 |
| TERMINAL 5 | ms4 | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick/ms4 && ../bin/memory\_stick memory\_stick.config 128 |
| TERMINAL 6 | swap | cd \~/so-deploy/tp-2026-1c-R2D2/swap && ./bin/swap swap.config |
| TERMINAL 7 | io | cd \~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config SLEEP |
| TERMINAL 8 | cpu | cd \~/so-deploy/tp-2026-1c-R2D2/cpu && ./bin/cpu cpu.config 0 |

**🔄 SEGUNDA CORRIDA:** *Reiniciar todos los procesos cambiando la variable ALLOCATION\_STRATEGY=WORST en kernel\_memory.config.*

cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_memory && ./bin/kernel\_memory kernel\_memory\_3\_worse.config

cd .. && cd memory\_stick\_2 && ./bin/memory\_stick && ./bin/memory\_stick

**4\. Prueba Planificación Mediano Plazo (PMP)**

| Consola | Módulo | Comando de Ejecución |
| :---- | ----- | :---- |
| TERMINAL 1 | kernel\_memory | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_memory && ./bin/kernel\_memory kernel\_memory4.config  |
| TERMINAL 2 | kernel\_scheduler | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_scheduler && ./bin/kernel\_scheduler scheduler4.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/PMP.prc |
| TERMINAL 3 | ms1 | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick/ms1 && ../bin/memory\_stick memory\_stick.config 16 |
| TERMINAL 4 | ms2 | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick/ms2 && ../bin/memory\_stick memory\_stick.config 16 |
| TERMINAL 5 | ms3 | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick/ms3 && ../bin/memory\_stick memory\_stick.config 32 |
| TERMINAL 6 | ms4 | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick/ms4 && ../bin/memory\_stick memory\_stick.config 64 |
| TERMINAL 7 | swap | cd \~/so-deploy/tp-2026-1c-R2D2/swap && ./bin/swap swap.config |
| TERMINAL 8 | io — SLEEP | cd \~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config SLEEP |
| TERMINAL 9 | io — STDIN | cd \~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config STDIN |
| TERMINAL 10 | io — STDOUT | cd \~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config STDOUT |
| TERMINAL 11 | cpu | cd \~/so-deploy/tp-2026-1c-R2D2/cpu && ./bin/cpu cpu.config 0 |

**5\. Prueba Herencia de Prioridades (PHP)**

| Consola | Módulo | Comando de Ejecución |
| :---- | :---- | :---- |
| TERMINAL 1 | kernel\_memory | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_memory && ./bin/kernel\_memory kernel\_memory5.config |
| TERMINAL 7 | kernel\_scheduler | cd \~/so-deploy/tp-2026-1c-R2D2/kernel\_scheduler && ./bin/kernel\_scheduler scheduler5.config /home/utnso/so-deploy/tp-2026-1c-R2D2/plug-n-pray-pruebas/PHP.prc |
| TERMINAL 2 | ms1 | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick/ms1 && ../bin/memory\_stick memory\_stick.config 16 |
| TERMINAL 3 | ms2 | cd \~/so-deploy/tp-2026-1c-R2D2/memory\_stick/ms2 && ../bin/memory\_stick memory\_stick.config 16 |
| TERMINAL 4 | swap | cd \~/so-deploy/tp-2026-1c-R2D2/swap && ./bin/swap swap.config |
| TERMINAL 5 | io | cd \~/so-deploy/tp-2026-1c-R2D2/io && ./bin/io io.config SLEEP |
| TERMINAL 6 | cpu | cd \~/so-deploy/tp-2026-1c-R2D2/cpu && ./bin/cpu cpu.config 0 |

**6\. Prueba Estabilidad General**

| DINÁMICA DE EVALUACIÓN:Las especificaciones, configuraciones de entorno e instrucciones precisas de ejecución de esta etapa serán provistas directamente por el ayudante evaluador de manera presencial durante el transcurso del examen final del Trabajo Práctico. |
| :---- |

[image1]: <data:image/png;base64,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>