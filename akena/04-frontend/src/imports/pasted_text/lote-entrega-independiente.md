Corrección crítica: Entrega por lote independiente (Portal de Ventas)
❗ Problema actual

Cuando una oportunidad tiene varios lotes (ej: Lote 1 y Lote 2):

Se crean correctamente como oportunidades separadas (OK ✅)

Pero al marcar como “Entregada”:

El sistema obliga a subir la documentación de todos los lotes

Aunque el usuario esté dentro de solo uno de ellos

👉 Esto es incorrecto.

✅ Comportamiento correcto (obligatorio)

Cada lote debe comportarse como una oportunidad completamente independiente en el momento de marcar como entregada.

🧩 Nueva lógica de funcionamiento
1️⃣ Contexto de lote activo

Cuando el usuario está en:

Oportunidad: “X — Lote 1”

El sistema debe entender que:

👉 Solo está trabajando con ese lote

2️⃣ Cambio de estado a “Entregada”

Cuando el usuario cambia el estado:

En curso → Entregada

Se abre el formulario del Portal de Ventas.

3️⃣ DOCUMENTACIÓN — comportamiento correcto
🔹 SOLO se debe pedir documentación del lote activo
Caso:

Usuario está en:
👉 “Oportunidad — Lote 1”

Entonces el formulario debe pedir únicamente:

Word oferta técnica → Lote 1

PPT editables → Lote 1

🚫 NO debe aparecer:

Lote 2

Lote 3

Otros lotes

4️⃣ Reglas de validación
Caso SIN lotes

Igual que ahora (Word + PPT)

Caso CON lotes

Validar SOLO el lote actual:

Word obligatorio

PPT obligatorio

Si falta:

“Debe subir la documentación del lote actual antes de marcar como entregada.”

5️⃣ Persistencia y guardado

Cuando el usuario guarda:

Se registra SOLO ese lote en Portal de Ventas

Estado del lote actual → Entregada

Otros lotes:

Permanecen en “En curso”

No se ven afectados

6️⃣ Ejemplo esperado
Caso real:

Pliego con:

Lote 1 → Mantenimiento

Lote 2 → PMO

Se crean:

Oportunidad — Lote 1

Oportunidad — Lote 2

Flujo:

Usuario entra en:
👉 Lote 1

Marca como entregada

Sube Word + PPT del Lote 1

Guarda

Resultado:

Lote 1 → Entregada ✅

Lote 2 → sigue en curso ⏳

Luego entra en:
👉 Lote 2

Repite proceso SOLO con ese lote

7️⃣ Ajuste en UI (muy importante)

En el formulario de entrega:

Mostrar claramente arriba:

“Estás entregando: Lote X”

NO mostrar bloques de otros lotes

NO mostrar estructura múltiple

8️⃣ Regla clave (arquitectura)

Aunque el origen sea el mismo pliego:

👉 Cada lote = una oportunidad independiente en fase de entrega

✅ Resultado esperado

Eliminamos confusión

Evitamos errores de subida

Flujo natural y coherente

Alineado con realidad de licitaciones