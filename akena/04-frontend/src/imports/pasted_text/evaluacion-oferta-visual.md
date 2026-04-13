Refactor UI “Evaluación Oferta Técnica” a Vista Visual + Vista Texto
Objetivo del cambio

La evaluación actual devuelve un bloque de texto largo con toda la valoración. Esto debe evolucionar a una UX mucho más visual y escaneable, tipo “cuadro de mando” (sin ser BI), manteniendo además una vista “Texto completo” para copiar/descargar.

Regla clave:

Tras pulsar “Evaluar Oferta Técnica”, la pantalla debe mostrar por defecto la Vista Visual (Dashboard).

En la parte superior debe existir un selector de vista (tabs/segmented control) para alternar:

“Resumen visual” (default)

“Informe en texto” (la salida actual, sin perder contenido)

1) Estructura general de la pantalla (sin cambiar el flujo de inputs)

Se mantiene arriba:

Pozo de carga (Word/PDF)

Campo opcional “Input de simulación de cliente”

Botón “Evaluar Oferta Técnica”

Resultado (ahora con selector de vista)

Persistencia colectiva se mantiene igual.

2) Selector de vista (arriba del resultado)

Justo debajo del botón (o al inicio del área de resultados) incluir:

Tab/segmented:

Resumen visual (seleccionado por defecto)

Informe en texto

Si el usuario cambia de pestaña, no se pierde nada y se conserva el mismo resultado.

3) Nuevo “Resumen visual” (default) — Layout tipo tablero

El tablero debe estar dividido en bloques claros (cards) con jerarquía visual.

3.1 Cabecera de resultado (muy visible)

Bloque superior “Resultado global”

Mostrar:

Badge grande Favorable / Desfavorable

Color fuerte:

Favorable → verde (fondo verde, icono blanco)

Desfavorable → rojo (fondo rojo, icono blanco)

“Nivel de confianza” (Alto / Medio / Bajo)

Fecha/hora de evaluación

Botones:

Reevaluar (repite análisis)

Descargar informe (descarga en Word/PDF el informe textual completo, ver sección 4)

Muy importante (front preparado para back):
El backend debe devolver un campo estructurado:

overall_status: FAVORABLE | DESFAVORABLE

confidence: HIGH | MEDIUM | LOW
y el front pinta colores según ese estado (no hardcode).

3.2 Cards de puntuación / scoring (visual y rápido)

Crear 3 cards con “score” (0–100 o 0–10, pero consistente):

Alineamiento con Pliego

Alineamiento con Cliente (simulación + histórico)

Cobertura de Win Themes

Cada card contiene:

Score grande

Mini explicación (1–2 líneas)

Indicador tipo barra/progreso

“Top 3 evidencias” (bullets cortos)

Si no hay Win Themes validados: card de Win Themes debe mostrar “No disponible (Win Themes no validados)” y no penaliza el global, solo informa.

3.3 Sección “Fortalezas” (visual con tags)

Bloque con título Fortalezas identificadas

Mostrar lista en cards pequeñas o bullets “taggeados” con color suave (verde claro).

Cada fortaleza debe incluir:

“Qué es”

“Dónde aparece” (apartado/sección o página estimada si el doc lo permite)

“Impacto” (Alto/Medio/Bajo)

3.4 Sección “Riesgos / Debilidades” (muy clara)

Bloque con título Riesgos y debilidades

Lista priorizada (Riesgo crítico / medio / bajo)

Colores:

Crítico → rojo suave

Medio → ámbar suave

Bajo → gris suave

Cada riesgo debe incluir:

Descripción concreta

Motivo (pliego / cliente / win theme)

Evidencia/ubicación (si se puede)

Consecuencia potencial

3.5 Sección “Recomendaciones de mejora” (lila)

Bloque con título Recomendaciones

Visual tipo checklist

Color dominante: lila (como “acción/mejora”)

Cada recomendación debe incluir:

Acción concreta (verbo + objeto)

“Dónde aplicarla” (apartado)

Prioridad (Alta/Media/Baja)

Beneficio esperado (qué mejora)

3.6 Sección “Cumplimiento de Win Themes” (con estado por win theme)

Bloque con tabla o cards por win theme:

Columnas/campos:

Win Theme (título)

Estado: Cubierto / Parcial / No identificado

Evidencia / apartado sugerido

Recomendación de refuerzo (si parcial/no)

Colores:

Cubierto → verde

Parcial → ámbar

No identificado → rojo

4) “Informe en texto” (mantener lo actual + utilidades)

La pestaña Informe en texto debe ser exactamente el resultado actual (texto completo), con:

Botón Copiar

Botón Descargar (Word o PDF, o al menos Word)

Este texto es el “source of truth” del contenido completo, y el dashboard es una visualización resumida/estructurada.

5) Reglas de decisión Favorable/Desfavorable (para que tenga sentido)

No decidir en el front. El back devuelve overall_status.
Pero el front debe soportar lógica de presentación:

Si overall_status = DESFAVORABLE → cabecera roja + etiqueta “Desfavorable”

Si overall_status = FAVORABLE → cabecera verde + etiqueta “Favorable”

Y además mostrar debajo una línea breve:

“Motivo principal del resultado” (1 frase) → viene del back como main_reason.

6) UX adicional

Tras evaluar, hacer scroll automático al bloque de resultados.

Mantener historial opcional (si ya existe persistencia): “Última evaluación” (solo la última visible).

Si se sube un nuevo documento y se evalúa, se sobreescribe la evaluación persistente.