# DECISIONS.md

Registro de decisiones de arquitectura para la plataforma de estudio "Plug & Pray". El objetivo de
este documento es que **cualquier IA o persona que retome el proyecto entienda por qué está armado
así sin tener que releer todo el código primero**. Si vas a cambiar algo de lo listado acá, actualizá
la entrada correspondiente en el mismo commit.

Formato de cada entrada: **Decisión** → Motivo → Alternativas consideradas → Costo → Cómo revertirla.

---

## Stack: React + Vite (JS plano, sin TypeScript)

**Decisión:** React 18 + Vite 5, JavaScript con JSX (`.jsx`), sin TypeScript.

**Motivo:** el prompt original pide priorizar simplicidad, bajo consumo de tokens en futuras
iteraciones, y que otra IA pueda continuar fácil. Vite da un dev server instantáneo y un build de
un solo comando, sin configuración de webpack. React es el framework con más ejemplos/documentación
del mercado, lo que reduce el "costo cognitivo" de cualquier IA que retome esto. TypeScript agrega
value en proyectos grandes con muchos colaboradores, pero acá cada archivo de contenido es un objeto
de datos plano — los tipos no aportan tanta seguridad extra como para justificar el overhead de
anotaciones en cada `content/pages/*.js`.

**Alternativas consideradas:**
- **Next.js**: trae SSR/SSG, rutas basadas en archivos, pero es mucho más pesado de lo que este sitio
  100% estático necesita, y su modelo de export estático agrega fricción para GitHub Pages.
- **Astro**: excelente para sitios de contenido, pero suma un ecosistema nuevo (islands, `.astro`
  files) que una IA futura tendría que aprender aparte; React solo ya alcanza.
- **HTML/CSS/JS vanilla**: más liviano aún, pero reimplementar routing + estado de quiz + sidebar
  responsive a mano hubiera significado más código propio para mantener, no menos.
- **TypeScript**: descartado por el overhead de tipado en archivos de contenido que son, en esencia,
  datos — no lógica compleja que se beneficie de chequeo de tipos.

**Costo:** ninguno relevante para un sitio de este tamaño (13 páginas).

**Cómo revertirla:** migrar a TypeScript es incremental (Vite lo soporta con solo cambiar extensión
+ agregar `tsconfig.json`) si en el futuro el contenido crece mucho y se vuelve valioso tipar los
bloques de `ContentBlock`.

---

## Sin backend, sin build-time markdown parsing: contenido como datos JS

**Decisión:** cada página de módulo es un archivo `content/pages/{id}.js` que exporta un objeto plano
con 7 arrays de "bloques" (`intro`, `concepts`, `howItWorks`, `stepByStep`, `details`, `commonErrors`,
`summary`), no un archivo Markdown parseado en build time.

**Motivo:** el prompt pide explícitamente que el contenido se **reinterprete pedagógicamente**, no que
se renderice el `.md` original tal cual (eso ya lo cubre el botón de descarga). Como el contenido no
es 1:1 con el markdown fuente, no tiene sentido meter un parser de Markdown (`remark`/`marked`) en el
medio — solo agregaría una dependencia y una capa de indirección para terminar escribiendo JSX de
todos modos. Los bloques son datos, no JSX, para que una IA futura pueda editar contenido sin tocar
componentes ni saber React.

**Alternativas consideradas:**
- **MDX** (Markdown + JSX): permite mezclar prosa con componentes, pero requiere plugin de Vite,
  y complica el pipeline para un beneficio marginal dado que el contenido ya está estructurado en
  bloques discretos, no en prosa larga.
- **CMS headless** (Contentful, etc.): totalmente fuera de escala para un MVP sin backend — y el
  prompt prohíbe explícitamente cualquier dependencia de servicios externos.

**Costo:** cada bloque de contenido nuevo requiere conocer el esquema de `ContentBlock.jsx` (6 tipos:
`p`, `ul`, `ol`, `code`, `callout`, `table`). Documentado en el propio archivo y en cada
`content/pages/*.js` de ejemplo.

**Cómo revertirla:** si en algún momento se prefiere escribir contenido en Markdown puro, se puede
agregar `react-markdown` y cambiar `ModulePage.jsx` para que en vez de mapear bloques, renderice un
string de markdown por sección — el resto de la arquitectura (registro de módulos, quizzes, sidebar)
no se ve afectado.

---

## Un único componente genérico `ModulePage` + `ContentBlock`, en vez de una página por módulo

**Decisión:** las 12 páginas de contenido comparten el mismo componente de layout (`ModulePage.jsx`)
y el mismo renderer de bloques (`ContentBlock.jsx`). Lo único que cambia por módulo es el dato en
`content/pages/*.js` y la entrada en `content/modules.js`.

