Actúa como Product Designer Senior (enterprise SaaS). Mejora la FASE DE VALORACIÓN añadiendo tres funcionalidades específicas sin modificar el resto de la estructura.

IMPORTANTE:
- Mantener todo lo que ya funciona.
- No rediseñar la fase completa.
- Solo añadir estas 3 funcionalidades.

==================================================
1) INPUT OPCIONAL PARA LA IA EN REGISTRO DE LICITADORES
==================================================

Cuando el usuario registra los licitadores, añadir debajo un bloque opcional:

“Criterio adicional de valoración (opcional)”

Este bloque debe permitir:

- Un campo de texto libre donde el usuario pueda escribir qué quiere valorar adicionalmente
  Ejemplo:
  “Quiero que se valore especialmente el uso real de Scrum”

- Un modo asistido con IA:
  - Campo tipo “instrucciones”
  - Botón: “Refinar con IA”
  - La IA transforma el texto en una versión más formal y completa

El resultado final se guarda como texto consolidado.

IMPORTANTE:
Este texto debe ser utilizado por los agentes SOLO en la evaluación técnica (no en administrativa ni económica).

==================================================
2) EVALUACIÓN DEL EQUIPO COLABORATIVA
==================================================

Actualmente la evaluación del equipo es individual.
Modificar para permitir evaluación por múltiples usuarios.

Añadir en esta sección:

“Evaluadores del expediente”

Funcionalidad:
- El admin puede seleccionar varios usuarios que evaluarán
- Lista de evaluadores asignados

Cada evaluador tendrá:
- su propio espacio de evaluación
- sus propias puntuaciones por criterio
- sus propias justificaciones

IMPORTANTE:
Todos los evaluadores trabajan sobre:
- los mismos criterios subjetivos
- los mismos licitadores

==================================================
3) COMPARATIVA AVANZADA (IA + EQUIPO)
==================================================

Modificar la pantalla de comparativa para incluir:

A) Comparativa IA vs evaluadores
- puntuación IA
- puntuación de cada evaluador
- diferencia

B) Comparativa entre evaluadores
- puntuación de cada evaluador por criterio
- media
- máxima
- mínima

C) Análisis automático:
Mostrar insights como:
- quién ha puntuado más alto
- quién ha puntuado más bajo
- quién está más cerca de la IA
- mayor discrepancia entre evaluadores
- diferencias relevantes en texto

D) Consenso final:
Añadir un bloque:

“Puntuación final”

Permitir elegir:
- media de evaluadores
- puntuación manual
- otra opción configurable

==================================================
4) GENERACIÓN DE INFORMES AUTOMÁTICOS
==================================================

Añadir una nueva sección en valoración:

“Informes”

Esta sección debe permitir generar automáticamente:

- Acta de apertura Sobre A
- Acta de apertura Sobre B
- Acta de apertura Sobre C
- Informe de valoración técnica
- Informe de valoración económica

Cada informe:
- botón “Generar”
- estado (pendiente / generado / validado)
- opción de descarga

IMPORTANTE:
Los informes deben basarse en:
- datos reales de licitadores
- resultados de evaluación
- puntuaciones

==================================================
OBJETIVO FINAL
==================================================

La fase de valoración debe permitir:
- añadir un criterio adicional de valoración para la IA
- evaluar con múltiples usuarios
- comparar IA vs equipo vs evaluadores
- generar informes automáticos de licitación pública