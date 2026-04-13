Bloqueo total de edición y modo histórico al pasar la oportunidad a “Entregada”
Objetivo

Cuando una oportunidad cambie su estado a “Entregada”, el Espacio de Trabajo debe quedar completamente BLOQUEADO (modo histórico), de forma que:

Se pueda consultar y descargar todo lo generado hasta ese momento.

No se pueda editar nada (ni volver a ejecutar acciones).

El sistema muestre únicamente lo último persistido antes de marcar como entregada.

1) Regla global de bloqueo por estado

Implementar una regla transversal:

✅ Si estado = “En curso”

Todo funciona normal: edición + ejecución de funcionalidades.

🚫 Si estado = “Entregada”

Toda la oportunidad pasa a Modo Histórico (Solo Lectura).

Se deshabilitan todas las acciones que generen/editen contenido.

2) Qué se mantiene visible en “Entregada”

En modo histórico se debe mostrar:

Todo documento generado (ej. Word/PPT/Excel, pliegos procesados, informes…)

Todo contenido persistido (resumen del pliego, incoherencias detectadas, evaluación, simulación económica, win themes, etc.)

Pero con la regla:

📌 Solo se muestra lo que exista en persistencia.

Si una funcionalidad no se ejecutó nunca, no se inventa nada ni aparece vacío: simplemente no se muestra (o aparece como “No generado” sin botón).

Ejemplos:

Si se generó “Resumen del pliego” → se ve y se puede descargar.

Si nunca se ejecutó “Detectar incoherencias” → no aparece el bloque, o aparece bloque “No ejecutado”.

3) Qué debe quedar deshabilitado (sin excepción)

En “Entregada”, desactivar:

UI / Inputs

Todos los campos editables pasan a solo lectura (disabled / readOnly).

Textareas bloqueadas.

Selects bloqueados.

Drag & drop de documentos deshabilitado.

Botones

Deshabilitar (no ocultar siempre, pero sí bloquear claramente):

“Generar”

“Regenerar”

“Validar”

“Editar”

“Guardar”

“Subir archivo / Reemplazar”

“Simular”

“Extraer”

“Buscar ofertas”

“Crear chatbot”

“Reevaluar”

“Añadir partida / Eliminar partida”

Cualquier botón que cambie estado o contenido

Mostrar tooltip o mensaje al pasar el ratón:

“La oportunidad está en estado Entregada. Solo se permite consulta histórica.”

4) Persistencia: “foto final” del último estado

Al marcar como entregada, asegurar:

Se guarda el último estado persistido de cada módulo/funcionalidad.

La oportunidad queda como una instantánea final.

Regla clave:
📌 Lo último guardado/ejecutado antes de Entregada es lo que queda como versión final.
No puede modificarse después.

5) Indicador visual claro de “Modo Histórico”

En la UI del espacio de trabajo, añadir:

Banner superior fijo:
“MODO HISTÓRICO — Oportunidad entregada (solo lectura)”

Color neutro (gris) + icono candado.

En el banner, un texto corto:

“Puedes consultar y descargar el contenido generado. No se permiten cambios.”

6) Descargas sí, edición no

En “Entregada”:

✅ Se permite:

Descargar documentos individuales

Descargar zips (carpetas oferta, etc.)

Visualizar resultados persistidos

🚫 No se permite:

Cargar nueva documentación

Cambiar colaboradores

Cambiar configuraciones

Regenerar nada

7) Validación técnica obligatoria

El frontend debe depender de una flag del backend:

isReadOnly = true cuando estado = Entregada

El front no decide por su cuenta: consume la flag.

Si por error alguien intenta ejecutar una acción, el backend debe responder:

403 + mensaje:

“Oportunidad en estado Entregada. Acción no permitida.”

Resultado esperado

Cuando la oportunidad esté en Entregada:

Todo se ve como “histórico”.

Se puede revisar “qué se hizo”.

Se puede descargar.

No se puede tocar nada.

Si algo no se hizo antes, no aparece como si existiera.