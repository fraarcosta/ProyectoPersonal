Cambios y correcciones en “Crear oportunidad” (multi-tipología, lotes, colaboradores, notificaciones) + diagnóstico de bugs
1) UX: Tipología de contrato — multi-selección

Reemplazar el campo Tipología de contrato por un componente multi-select (checkbox list dentro de dropdown).

Permitir seleccionar varias tipologías.

Mantener la opción “Otros — especificar”: si el usuario marca “Otros” mostrar campo libre editable.

Aceptación: al guardar la oportunidad, el back recibe un array de tipologías y el UI muestra las seleccionadas en el resumen.

2) Lotes: asignación de colaboradores por lote y copia entre lotes

Mantener la pregunta “¿La licitación tiene lotes?” (Sí/No).

Si Sí:

Permitir añadir N lotes (identificador por lote).

Colaboradores: permitir asignar colaboradores por lote.

Añadir botón: “Mismos colaboradores en todos los lotes”. Al pulsarlo copia la lista de colaboradores del lote actual a todos los demás lotes (UI: confirmación modal opcional).

Interfaz: por cada lote mostrar sección “Colaboradores (este lote)”.

Si No: colaboradores son globales para la oportunidad.

3) Creación de oportunidades por lote (regla de negocio)

Cuando el usuario pulsa Crear oportunidad y hay >1 lote:

Se crearán N oportunidades, una por cada lote.

Nombre generado: <Nombre base> — <Identificador lote> (ej. Evolución Apps — Lote 1 Mantenimiento).

El resto de metadatos se copian de la pantalla de creación (cliente, año, presupuesto base, tipologías, pliegos).

Documentación: Pliegos y anexos se vinculan a cada oportunidad creada (no duplicar archivos físicamente si no es necesario; pueden referenciarse).

Colaboradores: asignados por lote (según la sección anterior). Si se seleccionó “Mismos colaboradores…”, se aplica a todas.

Aceptación: tras crear, el sistema muestra en el listado N entradas separadas con sus respectivos nombres y colaboradores.

4) Documentación en Crear oportunidad

En Documentación mantener solo: Pliegos y anexos (documentación común).

Quitar cualquier campo de Word/PPT de oferta en esta pantalla (ese material corresponde al paso de creación de oferta/Portal de Ventas).

Al crear N oportunidades por lote, los pliegos subidos se asocian a cada oportunidad creada.

5) Notificaciones

Implementar notificaciones push/badge + registro persistente cuando:

Se añade un colaborador (o varios) a una oportunidad (o al lote correspondiente).

Notificación: "Te han añadido a la oportunidad <Nombre> [— Lote X]".

La notificación debe:

Aparecer en la UI (icono campana con badge).

Generar un registro en la tabla de notificaciones del usuario (persistente).

Mostrar link directo a la nueva oportunidad.

También notificar a los asistentes si los hay (misma lógica).

Aceptación: el usuario que fue añadido ve la notificación y la oportunidad en su listado.

6) Reglas de persistencia / API / datos

Al crear varias oportunidades por lotes:

Endpoint: POST /opportunities (o POST /opportunities/batch) — payload debe permitir array de lotes o el backend generará N recursos internamente.

Cada oportunidad debe tener parent_pliego_id o pliegos[] como relación.

Metadatos esperados: { name, code, client, year, duration, budget_base, tipologies: [], lot_id, collaborators: [], documents: [] }.

No duplicar físicamente los ficheros si el storage permite referencias; asociar metadatos a cada oportunidad.

7) Diagnóstico/Tareas concretas para los bugs que reportaste

A continuación la lista de comprobaciones concretas para que el equipo QA/dev investigue por qué falla lo que indicas:

Bug A — Cabecera / resumen que no muestra: nombre, cliente, expediente

Síntoma: tras crear la oportunidad la cabecera (breadcrumb/resumen superior) aparece vacía o con campos incorrectos.

Comprobaciones técnicas (prioridad alta):

