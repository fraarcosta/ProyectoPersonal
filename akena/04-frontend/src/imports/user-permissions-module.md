Implementar un módulo de “Configuración de permisos” (solo visible para Admins) que permita administrar los permisos de acceso a los tres portales corporativos:

Portal de Ventas

Portal de Activos

Portal de Innovación

El sistema debe mantener una persistencia centralizada de todos los usuarios que han iniciado sesión en Akena (ID corporativo + nombre), y asignarles un rol global para los portales: Lectura / Editor / Admin.

1) Registro y persistencia de usuarios (obligatorio)
1.1 Alta automática de usuarios

Cada vez que un usuario inicia sesión en Akena:

Debe registrarse automáticamente en una tabla persistente users (si no existía).

Campos mínimos:

userId (ID corporativo / identificador único)

displayName (nombre y apellidos)

role (Lectura | Editor | Admin)

lastLoginAt

createdAt

1.2 Rol por defecto

Por defecto, cualquier usuario nuevo debe entrar como Lectura.

Excepción: un conjunto de usuarios “keyscaptur” (admins predefinidos) deben entrar como Admin automáticamente.

Implementar esto con una lista configurable (ej: env var o config backend) de IDs admin iniciales.

Si el userId está en esa lista → role = Admin, si no → role = Lectura.

1.3 Persistencia y fuente de verdad

La fuente de verdad del rol debe ser backend (persistente).

El front solo renderiza la UI según el rol devuelto por backend al loguear.

2) Acceso al módulo “Permisos” (solo Admin)
2.1 Visibilidad del botón

El botón/menú “Permisos” (o “Configuración de permisos”) debe existir en los portales corporativos, pero:

Solo los usuarios Admin lo ven

Lectura y Editor no lo ven (no solo disabled: no renderizado).

2.2 Protección de ruta

Aunque intenten abrir la URL manualmente:

Backend debe bloquear si no es Admin (403).

Front debe redirigir y mostrar mensaje: “No tienes permisos para acceder a esta sección.”

3) Pantalla de Configuración de permisos (UI)
3.1 Tabla principal

Pantalla con una tabla con todos los usuarios registrados en Akena.

Columnas mínimas:

ID / Usuario (mostrar displayName y debajo userId)

Rol (Lectura | Editor | Admin)

3.2 Edición del rol

Solo Admin puede editar.

En cada fila:

Un desplegable editable con los 3 roles (Lectura / Editor / Admin).

Al cambiar, debe persistir en backend.

Mostrar feedback (toast): “Permiso actualizado”.

3.3 Búsqueda / filtro

Añadir buscador por nombre o ID en la parte superior.

No hace falta paginación si hay pocos, pero si hay muchos, añadir paginación simple.

4) Reglas de permisos por rol (MUY IMPORTANTE)

Estas reglas aplican a los tres portales. El rol es global (un solo rol gobierna los 3 portales).

4.1 Rol = LECTURA

Qué puede hacer:

Puede ver listados (tablas) y entrar en “Ver/Consultar” registros (ofertas / activos / innovaciones).

Puede crear nuevos registros:

Ventas: puede crear “Nueva oferta”

Activos: puede crear “Nuevo activo”

Innovación: puede crear “Nueva innovación”

Qué NO puede hacer (bloqueo UI + bloqueo backend):

No puede descargar documentación:

No puede descargar archivos individuales desde “Consultar”

No puede “Descargar ZIP” desde tabla

No puede editar registros existentes:

En “Consultar” los campos deben ser solo lectura, sin modo edición

No puede cambiar estado/resultado en ofertas

No puede eliminar registros:

El botón “Eliminar” no se muestra

Y backend lo prohíbe igualmente

4.2 Rol = EDITOR

Qué puede hacer:

Puede ver listados y consultar.

Puede crear nuevos registros (igual que Lectura).

Puede descargar documentación en los 3 portales:

Ventas: descargar archivos individuales y “Descargar ZIP”

Activos e Innovación: descargar documentación asociada