**Motivo:** agregar un módulo nuevo (ej. si mañana la cátedra agrega un 7mo proceso) implica **crear
un archivo de datos + una línea de registro**, cero componentes nuevos, cero rutas nuevas que
programar a mano. Esto es lo que más baja el costo de "que otra IA pueda continuar fácil".

**Alternativas consideradas:** un componente `.jsx` por módulo (como en muchos boilerplates de
blogs). Se descartó porque hubiera significado 12 archivos con la misma estructura JSX repetida 12
veces — cualquier cambio de diseño (ej. mover el botón de descarga) habría requerido tocar los 12.

**Costo:** el esquema de bloques es más rígido que JSX libre — si un módulo necesita un layout muy
distinto (ej. un diagrama interactivo), no entra en el esquema actual sin extender `ContentBlock`.

**Cómo revertirla:** un módulo puntual puede "escapar" del esquema genérico agregando una ruta
especial en `App.jsx` que apunte a un componente propio, sin afectar al resto.

---

## Registro central `content/modules.js` como única fuente de verdad de navegación

**Decisión:** un solo archivo define, para cada módulo: id, título, ícono, archivo `.md` descargable,
y quiz asociado (o nota de quiz relacionado). Sidebar, rutas y Home se generan iterando ese array —
ninguno de esos componentes tiene una lista de módulos hardcodeada por su cuenta.

**Motivo:** evita que agregar/renombrar un módulo requiera tocar 4 archivos distintos y que se
desincronicen entre sí.

**Costo:** ninguno.

**Cómo revertirla:** no aplica, es el patrón recomendado para este tipo de sitio.

---

## Fusión de "Mapa General" y "Arquitectura" en un solo item de sidebar

**Decisión:** el sidebar pedido originalmente tenía "Mapa General" y "Arquitectura" como dos items
separados. Solo existe un informe fuente (`01-mapa-rapido.md`) que cubre ese contenido — no hay un
informe distinto de "Arquitectura". Se fusionaron en un único item **"Mapa General"** que cubre
arquitectura + flujo end-to-end.

**Motivo:** el proyecto tiene una regla dura de "nunca inventar contenido técnico". Crear una página
"Arquitectura" separada hubiera significado duplicar el mismo contenido bajo dos nombres, o inventar
contenido nuevo para diferenciarla — ambas opciones violan esa regla. **Esta decisión fue confirmada
explícitamente por la usuaria** antes de implementarla (no es una suposición unilateral).

**Alternativas consideradas:** dejar dos items de sidebar apuntando a la misma página (redundante
para el usuario) — descartada por la usuaria en la misma consulta.

**Costo:** el sidebar tiene un item menos que la lista original del prompt.

**Cómo revertirla:** si en el futuro aparece un informe de "Arquitectura" distinto y más profundo,
alcanza con agregar una entrada nueva en `content/modules.js` + su archivo en `content/pages/`.

---

## Páginas sin quiz propio: nota + link al quiz relacionado

**Decisión:** `informes/quizes.md` solo trae banco de preguntas para 6 temas + un quiz integrador
("Escenarios Integradores"). Comunicación, Sincronización, Memory Stick y Otras Estructuras no
tienen banco propio. En vez de inventar preguntas nuevas (prohibido explícitamente) o dejar la
sección Quiz vacía sin explicación, esas páginas muestran un callout: *"no hay quiz específico para
este tema, pero podés repasar con el de X"*, con link directo a un quiz relacionado por contenido.
Esta asignación de "quiz relacionado" (ej. Sincronización → quiz de Kernel Scheduler, por la pregunta
de Herencia de Prioridades) es una decisión editorial de esta implementación, confirmada con la
usuaria antes de escribir el código.

**Motivo:** cumplir la regla de "nunca inventar preguntas nuevas" sin dejar al usuario con una
sección vacía sin explicación.

**El quiz "Escenarios Integradores"** (el 7mo del banco, no ligado a un módulo específico en el
prompt original) se ubicó en la página **Resumen del Proyecto**, como cierre integrador de todo lo
estudiado.

**Guía de despliegue** es la única página sin quiz y sin nota de "quiz relacionado" — es contenido
operativo (comandos de terminal), no conceptual, y forzar un link a un quiz ahí se sintió más
confuso que útil.

**Costo:** ninguno funcional; es una decisión de UX/contenido.

**Cómo revertirla:** si la cátedra provee preguntas nuevas para estos temas, se agregan a
`content/quizzes.js` con una nueva key y se setea `quizId` (en vez de `relatedQuiz`) en la entrada
correspondiente de `content/modules.js`.

---

## Estilos: Tailwind CSS con paleta hardcodeada desde `look-and-feel.md`

