Nueva sección Home: “Cualificación previa (GO / NO GO)”
0) Objetivo

Añadir en Home, por encima del bloque “Espacio de trabajo” (donde hoy están “Crear nueva oportunidad” y “Seleccionar oportunidad existente”), un nuevo bloque de entrada llamado:

“Cualificación previa de la oportunidad (GO / NO GO)”

Su finalidad es permitir que el usuario suba pliegos (administrativos y técnicos), pulse Analizar, y el sistema:

Extraiga automáticamente campos clave para decidir GO/NO GO.

Genere un veredicto GO o NO GO con justificación.

Permita (si es GO) pasar a Crear Oportunidad usando los datos extraídos como pre-relleno (editable).

1) Ubicación en Home y navegación
En Home deben existir 3 grandes bloques (arriba a abajo):

Cualificación previa (GO / NO GO) ← NUEVO (arriba)

Espacio de trabajo (Crear / Seleccionar oportunidad) ← existente

Portales corporativos (Ventas / Activos / Innovación) ← existente

Además, en el “menú rápido” superior (si existe) añadir un botón:

“Cualificación previa” que hace scroll/foco a este bloque.

2) Pantalla / Modal de “Cualificación previa”

Al clicar en “Cualificación previa…”, abrir una pantalla propia (o modal grande centrado) con scroll interno si hace falta (no cortar campos).

Estructura en 4 secciones verticales:
A) Carga de documentación (obligatoria)

Pozo de documentación con texto claro:

“Sube pliegos administrativos y técnicos (PDF/DOCX) y anexos necesarios para preevaluar la licitación.”

Permitir múltiples archivos.

Clasificación opcional por tipo (chips):

“Pliego Administrativo”, “Pliego Técnico”, “Anexos”

(si el usuario no etiqueta, el sistema intenta inferirlo)

Validación: si no hay documentación → botón Analizar deshabilitado + hint:

“Sube al menos un pliego para poder analizar.”

B) Botón de acción

Botón principal grande:

“Analizar pliegos (GO / NO GO)”

Al pulsar:

Mostrar estado loading:

“Analizando documentación… extrayendo criterios de viabilidad.”

Al terminar, colapsar “Carga de documentación” en modo resumen (chips con archivos cargados), y abrir resultados.

Botón secundario:

“Reanalizar” (solo aparece cuando ya hay resultados)

3) Resultados: Veredicto GO / NO GO (muy visible)

Encima de todo el resultado, un bloque destacado:

“Resultado de cualificación”

Badge grande:

GO (verde fuerte, texto y check en blanco)

NO GO (rojo fuerte, texto y cross en blanco)

Debajo: “Nivel de confianza” (Alto/Medio/Bajo)

Debajo: “Resumen en 5 bullets” de por qué.

Regla: el front debe estar preparado para recibir del back:

decision: GO | NO_GO

confidence: HIGH | MEDIUM | LOW

reasons: string[]

4) Extracción automática de campos (tarjetas editables)

Debajo del veredicto, mostrar una sección titulada:

“Datos clave extraídos del pliego”

Mostrarlo en tarjetas (cards) con:

campo extraído (valor)

“fuente” (ej. “Pliego administrativo – pág aprox. X”) si está disponible

indicador de “requiere revisión” si la extracción no es fiable

Todos estos campos deben ser EDITABLES por el usuario (porque es preevaluación).

Campos recomendados (mínimo):

Identificación y alcance

Cliente / Organismo convocante

Objeto de la licitación (1–2 líneas)

Tipología de contrato (multi-selección + “Otros” editable)

Ámbito geográfico (ciudad/provincia/CCAA/varios)

Duración del contrato (meses) + prórrogas (sí/no + cuánto)

Lotes (sí/no) + nº de lotes + lista de lotes (si aplica)

Restricciones operativas
7) Presencialidad requerida (0/mixta/alta) + % o condiciones
8) Idioma requerido (ES/EN/otros)
9) SLA críticos / 24x7 (sí/no) + resumen
10) Subrogación (sí/no / no claro) + observaciones
11) Requisitos de seguridad / certificaciones (ENS, ISO, etc.) (sí/no + lista)

Económico
12) Presupuesto base sin IVA (€)
13) Fórmula económica (texto) + umbral baja temeraria (si existe)
14) Penalizaciones económicas relevantes (sí/no + resumen)
15) Garantías / fianzas (sí/no + importe)

Criterios de adjudicación
16) Reparto puntos: Técnicos vs Económicos (% o puntos)
17) Principales criterios técnicos (bullets)
18) Documentación obligatoria por sobres (si se puede inferir)

Riesgos detectados
19) Riesgos clave (lista editable)
20) Supuestos/lagunas detectadas (lista editable)

5) Bloque “Justificación GO / NO GO” (texto no editable)

Sección titulada:

“Justificación de la recomendación”

Campo de texto largo no editable (solo lectura) con estructura fija:

“Encaje con capacidades / delivery”

“Riesgos operativos”

“Riesgos económicos”

“Complejidad documental y cumplimiento”

“Recomendación final y condiciones para convertir NO GO → GO (si aplica)”

Debe incluir recomendaciones accionables, por ejemplo:

“Si se confirma subrogación alta y presencialidad >60%, revisar staffing local.”

“Si el peso económico es >50% y fórmula es agresiva, preparar estrategia de descuento.”

6) Acciones finales (CTA)

Al final, dos botones:

Si resultado = GO

Botón primario: “Crear oportunidad a partir de esta cualificación”

Al pulsarlo: abre “Crear nueva oportunidad” con campos pre-rellenados usando los datos extraídos (editable).

Adjunta automáticamente los pliegos ya cargados a la oportunidad.

Botón secundario: “Descargar informe GO/NO GO (PDF/Word)” (opcional)

Si resultado = NO GO

Botón primario: “Guardar cualificación” (para histórico)

Botón secundario: “Reanalizar” (por si añaden más anexos)

7) Persistencia (importante)

La cualificación debe tener persistencia colectiva por usuario/oportunidad aunque aún no exista oportunidad:

Guardar:

Documentos subidos

Campos extraídos (y sus ediciones)

Resultado GO/NO GO + justificación + fecha

En Home, en el bloque de “Cualificación previa”, mostrar una mini lista de “Cualificaciones recientes” con:

Cliente + objeto + fecha

Badge GO/NO GO

Botón “Abrir”

8) Reglas UX clave

Nada de cortar campos: scroll interno dentro de la pantalla/modal.

El veredicto GO/NO GO debe ser ultra visible.

Los campos extraídos son editables y deben tener indicador “extraído automáticamente”.

Si confidence = LOW, mostrar aviso:

“Confianza baja: revise campos clave antes de decidir.”