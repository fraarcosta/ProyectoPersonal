Quiero que modifiques exclusivamente el Portal de Activos y el Portal de Innovación con los siguientes cambios. Mantén todo lo demás exactamente igual (estructura, tabla, modal central, scroll interno, acciones, ZIP, persistencia, permisos, etc.).

✅ 1) PORTAL DE ACTIVOS — Cambios obligatorios
1.1 Clasificación del activo (cambiar completamente)

Ahora mismo la clasificación aparece con valores tipo “acelerador / framework / herramienta…”. Esto NO sirve y hay que eliminarlo.

Nueva regla:

Clasificación del activo debe ser un campo editable pensado para clasificar activos “de negocio/uso”, no por tipo genérico técnico.

Tienes 2 opciones válidas, elige una (recomendada la opción A):

Opción A (RECOMENDADA): desplegable + “Otro”

Campo “Clasificación del activo” como desplegable con valores estándar (distintos a acelerador/framework/herramienta).

Añadir opción “Otro”.

Si el usuario selecciona “Otro”, se habilita automáticamente un campo de texto para escribir la clasificación manual.

La clasificación manual queda guardada como valor del activo.

👉 Propon un set inicial de valores “orientados a uso” (no técnicos genéricos). Ejemplos de categorías válidas:

Automatización operativa

Observabilidad y monitoring

Gestión de servicios / ITSM

Seguridad y cumplimiento

Gobierno y reporting

Productividad / aceleración delivery

Datos y analítica

Integración / APIs

Arquitectura y calidad

IA aplicada (si procede)

Otro (manual)

Opción B: campo de texto directo

“Clasificación del activo” como campo de texto libre (sin desplegable).

Si implementas la opción A, el filtro de clasificación debe adaptarse (ver 1.4). Si implementas opción B, se elimina filtro y se usa búsqueda.

1.2 Estado del activo (ajustar estados)

Mantén la idea de “en desarrollo / desarrollado”, pero cambia “implementado en cliente” por un modelo de 3 estados claros:

En desarrollo

Desarrollado (sin implantación)

Implantado en cliente(s)

(Así queda claro si ya está construido pero aún no se ha aplicado, vs ya está en clientes).

1.3 Owners del activo (NO es input libre, es “colaboradores del activo”)

Ahora mismo el campo owners debe funcionar igual que el selector de colaboradores al crear una oportunidad, pero aplicado al activo.

Regla exacta:

Renombrar el campo a: “Colaboradores del activo (owners)” o similar.

Debe ser un buscador de usuarios por ID corporativo / nombre (autocomplete).

Permite añadir 1 o varios usuarios (chips/tags).

Persistente.

Estos colaboradores determinan quién puede editar el activo en la vista de consulta:

Editor + está en colaboradores → puede editar.

Editor + NO está → solo lectura.

Admin → puede eliminar y consultar; edición según regla que ya tengas definida (si quieres, Admin siempre puede editar).

1.4 Filtros del listado (clasificación)

Si has elegido Opción A (desplegable + Otro):

Mantén un filtro por clasificación con los valores existentes + “Otro”.

Si has elegido Opción B (texto libre):

Elimina el filtro por clasificación (no tiene sentido).

En ambos casos:

Mantener buscador general de texto.

Mantener filtro “Mis activos” (esto está bien).

1.5 Navegación: consultar al clicar la fila

En el listado de activos:

Al hacer click en cualquier parte de la fila, debe abrirse la vista/modal de Consultar activo (misma experiencia que el botón consultar, pero sin necesidad del botón).

El botón “Consultar” puede mantenerse o eliminarse, pero el comportamiento por click en fila debe existir.

✅ 2) PORTAL DE INNOVACIÓN — Cambios obligatorios
2.1 Click en fila para consultar

Igual que activos:

Click en cualquier fila de innovación → abre modal “Consultar innovación”.

2.2 Clasificación innovación: “Otro” debe permitir texto manual

Actualmente la clasificación te gusta, pero debe existir esta mejora:

“Clasificación de la innovación” debe ser un desplegable.

Debe tener opción “Otro”.

Si el usuario elige “Otro”, aparece un campo de texto para escribir la clasificación manual.

Ese valor queda guardado.

2.3 Owners innovación = colaboradores (igual que activos)

Cambiar owners por:

“Colaboradores de la innovación (owners)”

Buscador/autocomplete por usuarios corporativos (igual que colaboradores de oportunidad).

Multiusuario (chips).

Esto controla permisos de edición en consultar (mis innovaciones + edición).

✅ 3) Mantener intacto todo lo demás

No cambies:

Modal centrado + scroll interno

ZIP de “descargar todo”

Persistencia colectiva

Tabla, paginación, búsqueda

Permisos Lectura/Editor/Admin

Filtro “Mis activos” y “Mis innovaciones”