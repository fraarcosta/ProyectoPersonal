Configuración de la oportunidad + Gestión correcta de estados
1️⃣ Configuración de la oportunidad (botón arriba a la derecha)

Actualmente el botón “Configuración” dentro del Espacio de Trabajo no hace nada.
Se debe implementar con el siguiente comportamiento:

Al hacer clic en Configuración, se abrirá un modal centrado (no lateral) con scroll interno vertical y dos secciones claramente diferenciadas:

SECCIÓN 1 – Colaboradores

Mostrar:

Listado de todos los colaboradores actualmente asignados a la oportunidad.

Cada colaborador con:

Nombre

ID

Opción de eliminar (icono papelera)

Debajo:

Buscador por ID (igual que en crear oportunidad).

Botón: “Añadir colaborador”

Reglas:

Cualquier usuario con acceso al Espacio de Trabajo puede añadir colaboradores.

Al añadir un colaborador:

Se guarda de forma persistente.

Se envía notificación al usuario añadido.

Los cambios requieren botón “Guardar cambios”.

Si se cierra sin guardar → mostrar mensaje de confirmación.

SECCIÓN 2 – Documentación

Mostrar:

Listado completo de la documentación subida en la oportunidad (Pliegos y anexos).

Cada documento con:

Nombre del archivo

Tamaño

Botón descargar

Botón eliminar

Debajo:

Botón “Subir nuevo documento”

Reglas:

Se puede:

Añadir nuevos pliegos

Eliminar pliegos

Los cambios requieren botón “Guardar cambios”

El modal debe tener scroll vertical interno (no cortar campos).

2️⃣ Gestión del Estado de la Oportunidad
Estados permitidos (únicos y definitivos)

Eliminar todos los estados actuales incorrectos.
Solo deben existir estos cuatro estados:

En curso (por defecto al crear)

Entregada

Adjudicada

Descartada

Nada más.

Comportamiento del desplegable de estado
🟣 Cuando está en “En curso”

Puede cambiar a:

Entregada

Descartada

Adjudicada debe aparecer visible pero deshabilitado (gris).

🔁 Transición: En curso → Entregada

Cuando el usuario cambie el estado a Entregada:

Mostrar pop-up de confirmación:

“La oportunidad se marcará como entregada y se registrará en el Portal de Ventas. ¿Deseas continuar?”

Si confirma:

Se abre automáticamente el formulario del Portal de Ventas (exactamente el mismo que “Nueva oferta”).

📄 Formulario del Portal de Ventas (desde cambio de estado)

Debe:

Estar pre-rellenado automáticamente con:

Código expediente

Nombre oportunidad

Cliente

Año

Tipología contrato

Duración

Presupuesto base

Lotes (si existen)

Pliegos ya asociados

No debe aparecer botón de procesar pliegos aquí.

El usuario solo debe:

Subir Word oferta (por lote si aplica)

Subir PPT editables (por lote si aplica)

Al pulsar Guardar:

Se crea la oferta en Portal de Ventas.

La oportunidad se marca como Entregada.

Se refleja automáticamente en el listado del Portal de Ventas.

En Portal de Ventas aparece como:

Estado: Entregada

Resultado: Pendiente de valoración

🔁 Transición: Entregada → Adjudicada

Este cambio NO se hace desde Espacio de Trabajo.
Se hará desde Portal de Ventas (como ya está diseñado).

🔁 Transición: En curso → Descartada

Permitido directamente desde el desplegable.
Debe mostrar confirmación:

“¿Seguro que deseas descartar esta oportunidad?”

3️⃣ Reglas Técnicas Importantes

El desplegable de estado debe reflejar el estado real persistido en backend.

El cambio de estado debe ser transaccional:

No marcar como Entregada si el formulario de Portal de Ventas no se guarda correctamente.

Si el usuario cancela el formulario del Portal de Ventas:

El estado debe permanecer “En curso”.

4️⃣ UX Obligatorio

Modal de configuración → scroll vertical interno.

Modal de transición a Entregada → centrado.

Formulario Portal de Ventas → mismo diseño que el módulo principal.

Nada lateral.

Nada que corte campos.

Con esto:

La Configuración permite ajustar colaboradores y pliegos.

El Estado se simplifica a 4 estados claros.

Se integra automáticamente Espacio de Trabajo con Portal de Ventas.

Se elimina cualquier estado innecesario.

Se garantiza coherencia del ciclo de vida.