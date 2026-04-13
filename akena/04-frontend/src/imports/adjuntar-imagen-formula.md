Añadir “Adjuntar imagen de fórmula” en Configuración de Fórmula Económica (Global y por partida)
📍 Ubicación exacta

Dentro de:

Línea Económica → Configuración y Simulación → Configuración de fórmula económica

En cada bloque:

Si NO hay desglose → en el bloque Global

Si hay desglose → en cada bloque de Partida y también en el bloque Global

🎯 Objetivo funcional

Permitir al usuario subir una captura de pantalla de la fórmula económica cuando la extracción automática falle o sea incorrecta.

Esto actúa como Plan B manual asistido por imagen.

🧩 Cambios en UI
1️⃣ Añadir botón en cada bloque de fórmula

En el header del bloque de fórmula (donde pone por ejemplo “Global” o “Partida 1 – Mantenimiento”):

A la derecha del título, añadir botón:

🖼 Adjuntar imagen de fórmula

Diseño:

Botón secundario

Icono pequeño de imagen

Tooltip:

“Sube una captura de la fórmula económica para procesarla automáticamente.”

2️⃣ Comportamiento al pulsar el botón

Al hacer clic:

Abrir pequeño modal secundario o zona expandible debajo del bloque.

Mostrar:

Área de subida (drag & drop o seleccionar archivo)

Texto: “Sube una captura donde se vea claramente la fórmula económica.”

Formatos permitidos:

PNG

JPG

JPEG

PDF (1 página máximo)

3️⃣ Flujo de procesamiento

Cuando el usuario sube la imagen:

Mostrar estado:

“Procesando imagen de fórmula…”

El sistema:

Analiza la imagen (OCR + parsing).

Extrae el texto matemático.

Convierte la imagen en texto estructurado.

Sobrescribe el campo “Fórmula económica” con el resultado.

Deja el campo editable.

Mostrar mensaje verde:

“Fórmula actualizada desde la imagen. Revísala antes de simular.”

4️⃣ Reglas importantes

Es completamente opcional.

No sustituye el botón “Extraer”.

Puede utilizarse aunque ya haya fórmula.

Puede repetirse las veces que el usuario quiera.

Solo afecta al bloque donde se sube (no a las otras partidas).

5️⃣ Casos con múltiples partidas

Si hay:

Partida 1

Partida 2

Global

Cada bloque debe tener su propio botón de “Adjuntar imagen de fórmula”.

No debe afectar a otras partidas.

6️⃣ Validaciones

Si la imagen no es legible:
Mostrar error:

“No se ha podido interpretar la fórmula. Intenta subir una imagen más clara.”

No bloquear el resto de la pantalla si falla.

7️⃣ Persistencia

La fórmula procesada desde imagen debe guardarse como el valor actual del campo.

No es necesario guardar la imagen permanentemente (opcional), pero si se guarda, asociarla al bloque correspondiente.

🧠 UX esperado

Usuario:

Extrae automáticamente.

Ve que la fórmula no es correcta.

Hace captura del PDF.

Pulsa “Adjuntar imagen de fórmula”.

La sube.

Se autocompleta correctamente.

Simula.