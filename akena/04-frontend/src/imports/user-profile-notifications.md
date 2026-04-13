Implementa el menú de perfil en la esquina superior derecha (avatar + nombre del usuario logueado). Al hacer click debe abrir un dropdown con estas opciones:

1) Contenido del dropdown

Configuración (opcional, puede quedar como “placeholder” por ahora, sin pantalla si no hay settings reales).

Cerrar sesión (obligatorio y funcional).

No incluir selector de idioma: la app queda fija en Castellano (no debe aparecer “Castellano” como opción interactiva ni desplegable de idiomas).

2) Cerrar sesión (flujo obligatorio)

Al pulsar Cerrar sesión:

Cerrar sesión real (invalidate token / limpiar sesión).

Limpiar estado de usuario actual en front (user context, permisos, caches en memoria).

Redirigir automáticamente a la pantalla inicial de login SSO (la pantalla del “single sign-on” donde meto credenciales para entrar con otra cuenta).

Debe ser imposible seguir navegando “atrás” para volver a una pantalla autenticada (proteger rutas y limpiar historial si aplica).

3) Persistencia y registro de perfiles (muy importante)

La aplicación debe guardar el histórico de perfiles que han iniciado sesión (local, no visible para el usuario):

Al iniciar sesión, registrar: userId/ID corporativo, nombre, rol si existe, timestamp de último login.

Esto es para trazabilidad y para que el sistema “sepa” qué perfiles han entrado (aunque el usuario haya cerrado sesión).

No mostrar este histórico en UI por ahora (solo persistencia interna).

Si un usuario vuelve a entrar, actualizar su último login.

4) Requisitos UI

Dropdown alineado bajo el avatar/nombre.

Cierra el dropdown al hacer click fuera.

Mantener consistencia visual corporativa (lila como color principal).

No tocar nada más de la navegación ni del header.

✅ PROMPT 2 — Notificaciones (campana) + “me han añadido a una oportunidad” (MVP)

Implementa la funcionalidad de notificaciones en el icono de campana del header (arriba derecha). De momento, solo necesitamos un caso de uso:
👉 notificar cuando un usuario es añadido como colaborador a una oportunidad.

1) Comportamiento visual (badge)

Si hay notificaciones no leídas, la campana debe mostrar un badge/puntito (o contador si lo prefieres).

Cuando el usuario abre el panel de notificaciones, NO se marcan todas como leídas automáticamente: solo se marcan como leídas cuando el usuario interactúa con ellas (ver punto 3).

2) Persistencia colectiva de notificaciones

Las notificaciones deben tener persistencia por usuario:

Se guardan asociadas al userId del usuario receptor.

Si el usuario refresca, cierra sesión o entra más tarde, las notificaciones siguen ahí.

Deben tener al menos estos campos:

id

userId receptor

tipo = OPPORTUNITY_ADDED

oportunidadId

oportunidadNombre

createdAt

readAt (null si no leída)

createdBy (quién lo añadió, si existe)

3) Panel de notificaciones (dropdown)

Al hacer click en la campana:

Abrir un dropdown/panel con listado de notificaciones (últimas primero).

Cada notificación debe mostrar:

Título: “Te han añadido a una oportunidad”

Subtítulo: nombre de la oportunidad + fecha/hora

Estado: no leída / leída (visual sutil)

Acciones por notificación:

Click en la notificación → marca como leída y navega a la oportunidad (abre esa oportunidad o la selecciona en el flujo que ya exista).

Botón opcional “Marcar como leída” (si quieres), pero con click ya vale.

4) Cuándo se genera la notificación

Cuando alguien añade un usuario a una oportunidad (módulo de colaboradores de oportunidad):

El backend debe disparar el evento “OPPORTUNITY_ADDED”.

Crear notificación para el usuario añadido.

En el frontend, si el usuario está logueado en ese momento:

actualizar badge en tiempo real (polling simple cada X segundos o websocket si ya existe; MVP: polling).

5) MVP estricto

No implementar otros tipos de notificaciones todavía.

No implementar preferencias de notificación.

No implementar idioma (castellano fijo).