**Decisión:** Tailwind CSS, con los colores exactos de `informes/look-and-feel.md` cargados como
tokens de tema (`bg`, `panel`, `border`, `accent.green`, `accent.purple`, `danger`) en
`tailwind.config.js`, en vez de escribir CSS a mano o usar CSS-in-JS.

**Motivo:** Tailwind permite iterar sobre estilos sin crear/nombrar archivos `.css` nuevos por
componente (menos archivos, menos tokens gastados en cambios de diseño futuros) y es una de las
librerías de estilo más documentadas del ecosistema.

**Simplificaciones respecto al documento original:**
- El look-and-feel describe un dashboard financiero (montos, "Total balance", tarjetas de crédito).
  Se adaptó el vocabulario visual (glassmorphism, verde/púrpura neón, tarjetas redondeadas) pero
  **no se importó contenido financiero** — los "stat cards" de Inicio muestran conteos reales del
  propio contenido (cantidad de módulos, de quizzes, de preguntas), no cifras inventadas.
- El header horizontal con navegación "en píldora" del documento original se adaptó a un **sidebar
  vertical** (así lo pidió el prompt de esta plataforma), pero se conservó el estilo de "píldora" en
  el item activo del menú.

**Alternativas consideradas:** CSS Modules (más archivos, uno por componente — en contra de
"menos archivos"); styled-components (dependencia de runtime extra sin beneficio claro acá).

**Costo:** hay que conocer las clases de Tailwind para editar estilos — mitigado porque son muy
legibles inline.

**Cómo revertirla:** los colores están centralizados en `tailwind.config.js`; cambiar la paleta es
editar un solo archivo.

---

## Sin librería de gráficos

**Decisión:** no se agregó ninguna librería de charts (recharts, chart.js, etc.), pese a que
`look-and-feel.md` menciona "gráficos de barras y circulares".