Frontend: revisar binding de la respuesta create → vista. ¿Se está leyendo response.data correcto?

Revisar consola del navegador: ¿respuesta del POST contiene los campos name, client, code?

Backend: revisar payload de creación (logs). ¿Se persisten en BD?

Buscar en DB la nueva fila → comprobar columnas name, client_id, code.

Timing race: ¿la vista principal se renderiza antes de que la API devuelva el recurso?

Solución temporal: mostrar loading y refrescar con la respuesta del POST.

Cache/local state: comprobar si se está leyendo estado desde un store global (Redux/Vuex) que no se actualiza tras la creación.

Aceptación: al crear, la API devuelve la representación completa de la oportunidad y el frontend utiliza esa respuesta para el header.

Bug B — Resumen del pliego / control de incoherencias falla

Síntoma: el análisis de pliego (resumen o control de incoherencias) devuelve error o vacío.

Comprobaciones técnicas:

¿Se llama al servicio de procesado de pliegos al subir? (endpoint de extracción). Revisar request/response.

Verificar que los ficheros subidos llegan correctamente al microservicio de extracción (tamaño, content-type).

Logs del extractor (NLP/parse): ¿hay errores de parsing (ocr, formato, timeout)?

Validaciones frontend: el control no debería bloquear la creación; en su lugar mostrar aviso y permitir reintento.

Si el servicio de extracción es asíncrono, asegurar mecanismo de notificación/colas y hacer polling o webhook para marcar resultado listo.

Aceptación: al subir pliegos, la extracción devuelve summary y inconsistencies[]. Si hay fallo, el UI muestra mensaje claro con botón Reintentar extracción.

Bug C — Asistente / soporte muestra usuario incorrecto (p. ej. “Ana García” en vez de usuario logado)

Síntoma: el asistente o chat muestra otro usuario en lugar del currentUser.

Comprobaciones técnicas:

Revisar la fuente del displayName que se muestra:

¿Se está leyendo de session.user o de un parámetro hardcoded/test?

¿Se usa una cuenta de servicio o variable global en vez de auth.user?

Verificar autenticación: que el token JWT/session contenga user_id y que ese user_id se use para fetch del perfil.

Revisar mapeo entre Auth user ↔ Profile (posible mismatch entre email vs id).

Logs: al abrir asistente, añadir log con currentUser.id, currentUser.email, y la fuente usada en la UI.

Aceptación: el asistente siempre muestra nombre y avatar del usuario logado (tomado del auth actual). No debe usar valores de ejemplo.

8) Tests de aceptación (QA)

Crear oportunidad con 2 lotes y:

Subir pliegos.

Asignar colaboradores diferentes por lote y comprobar que tras crear aparecen 2 oportunidades con nombres Base — Lote1 y Base — Lote2.

Comprobar notificaciones para cada colaborador (badge + link).

Crear oportunidad con “Mismos colaboradores” y comprobar asignación a ambos.

Comprobar que tipologías múltiples se guardan y se muestran.

Al crear, comprobar header/resumen se rellena inmediatamente (no vacío).

Reintentar extracción de pliegos: subir pliego inválido => ver mensaje con opción Reintentar.

Abrir asistente: comprobar que muestra el usuario logado.

9) Mensaje para el equipo (copy directo)

Implementar: (1) tipología multi-select, (2) colaboradores por lote + botón “Mismos colaboradores”, (3) creación N oportunidades (una por lote) con nombre <Base> — <Lote>, (4) en Crear Oportunidad documentación solo pliegos y anexos, (5) notificaciones a colaboradores, (6) persistir metadata y asegurar que la UI utiliza la respuesta del create para rellenar cabecera.

Investigar y corregir: cabecera vacía (revisar response binding / race conditions / store), fallo en extracción/resumen de pliegos (revisar upload → extractor logs → manejo asíncrono), y el asistente que muestra usuario erróneo (revisar mapeo auth → profile). Adjuntad logs y trazas al report de la tarea para seguimiento.