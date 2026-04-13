Ajustes finales en Configuración de Oportunidad + Validaciones al marcar “Entregada”
1️⃣ Configuración de la oportunidad – Añadir sección “Datos básicos”

Actualmente la configuración solo tiene:

Colaboradores

Documentación

🔹 Cambio obligatorio

Añadir una nueva sección arriba del todo:

SECCIÓN 0 – Datos básicos de la oportunidad

Mostrar todos los datos que se rellenaron al crear la oportunidad:

Nombre de la oportunidad

Código de expediente

Cliente

Año

Duración del contrato

Presupuesto base de licitación (sin IVA)

Tipología de contrato (multi-selección si aplica)

Lotes (si existen)

Reglas:

Todos estos campos deben ser editables en todo momento.

Cualquier cambio debe guardarse con botón “Guardar cambios”.

Estos datos son la fuente oficial que luego se enviará al Portal de Ventas al marcar como Entregada.

Si hay errores en los datos originales, se deben corregir aquí.

2️⃣ Mejora en sección Colaboradores

Actualmente permite añadir colaboradores. Añadir estas mejoras:

🔹 Búsqueda ampliada

Si al buscar por ID no encuentra ningún usuario:

Mostrar mensaje claro:

“No se ha encontrado ningún usuario con ese ID.”

Permitir volver a intentar sin cerrar modal.

No bloquear ni romper flujo.

🔹 Permitir añadir colaboradores adicionales

Debe poder añadirse cualquier usuario registrado en Akena (persistencia central de usuarios).

3️⃣ Transición obligatoria: En curso → Entregada (Validación estricta)

Cuando el usuario cambie estado de “En curso” a “Entregada”:

Paso 1 – Confirmación

Mostrar confirmación:

“Se va a marcar la oportunidad como entregada y se registrará en el Portal de Ventas. ¿Deseas continuar?”

Paso 2 – Mostrar formulario Portal de Ventas (pre-rellenado)

Formulario debe:

Usar los datos actuales de la sección “Datos básicos”.

No permitir cambiar estado hasta completar requisitos.

🔴 VALIDACIÓN OBLIGATORIA ANTES DE PERMITIR GUARDAR

Para poder marcar como “Entregada” y guardar:

Caso SIN lotes

Debe ser obligatorio subir:

Word de la oferta técnica (.docx)

PPT editables (.pptx)

Si no están ambos:

No permitir guardar.

Mostrar error en rojo:

“Debe subir el Word de la oferta técnica y el PPT de editables antes de marcar la oportunidad como entregada.”

Caso CON lotes

Para cada lote debe ser obligatorio subir:

Word de la oferta técnica del lote

PPT editables del lote

Si falta cualquiera en algún lote:

No permitir guardar.

Mostrar mensaje:

“Debe subir la documentación completa (Word y PPT) para todos los lotes antes de marcar como entregada.”

🔒 Regla crítica

Si el usuario:

Cancela el formulario

O no cumple validaciones

Entonces:

El estado debe permanecer “En curso”

No debe crearse nada en Portal de Ventas

No debe cambiar el estado en base de datos

4️⃣ Persistencia y coherencia

Al guardar correctamente:

Se crea la oferta en Portal de Ventas

Se actualiza estado a “Entregada”

Aparece en listado Portal de Ventas

Resultado = “Pendiente de valoración”

5️⃣ Resumen de cambios

Añadir sección editable de Datos básicos en Configuración.

Mejorar búsqueda de colaboradores con manejo de “no encontrado”.

Validar obligatoriamente Word + PPT antes de marcar como Entregada.

Bloquear transición si falta documentación.

Mantener coherencia transaccional (si falla algo → no cambia estado).