**Motivo:** el contenido de este sitio es texto estructurado (conceptos, pasos, preguntas), no datos
numéricos para graficar. Agregar una librería de charts sin datos reales que mostrar sería una
dependencia sin propósito — exactamente lo que el prompt pide evitar ("no agregues dependencias
innecesarias"). La estética de "dashboard" se logra con tarjetas, grillas y tipografía jerárquica,
no con gráficos literales.

**Costo:** ninguno.

**Cómo revertirla:** si en el futuro se agregan métricas reales (ej. resultados de quiz por sesión,
si se decidiera persistir en localStorage), ahí sí se justificaría evaluar una librería de charts.

---

## Routing: React Router con `HashRouter`, no `BrowserRouter`

**Decisión:** `HashRouter` (rutas tipo `#/cpu`), combinado con `base: './'` en `vite.config.js`.

**Motivo:** GitHub Pages sirve archivos estáticos sin poder reescribir rutas del lado del servidor.
Con `BrowserRouter`, refrescar la página en `/cpu` (o compartir ese link directo) da 404 a menos que
se agregue el hack del `404.html` que redirige. `HashRouter` evita el problema de raíz: el navegador
nunca le pide al servidor una ruta que no existe como archivo, porque todo lo que va después de `#`
se maneja 100% en el cliente. `base: './'` (rutas relativas) hace que el sitio funcione sin importar
bajo qué subpath de GitHub Pages se sirva (user page, project page, o hasta al abrir el `dist/`
localmente con `file://`), sin tener que hardcodear el nombre del repo en la config.

**Alternativas consideradas:** `BrowserRouter` + `404.html` con redirect JS (patrón común en la
comunidad de GH Pages) — descartado por agregar un archivo y una redirección extra para resolver un
problema que `HashRouter` no tiene en absoluto.

**Costo:** las URLs tienen un `#` (`sitio.com/#/cpu` en vez de `sitio.com/cpu`) — puramente estético,
sin impacto funcional.

**Cómo revertirla:** cambiar `HashRouter` por `BrowserRouter` en `main.jsx` y agregar el truco del
`404.html`, si en el futuro se despliega en un hosting que sí soporta rewrites (Netlify, Vercel).

---

## Buscador: índice plano en memoria, sin librería

**Decisión:** `content/searchIndex.js` construye un array plano de bloques con texto (title + snippet
+ sección) a partir de `content/pages/*.js`, y el filtro es un `.includes()` case-insensitive sobre
ese array. Sin Fuse.js, sin Algolia, sin web worker.

**Motivo:** el prompt dice explícitamente "no es necesario indexado complejo". Con ~13 páginas y unos
pocos cientos de bloques de contenido, un filtro lineal es instantáneo — no hay volumen de datos que
justifique una librería de búsqueda fuzzy.

**Costo:** la búsqueda es por coincidencia exacta de substring, no tolera errores de tipeo ni
sinónimos.

**Cómo revertirla:** si el contenido creciera mucho (ej. cientos de módulos), se puede reemplazar
`searchContent()` en `content/searchIndex.js` por una llamada a Fuse.js sin tocar `SearchBar.jsx`
(la interfaz `{moduleId, moduleTitle, sectionKey, sectionLabel, text}` se mantendría igual).

---

## Íconos: lucide-react

**Decisión:** `lucide-react` para los íconos de sidebar/UI, centralizados en `components/icons.jsx`.

**Motivo:** es una librería de íconos de línea fina ampliamente usada (coincide con "iconos de línea
finos y modernos" del look-and-feel), tree-shakeable (solo se empaqueta lo que se importa), sin
necesidad de gestionar SVGs a mano.

**Costo:** una dependencia más, pero muy liviana y ampliamente conocida — bajo riesgo para
mantenimiento futuro.

---

## Despliegue: GitHub Actions (build + deploy-pages), no un `docs/` commiteado

**Decisión:** un workflow en `.github/workflows/deploy-plataforma-estudio.yml` (en la raíz del repo,
como exige GitHub Actions) que en cada push a `main` que toque `plataforma-estudio/**` instala
dependencias, corre `npm run build`, y publica `dist/` a GitHub Pages con las actions oficiales
(`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`).

**Motivo:** evita comitear el output de build (`dist/`) al repo — el build siempre se genera fresco
a partir de la fuente, sin arrastrar artefactos binarios ni desincronizaciones entre código y build
publicado.

**Alternativas consideradas:** commitear `dist/` en una carpeta `docs/` y servirla directo — más
simple de entender a primera vista, pero obliga a acordarse de rebuildear y comitear el `dist/` cada
vez, con alto riesgo de que quede desactualizado.

**Costo:** hay que activar GitHub Pages con la fuente "GitHub Actions" en la configuración del repo
(un solo paso manual, una única vez — documentado en el README).

**Cómo revertirla:** borrar el workflow y usar `npm run build` + copiar `dist/` a una carpeta
servida directamente, si se prefiere no depender de Actions.

---

## Incidente de seguridad detectado durante la construcción: token de GitHub en texto plano

**Qué pasó:** al procesar `informes/00-guia-despliegue.md` para generar la página de "Guía de
despliegue", se detectó un Personal Access Token de GitHub en texto plano dentro del archivo (un
paso del runbook que documentaba cómo cloná el repo privado). Ese archivo ya estaba copiado tal cual
a `plataforma-estudio/public/informes/` para el botón de descarga — de haberse desplegado así, el
token hubiera quedado públicamente visible en el sitio.

**Qué se hizo:** se redactó el token (reemplazado por un placeholder explicativo) tanto en
`informes/00-guia-despliegue.md` (el original) como en la copia dentro de `public/informes/`. El
archivo no estaba trackeado por git al momento de la corrección (`git ls-files` no lo listaba), así
que no llegó a quedar expuesto en el historial de este repo.

**Recomendación pendiente para la usuaria:** rotar/revocar ese Personal Access Token desde GitHub
igual, como buena práctica, ya que circuló en texto plano fuera de git (documentos, capturas, etc.)
y no hay garantía de que ese fuera su único lugar de exposición.

---

## Deuda técnica aceptada / simplificaciones deliberadas

- **Sin progreso de quiz guardado.** El prompt lo exime explícitamente ("no hay necesidad de guardar
  progreso"). Si se pidiera en el futuro, se agregaría con `localStorage` — no requiere backend.
- **Sin tests automatizados.** Para un sitio de contenido estático sin lógica de negocio compleja,
  el costo de mantener una suite de tests no se justifica en el MVP. Si el proyecto creciera, lo
  primero a testear sería `content/searchIndex.js` (la única lógica no trivial) y el schema de los
  archivos de `content/pages/*.js`.
- **Sin i18n.** El prompt lo prohíbe explícitamente (el TP es en español, no hace falta soporte
  multi-idioma).
- **El contenido de los archivos `content/pages/*.js` fue redactado por agentes en paralelo** a
  partir de cada informe fuente, con instrucciones idénticas de esquema y tono. Puede haber pequeñas
  diferencias de estilo entre secciones escritas por agentes distintos — no afecta la exactitud
  técnica (cada uno trabajó solo con su informe fuente), pero si se nota alguna inconsistencia de
  tono vale la pena una pasada de revisión editorial unificada a futuro.

## Mejoras futuras (no implementadas, fuera de alcance del MVP)

- Botón "descargar todos los informes en un .zip" si se pide una versión offline completa.
- Modo de impresión/PDF por módulo (hoy el botón de descarga da el `.md` crudo, no un PDF).
- Marcado visual de qué preguntas de quiz ya se respondieron en la sesión actual (sin persistencia).
- Un `relatedQuiz` podría en el futuro mostrar un subconjunto de preguntas filtradas por tema en vez
  de linkear al quiz completo — hoy linkea al quiz entero por simplicidad.