Edición condicionada por OWNERS (solo Activos e Innovación):

Activos:

Solo puede editar un activo si es owner/colaborador de ese activo

Si NO es owner → puede consultar y descargar, pero no ve “Editar”

Innovación:

Igual: solo puede editar si es owner/colaborador de esa innovación

Si NO es owner → consultar + descargar, sin editar

Ventas (ofertas):

Editor NO puede eliminar ofertas.

Editor puede consultar y descargar documentación.

Editor puede editar solo lo que ya definiste en consultar (por ejemplo estado/resultado) si eso estaba permitido para editor; si no lo estaba, bloquearlo.

Regla simple recomendada: Editor puede cambiar Estado/Resultado (y subir informes) pero NO eliminar.

4.3 Rol = ADMIN

Puede hacerlo todo:

Todo lo de Editor

Además:

Puede eliminar registros (ofertas / activos / innovaciones)

Ve el botón de “Permisos” y puede modificar roles de usuarios

Puede editar cualquier activo/innovación aunque no sea owner (opcional), pero como mínimo debe poder hacerlo todo (si prefieres mantener owners también para admin, entonces admin puede editar igual, pero sigue siendo admin para permisos; lo importante es que admin puede gestionar y eliminar).

5) Implementación obligatoria: control en UI + control en backend

No basta con ocultar botones:

Backend debe validar el rol en endpoints de:

descarga

edición

eliminación

configuración de permisos

Front debe:

ocultar botones según rol

deshabilitar/forzar modo solo lectura según rol

mostrar mensajes claros cuando algo no esté permitido

6) Reglas específicas de UI por portal
6.1 Portal de Ventas

Columna “Acciones”:

Lectura: NO mostrar botones (ni descargar, ni eliminar). Solo “Ver/Consultar” si existe navegación por fila; si la navegación por fila existe, permitida (solo lectura).

Editor: mostrar “Ver/Consultar” + “Descargar ZIP”. No mostrar “Eliminar”.

Admin: mostrar “Ver/Consultar” + “Descargar ZIP” + “Eliminar”.

Dentro de “Consultar oferta”:

Lectura: todo bloqueado (no cambia estado, no sube informes, no descarga docs).

Editor: puede descargar docs y puede editar estado/resultado si está permitido; puede subir informes si el estado lo exige.

Admin: igual que editor + delete.

6.2 Portal de Activos

Acciones:

Lectura: ver + crear nuevo activo. Sin descargar ni editar ni eliminar.

Editor:

Descargar siempre

Editar solo si es owner/colaborador del activo

No eliminar

Admin: descargar + editar + eliminar

En “Consultar activo”:

Botón “Editar” solo si:

Editor y es owner

o Admin

Descarga:

Editor y Admin sí

Lectura no

6.3 Portal de Innovación

Igual que Activos, con la diferencia de que en Innovación la documentación y cliente eran obligatorios, pero a nivel permisos es lo mismo:

Editor descarga siempre, edita solo si es owner

Admin todo

Lectura solo ver + crear

7) Owners/colaboradores (para condición de edición en Activos e Innovación)

Owners/colaboradores se basan en IDs de usuarios existentes en Akena.

La condición de edición para Editor:

currentUserId debe estar en owners[] del recurso.

Si no está:

no mostrar “Editar”

endpoint de edición debe devolver 403.

8) Criterios de aceptación (checklist)

 Cada login registra al usuario si no existe y asigna rol por defecto (Lectura) salvo admins predefinidos.

 Solo Admin ve y accede a “Permisos”.

 Tabla de permisos muestra todos los usuarios registrados y permite cambiar rol (solo Admin).

 Lectura: puede ver + crear, pero no descargar, no editar, no eliminar.

 Editor: puede descargar en todos; editar solo Activos/Innovación si es owner; en Ventas sin eliminar.

 Admin: puede todo y eliminar.

 Todas las restricciones se aplican en UI y backend.

 Persistencia garantizada (los roles no se pierden al refrescar).