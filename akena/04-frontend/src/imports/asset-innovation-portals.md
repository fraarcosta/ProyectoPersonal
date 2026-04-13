•	Crear Portal de Activos y Portal de Innovación (basado en Portal de Ventas)
El Portal de Activos y el Portal de Innovación deben replicar la misma lógica estructural, visual y de comportamiento que el Portal de Ventas:
•	Listado principal con tabla + filtros + paginación.
•	Botón “Nuevo” (Nuevo activo / Nueva innovación).
•	Modal central (no lateral).
•	Scroll vertical interno en el pop-up.
•	Persistencia colectiva.
•	Acciones: Consultar, Descargar todo, Eliminar (según permisos).
•	Sistema de permisos igual que Portal de Ventas (Lectura / Editor / Admin).
________________________________________
•	🟪 1️⃣ PORTAL DE ACTIVOS
•	1.1 Botón “Nuevo activo”
Al pulsar “+ Nuevo activo”, abrir modal central con scroll vertical interno.
•	🧾 Formulario — Campos
•	🔹 Sección 1 — Información del activo (OBLIGATORIOS)
•	Nombre del activo *
•	Responsable del activo *
(Persona responsable del desarrollo y ejecución técnica)
•	Descripción del activo *
•	Plan de desarrollo *
•	Solución tecnológica *
•	Objetivo del activo *
•	Impacto del activo *
•	Clasificación del activo *
→ Puede ser:
o	Acelerador
o	Framework
o	Herramienta
o	SaaS
o	Componente reutilizable
o	Otro
(Puede ser desplegable con opción “Otro” editable)
•	Estado del activo *
→ Estados:
o	En desarrollo
o	Desarrollado
o	Implementado en cliente
•	Versión del activo *
•	Tecnologías utilizadas * (campo multi-texto)
•	Documentación asociada * (pozo de documentación — múltiples archivos)
•	🔹 Campos opcionales
•	Presupuesto ejecutado
•	Owners del activo (multiusuario por ID Accenture)
→ Solo estos podrán editar el activo en modo consulta.
•	Clientes donde se ha implementado (multi-texto)
•	🔹 Botones
•	Guardar activo
•	Cancelar
Al guardar:
•	Se registra en Portal de Activos.
•	Se muestra en el listado.
•	Persistencia colectiva.
________________________________________
•	1.2 Listado de activos
•	🧾 Columnas
•	Nombre del activo
•	Clasificación
•	Estado
•	Acciones (Consultar / Descargar todo / Eliminar)
•	🔎 Filtros superiores
•	Buscador texto libre (busca en cualquier campo)
•	Filtro por clasificación
•	Filtro por estado
•	Filtro “Mis activos” (donde soy Owner)
•	📄 Acciones
•	🔹 Consultar
•	Abre modal central con scroll vertical interno.
•	Muestra todos los mismos campos del formulario.
•	Solo editable si:
o	Usuario es Editor
o	Y además es Owner del activo
•	Si no es Owner → solo lectura.
•	Admin puede eliminar.
•	🔹 Descargar todo
•	Descarga ZIP con:
o	Toda la documentación asociada al activo.
•	🔹 Eliminar
•	Solo visible para Admin.
________________________________________
•	🟪 2️⃣ PORTAL DE INNOVACIÓN
Replica estructura de Activos pero con estos campos:
•	2.1 Botón “Nueva innovación”
Modal central con scroll vertical interno.
•	🧾 Formulario — Campos (TODOS OBLIGATORIOS salvo indicación)
•	Nombre de la innovación *
•	Responsable *
•	Descripción *
•	Plan de desarrollo *
•	Solución tecnológica aplicada *
•	Objetivo *
•	Impacto conseguido *
•	Estado de la innovación *
(En desarrollo / Finalizada / Implementada / Escalada)
•	Presupuesto ejecutado *
•	Versión *
•	Owners de la innovación (multiusuario por ID)
•	Clasificación de la innovación *
•	Tecnologías utilizadas *
•	Cliente(s) donde se implementó * (multi-texto obligatorio)
•	Documentación asociada *
Botones:
•	Guardar innovación
•	Cancelar
Persistencia colectiva.
________________________________________
•	2.2 Listado de innovación
•	🧾 Columnas
•	Nombre de la innovación
•	Clasificación
•	Cliente
•	Estado
•	Acciones (Consultar / Descargar todo / Eliminar)
•	🔎 Filtros
•	Buscador texto libre
•	Filtro por clasificación
•	Filtro por estado
•	Filtro por cliente
•	Filtro “Mis innovaciones” (Owner)
•	📄 Consultar
•	Modal central con scroll vertical interno.
•	Mismos campos que el formulario.
•	Editable solo si:
o	Editor + Owner
•	Admin puede eliminar.
________________________________________
•	🟣 Reglas transversales (Activos e Innovación)
•	Modal SIEMPRE centrado (no lateral).
•	Scroll interno vertical obligatorio.
•	No cortar campos.
•	Permitir múltiples documentos.
•	Descargar todo genera ZIP estructurado.
•	Persistencia colectiva.
•	Owners definen quién puede editar.
•	Lectura → solo visualiza.
•	Editor → crea y consulta.
•	Admin → elimina y gestiona permisos.
