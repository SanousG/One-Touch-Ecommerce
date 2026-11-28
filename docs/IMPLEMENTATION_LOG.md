# Historial de implementación

## Fases anteriores (resumen)

Fase 1: multi-tenancy y Better Auth. Fase 1.1: Docker. Fase 2A: catálogo. Fase 2B: tienda/carrito. Fase 3A: landings. Fase 3B: editor visual de flujos. Fase 4A: inventario, pedidos y adelantos. Sin frameworks de testing.

## Fase 4B — WasenderAPI, arquitectura multiproveedor y bandeja

### A. Resultado general

**Completo para el alcance definido.** Cada negocio puede registrar y verificar su propia conexión WasenderAPI; los webhooks autenticados persisten eventos y mensajes; la bandeja permite atender y responder; los módulos comerciales no dependen del proveedor; Meta queda registrado como futuro no disponible. No se enviaron mensajes reales a WhatsApp: no hay credenciales válidas ni autorización. No se implementó chatbot ni ejecución de diagramas.

### B. Archivos creados y modificados

**Creados**: migración `20261121165530_whatsapp_conversations`; `src/lib/whatsapp/{types,crypto,registry,connection-access,service,conversations,http,outbox}.ts`; `src/lib/whatsapp/providers/wasender/{client,adapter,mapper,webhook}.ts`; `src/app/api/admin/whatsapp/**`; `src/app/api/webhooks/whatsapp/wasender/[webhookId]/route.ts`; `src/app/api/admin/conversations/**`; `src/app/dashboard/configuracion/whatsapp/page.tsx`; `src/app/dashboard/conversations/page.tsx`; `src/components/whatsapp/{connections-manager,inbox-view}.tsx`; `worker/outbox.ts`; `docs/WHATSAPP_INTEGRATION.md`.

**Modificados**: `prisma/schema.prisma` (modelos WhatsApp, vínculo Order↔Conversation, modelo `OrderNumberSequence` para preservar la tabla manual), `src/lib/auth/permissions.ts`, `src/lib/commerce/service.ts` (contexto `conversationId`), `src/components/dashboard/sidebar.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/configuracion/page.tsx`, `Dockerfile`, `docker-compose.yml`, `.env.example`, documentación.

No se eliminaron datos ni volúmenes. MCP de Stitch intacto.

### C. Modelos y migraciones

Enums de conexión, conversación, mensaje, webhook y cola. Modelos: `WhatsAppConnection` (credenciales cifradas, webhookId opaco, externalSessionId único global), `WhatsAppContact` (PN/LID), `Conversation`, `ConversationMessage`, `ConversationEvent`, `WebhookEvent`, `OutboundMessage`. `Order.conversationId` vincula pedidos sin duplicar la lógica de la Fase 4A. `migrate` aplicó 8 migraciones correctamente.

### D. Funcionamiento del inventario/pedidos

Sin cambios funcionales; solo se añadió el vínculo opcional con la conversación de origen.

### E. Adaptador WasenderAPI

Endpoints documentados usados: `GET /api/status`, `GET /api/user`, `POST /api/send-message`. Firma de webhook por comparación directa del `X-Webhook-Signature` con el secreto, con `timingSafeEqual`. Eventos mapeados y estados 0–5 a estados internos.

### F. Configuración y seguridad

Solo OWNER crea/actualiza/verifica/desconecta. Credenciales cifradas en reposo; DTOs sin secretos; unicidad de sesión externa por tenant. Las conexiones con credenciales inválidas nunca se marcan `CONNECTED`.

### G. Webhooks y envío

Webhook firmado, durable, idempotente y con payload sanitizado. La cola saliente se procesa en el worker con claim atómico; un timeout se marca como incierto y no se reenvía ciegamente.

### H. Bandeja

Tres columnas (lista, historial, contexto), filtros, no leídos, tomar/transferir/resolver/reabrir, envío manual y creación de pedido precargado. Actualización cada 6 s.

### I. Validaciones reales y resultados

| Validación | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores, 0 advertencias |
| `npm run typecheck` | ✅ sin errores |
| `npm run build` | ✅ 64 rutas, sin errores |
| `docker compose up -d --build` | ✅ 8 migraciones; app, db y worker activos |
| Catálogo multiproveedor | ✅ Wasender disponible, Meta próximamente |
| Crear conexión y no exponer secretos | ✅ |
| Credenciales inválidas rechazadas | ✅ 502; no marcó conectada |
| Sesión externa duplicada entre tenants | ✅ 409 |
| Webhook con secreto incorrecto | ✅ 401 |
| Evento entrante válido | ✅ persistido |
| Evento repetido | ✅ deduplicado |
| Identidad LID | ✅ conservada sin conversión |
| Grupos/canales | ✅ ignorados |
| SKU BLR30K identificado en contexto | ✅ desde catálogo real |
| Aislamiento de conversaciones y conexiones | ✅ 404 |
| Tomar/transferir/resolver | ✅ 200 (OPERATOR permitido) |
| OPERATOR no crea conexiones | ✅ 403 |
| Encolado sin conexión conectada | ✅ 409 |
| Encolado con estado simulado conectado | ✅ 201; worker procesó con credencial inválida → FAILED |
| `messages.update` → READ | ✅ mapeado y verificado en BD |
| `session.status` | ✅ estado del proveedor reflejado |
| Payload sin `sessionId` sensible | ✅ verificado en BD |
| Credenciales cifradas en reposo | ✅ formato `v1:`, sin texto plano |
| Pedido desde conversación | ✅ 201 y vinculado |
| Dashboard con pendientes y estado reales | ✅ |
| Persistencia tras rebuild | ✅ 2 conexiones, 4 conversaciones, 5 mensajes, 9 webhooks, 1 saliente |
| Envío real a WhatsApp | ⚠️ no ejecutado (sin credenciales ni autorización) |
| Interacción visual de arrastre/clic en navegador | ⚠️ pendiente (validación HTTP y HTML únicamente) |

### J. Estado de Docker

`app` y `db` healthy; `worker` activo; `migrate` completado. Sin volúmenes borrados.

### K. Problemas encontrados

1. Prisma quiso eliminar `order_number_sequences`: se declaró como modelo para conservarla.
2. Worker reiniciaba por importar `next/navigation` vía `catalog/service.ts`: se aisló `connection-access.ts`.
3. `messages.update` inicialmente se ignoraba: se corrigió pasando `data` con `key` y `update`.
4. El envío con credenciales inválidas terminó en `FAILED`: comportamiento esperado, reportado como local no real.

### L. Decisiones

Ver `docs/WHATSAPP_INTEGRATION.md`. Multiproveedor, cifrado autenticado, cola durable y aislamiento por tenant.

### M. Estado de Git

Commit de Fase 4B con mensaje «Fase 4B: WasenderAPI y bandeja de conversaciones». `.env`, volúmenes e imágenes fuera del repositorio.

### N. Pendientes para la Fase 4C

Chatbot, clasificación de intenciones, ejecución de diagramas, adjuntos salientes con URLs temporales, expiración de reservas y verificación automática de pagos. No se implementaron aquí.

---

## REPORTE FASE 4B.1 — Validación real de WasenderAPI

**Estado: NO APROBADO en su criterio real.** El código quedó auditado y corregido, y las verificaciones **locales** pasan, pero **no se ha ejecutado ninguna prueba con una sesión real autorizada de WasenderAPI**. No existe hoy ninguna credencial real, ni HTTPS público autorizado para el webhook, ni aprobación para enviar mensajes, ni destinatario autorizado. No se activó Cloudflare Tunnel ni se expuso el servicio. No se avanzó a Fase 4C.

### A. Auditoría del código vigente

Se revisaron los archivos de la Fase 4B y la documentación oficial de WasenderAPI (`api-docs`, `webhook-setup`, `webhook-message-sent`, `send-text-message`, `get-whatsapp-session-status`, `get-session-user-info`, `rate-limits`). Conclusión: la arquitectura es correcta y no se reescribió. Se encontraron y corrigieron estos defectos que afectaban la operación segura:

1. **Número verificado no se persistía.** `GET /api/user` devuelve el número real de la sesión, pero `verifyConnection` solo lo comparaba con el número esperado y no lo guardaba. Se añadió el campo `verifiedPhone` (migración `20261122023151_whatsapp_verified_phone`), se expone en el DTO y se muestra en la UI como «esperado / verificado» para que el usuario confirme visualmente que la cuenta es la del negocio activo.
2. **`message.sent` se ignoraba.** El payload real de confirmación de envío trae `{ key, message, success }` y no `update`/`status`. Se añadió un *fallback* al código de estado (`success === true` → `2/SENT`, `false` → `0/ERROR`) y se sanea el campo `success` para no perderlo al persistir.
3. **Deduplicación incompleta en `messages.upsert`.** La clave de dedupe usaba solo el primer `externalId`, por lo que un evento con varios mensajes podía descartar los restantes como duplicado. Ahora se usan **todos** los ids ordenados del evento (con *fingerprint* como reserva) y se limita la longitud de la clave.
4. **Sin recuperación de eventos fallidos.** Se añadió `GET/POST /api/admin/whatsapp/webhooks` para listar y reintentar `WebhookEvent` en estado `FAILED`, sin borrar el registro original y sin reenviar ciegamente: se reprocesa desde el payload sanitizado guardado. El reintento es idempotente (usa la misma lógica de ingesta).
5. El payload saneado para reintento se reconstruye sin anidar dos veces el objeto `data`, y `success` se conserva.

### B. Verificaciones LOCALES ejecutadas (no son prueba real)

| Verificación | Resultado |
|---|---|
| `npm run lint` / `npm run typecheck` / `npm run build` | OK, sin errores |
| `docker compose up -d --build` | OK; 9 migraciones aplicadas; `app` y `db` healthy, `worker` activo |
| Campo `verifiedPhone` persistido y expuesto | OK (migración aplicada, DTO y UI actualizados) |
| `message.sent` con `success=true` | OK → mensaje en estado `SENT`, `providerStatus=2` |
| `message.sent` con `success=false` | OK → estado de error, sin duplicar |
| Deduplicación con varios ids en un evento | OK, clave construida con todos los ids |
| Listado de webhooks fallidos | OK |
| Reintento controlado de un evento `FAILED` insertado localmente | OK: `attempted=1`, `recovered=0`, `stillFailed=0`, lista de fallidos quedó vacía |
| Ausencia de duplicados tras el reintento | OK: 0 mensajes con el id del evento reintentado |
| Datos de validación preexistentes conservados | OK: 2 conexiones, 4 conversaciones, 6 mensajes, 10 webhooks procesados, 0 fallidos |
| Firma inválida / credenciales inválidas / sesión duplicada (4B) | OK (401 / 502 / 409) |
| Cifrado AES-256-GCM en reposo y payload sin secretos (4B) | OK |

Todos los mensajes y webhooks anteriores son de **validación con credenciales falsas**. Ninguno constituye un mensaje real de WhatsApp.

### C. Validaciones REALES pendientes (criterio de aceptación de 4B.1)

Requieren intervención del usuario; **no se ejecutaron**:

1. Introducir la Session API Key y el Webhook Secret reales **directamente** en `/dashboard/configuracion/whatsapp` (nunca en OpenCode, logs ni documentación) y usar «Guardar y verificar».
2. Confirmar que el número devuelto por `GET /api/user` (campo `verificado` en la UI) coincide con el negocio activo; de lo contrario, no operar.
3. Configurar un `WHATSAPP_WEBHOOK_BASE_URL` HTTPS público **autorizado** y comprobar la URL exacta que muestra la plataforma antes de registrarla en WasenderAPI. No se activó túnel ni exposición pública.
4. Con un segundo teléfono autorizado, escribir al número conectado y verificar en la bandeja: tenant correcto, mensaje único (sin duplicados), firma válida y **ninguna respuesta automática**.
5. Obtener aprobación explícita y un destinatario autorizado; solo entonces responder manualmente y confirmar: encolado en `OutboundMessage`, procesamiento por el worker, aceptación por el proveedor, recepción real por el cliente y estados coherentes sin duplicados.
6. Comprobar **visualmente en navegador** los siete puntos: configuración, estado de conexión, lista de conversaciones, historial, tomar, responder, transferir y resolver. No se declarará aprobado si no se comprueba personalmente.

### D. Estado actual y seguridad

- Sin credenciales reales en la base de datos; `WHATSAPP_WEBHOOK_BASE_URL` HTTPS configurada para la validación local (ver sección F).
- Sin envíos reales; la aprobación y el destinatario autorizado fueron confirmados por el usuario, pero **no se ejecutó ningún envío** porque aún no existe conexión real.
- Los secretos nunca se imprimen: la UI los solicita en el formulario de conexión; `.env` está fuera del repositorio.
- No se borraron volúmenes, datos ni migraciones; no se modificó otro proyecto; el túnel lo activó el usuario de forma autorizada (Opción A: validación local).
- Cambios de esta fase pendientes de commit en el árbol de trabajo (no se hizo commit para no mezclarlos con una validación real aún no ejecutada).

### E. Conclusión

La Fase 4B.1 queda **abierta a la espera de la sesión real autorizada**. El código está listo y auditado; las verificaciones locales pasan. El criterio de aceptación real —mensaje entrante en la bandeja correcta y respuesta manual recibida por el cliente sin duplicados— **no puede declararse cumplido** sin los pasos de la sección C. No se implementó chatbot, IA, pedidos automáticos, pagos ni Meta, y no se inició la Fase 4C.

### F. Migración de la base de datos de desarrollo a Supabase (Opción A)

Se cambió el entorno de validación local de PostgreSQL en contenedor a **Supabase**, conservando el volumen local intacto y sin borrar datos ni migraciones.

- **Hallazgo:** `docker-compose.yml` construía `DATABASE_URL` desde `POSTGRES_*` apuntando a `db:5432`, sobrescribiendo cualquier valor de `.env`. Por eso cambiar la variable en `.env` no tenía efecto. Se ajustó la línea a `DATABASE_URL: "${DATABASE_URL}"` para que Compose inyecte directamente la URL configurada.
- **TLS:** el adaptador `@prisma/adapter-pg` trata `sslmode=require` como verificación completa y rechazó un certificado autofirmado en la cadena (proxy/inspección HTTPS). Se agregó `uselibpqcompat=true` a la cadena de conexión en `.env`; con eso la conexión funciona. No se desactivó TLS.
- **Estado verificado:** 9 migraciones aplicadas (incluida `verifiedPhone`), 30 tablas, 1 tenant y 1 usuario creados por el seed. Sin conexiones WhatsApp, conversaciones ni mensajes: el entorno está limpio para la validación real.
- **Webhook:** se configuró `WHATSAPP_WEBHOOK_BASE_URL` apuntando al túnel ngrok que el usuario activó y autorizó (`ngrok http 3000`). Se comprobó de extremo a extremo que una petición pública al webhook llega a la app y que una firma inválida recibe `401`. No se activó ningún túnel desde OpenCode ni se expuso el servicio sin autorización.
- Las credenciales de la base de datos no se registraron en logs, documentos ni reportes; la URL de conexión solo existe en `.env` (gitignoreado).

### G. Flujo de conexión por QR (nuevo)

Se agregó la opción **«Conectar con QR»** en `/dashboard/configuracion/whatsapp`, reutilizando el patrón ya implementado por el usuario en `One-Touch-test` pero adaptado a esta arquitectura multiproveedor y con cifrado de credenciales.

- El PAT de cuenta (`WASENDER_PERSONAL_ACCESS_TOKEN`) se validó contra `GET /api/whatsapp-sessions` (**HTTP 200, success true, 2 sesiones en la cuenta**). Se guardó en `.env` y se inyecta al contenedor; nunca se imprimió su valor.
- Se agregaron los métodos opcionales `createSession` / `getQrSession` a `WhatsAppProvider` y su implementación en `providers/wasender/sessions.ts` (crear sesión, connect, QR con normalización de claves y formatos, y status). El QR se convierte a data-URI PNG **localmente** (`qr-image.ts`), sin servir externos.
- `service.ts` ahora tiene `createConnectionFromQr` y `refreshQrConnection`: crean la sesión, guardan `api_key`/`webhook_secret` cifrados, registran el webhook con el `webhookId` opaco, y al detectar `connected` guardan `verifiedPhone` y marcan `CONNECTED`. Importante: la UI **no pide secretos**; el usuario solo teclea nombre y número.
- Rutas nuevas: `POST /api/admin/whatsapp/sessions` y `GET /api/admin/whatsapp/sessions/[id]`, ambas con `assertConnectionAdmin` y aislamiento por tenant.
- UI: botón «Conectar con QR», modal con nombre/número, imagen del QR y polling (1.5 s / 4 s, máx. 75 intentos, pausa si pestaña oculta). El registro manual de sesiones existentes fue retirado a pedido del usuario.
- Se agregó la acción **«Eliminar»** por conexión (confirmación en modal) junto a «Guardar y verificar» y «Desconectar». El endpoint `DELETE /api/admin/whatsapp/connections/[id]` borra la conexión y, por cascada del esquema, sus contactos, conversaciones, mensajes, eventos webhook y mensajes salientes; si la conexión eliminada era principal, promueve otra del tenant.
- El borrado también intenta eliminar la sesión en WasenderAPI mediante `DELETE /api/whatsapp-sessions/{id}` (método opcional `deleteSession` del proveedor, con el PAT solo en servidor). Si la eliminación remota falla, el borrado local continúa para no dejar la conexión atascada. Se agregó `deleteWasenderSession` en `sessions.ts`.
- **Limpieza real ejecutada:** se eliminó la sesión huérfana `134775` («Ecommerce - Yeltsin», `logged_out`) que quedó en Wasender tras borrar su conexión local. Respuesta HTTP 204; verificado que ya no aparece.
- **Renovación de QR:** se agregó el botón **«Generar nuevo QR»** en el modal de vinculación, que llama a `POST /api/admin/whatsapp/sessions/[id]/regenerate`. El proveedor ejecuta `POST /api/whatsapp-sessions/{id}/restart` (respaldos: `connect`, `qr-code`, `qr`, `qrcode`) y devuelve un QR fresco convertido a PNG local. Para recuperar el modal de una conexión pendiente tras recargar la página, se agregó el botón **«Ver QR»** en la tarjeta de cada conexión no conectada. El polling conserva el QR mostrado si el proveedor no devuelve uno nuevo de inmediato.
### AU. Estado «Publicado» se actualiza sin recargar

El usuario reportó que al publicar debía recargar para ver el cambio. El editor mostraba el estado desde la prop `flow` del servidor. Se añadió estado local (`published`, `hasUnpublishedChanges`) actualizado con la respuesta de guardar/publicar y `router.refresh()` en ambas acciones. `lint`, `typecheck`, `build` y Docker OK.

### AT. Motor de flujos: el cliente entra automáticamente

Se conectó el webhook con el diagrama publicado. `handleIncomingMessage` devuelve `{conversationId, body, created}`; `ingestWebhook` llama (import dinámico) a `runFlowEngine` solo para mensajes entrantes nuevos y no `fromMe`.

- `src/lib/flows/runtime.ts`: resuelve el producto desde `Conversation.context.products` (lo genera `identifyProducts` al detectar el SKU en el mensaje del CTA `wa.me`), carga `getPublishedFlowForProduct` y recorre START → MESSAGE/CHECKOUT → DECISION → GLOBAL_FLOW → END con `sourceHandle`.
- Envía las plantillas del snapshot usando `sendTemplateMessage` (texto + foto/video según el adjunto real); las decisiones se envían como texto y se espera la respuesta: acepta el número de opción (1..n, 0 = fallback) o el texto de la etiqueta. Estado guardado en `Conversation.context.flow` (`frames` para flujos globales, `status` ACTIVE/WAITING_DECISION/DONE) y `mode` BOT/HUMAN.
- El envío usa `OutboundMessage`; el worker Wasender existente hace la entrega con reintentos. Los ecos `fromMe` se reconcilian y no reinician el flujo.
- `getPublishedFlowForProduct` ahora devuelve también `templates` y `globalFlows`; se añadió `getPublishedFlowById`.
- **Verificado:** `lint`, `typecheck`, `build` y Docker OK. **Pendiente de validación real:** el disparo con un mensaje entrante que contenga un SKU y un flujo publicado (no se envió ningún mensaje real a un contacto).

### AS. Corrección al crear flujos con Supabase

El usuario reportó «No se pudo completar la operación» al crear un flujo. Los logs mostraron primero `P2028` (transaction timeout de 5 s) y luego `timeout exceeded when trying to connect`: la transacción de `createFlow` contenía `uniqueSlug()`, que usa `getPrisma()` fuera de `tx`; con el pooler limitado a 1 conexión eso bloqueaba la transacción.

- Se movió `uniqueSlug` **antes** de `$transaction` y se subió el timeout de las tres transacciones de flujos (`createFlow`, `saveFlowDraft`, `publishFlow`) a 30 s (`maxWait`/`timeout`).
- Verificado: `POST /api/admin/flows` con flujo global temporal → **201** y borrado posterior; `lint`, `typecheck`, `build` y Docker OK.

### AR. conversión también de audio/mp4

El navegador del usuario entregó `audio/mp4` y Wasender respondió «File type 'audio/mp4' is not supported». Se generalizó `convertAudioToOgg` para WebM, MP4, M4A y WAV (antes solo WebM) y el nombre del archivo pasa a `.ogg` en todos esos casos. Verificado: conversión MP4/AAC→OGG en el contenedor (10055 bytes de salida), `lint`, `typecheck`, `build` y Docker OK.

### AQ. conversión WebM→OGG para audio grabado

Tras normalizar el MIME, Wasender devolvió HTTP 400 y la UI mostraba el genérico «No se pudo completar la operación». El error real (`Error no controlado en WhatsApp: HTTP 400`) confirmaba que el proveedor rechazaba el WebM/Opus de `MediaRecorder` (Wasender acepta AAC/MP3/OGG/AMR).

- Se instaló `ffmpeg` en la imagen base del Dockerfile y se añadió `convertWebmToOgg` (spawn, stdin/stdout en memoria, límite 32 MB) en `src/lib/whatsapp/audio-conversion.ts`.
- `sendAudioMessage` convierte `audio/webm` a `audio/ogg` antes de subir a Wasender y guardar la copia; el nombre pasa a `.ogg`.
- `whatsappErrorResponse` ahora propaga errores de proveedor con `status` HTTP 400-599 y `extractMessage` lee `message/error/msg/detail/data.errors` para no mostrar solo «HTTP 400».
- Verificado: `lint`, `typecheck`, `build` y Docker OK; `ffmpeg` presente en el contenedor y conversión WebM→OGG probada (9113 bytes de salida). Sin envío real a un contacto.

### AP. Corrección: audio grabado con MIME con parámetros

El usuario reportó «Formato de audio no soportado» al grabar. `MediaRecorder` entrega MIME con codecs (p. ej. `audio/webm;codecs=opus`) y la validación exigía el MIME exacto. Se normaliza en el cliente al crear el `File` y en `sendAudioMessage` (quitar parámetros y minúsculas) antes de validar, subir a Wasender y guardar la copia. El mensaje de error ahora incluye el MIME recibido. `lint`, `typecheck`, `build` y Docker OK.

### AO. Composer unificado: texto + imagen/video en un solo mensaje

El usuario corrigió la interacción: no quiere el adjunto en una fila aparte con otro botón «Enviar». Ahora hay **una sola caja** estilo WhatsApp:

- El texto escrito es el **pie** del archivo. Un solo botón «Enviar» llama a `.../image` o `.../video` con `caption=draft`, produciendo **un mensaje** (burbuja con adjunto + texto), o a `.../messages` si no hay archivo.
- «Plantilla» ya no envía por su cuenta: **carga** el contenido en la caja y descarga su adjunto desde Drive para dejarlo listo; el usuario lo envía con el mismo botón.
- «Audio» ya no sube un archivo: usa `getUserMedia` + `MediaRecorder` para grabar desde el **micrófono**, con temporizador, Detener/Cancelar y envío **solo de audio** (sin texto). Se ampliaron los MIME permitidos con `webm/mp4/m4a/wav` según lo que entregue el navegador.
- `sendTemplateMessage` también quedó como un único mensaje (texto como pie del adjunto) en vez de texto + adjunto separados.
- **Verificado:** `lint`, `typecheck`, `build` y Docker OK; el bundle contiene el composer unificado y ya no contiene los botones/fila anteriores. Sin envíos reales.

### AN. Botón «+» en la bandeja con imagen, video, audio y plantilla

A pedido del usuario se reemplazó el icono de adjunto por un botón «+» que despliega un menú con **Imagen, Video, Audio y Plantilla**. La plantilla abre el selector existente dentro del composer; los archivos abren un selector filtrado por tipo.

- **Audio:** Wasender confirma `audioUrl` (AAC/MP3/OGG/AMR, ≤16 MB). Se añadió `sendAudio` al contrato del proveedor, `capabilities.audio`, ruta en el outbox para `kind=AUDIO`, `sendAudioMessage`, `POST /api/admin/conversations/[id]/audio` y burbuja `<audio controls>` en la bandeja.
- **Verificado:** `lint`, `typecheck`, `build` y Docker OK; audio inválido → 400 sin subir ni encolar; las cuatro opciones y el menú están en el bundle cliente. No se enviaron mensajes reales.

### AM. Enviar plantillas al chat y soporte de video en Wasender

- **Proveedor:** Wasender confirma `POST /api/send-message` con `videoUrl` (MP4/3GPP, ≤50 MB). Se añadió `sendVideo` al contrato `Provider`, `capabilities.video` y el adaptador (`{to, text, videoUrl}`); el outbox enruta `kind=VIDEO` a `sendVideo`.
- **Bandeja:** nueva API `POST /api/admin/conversations/[id]/template` envía primero el texto de la plantilla y después su adjunto (foto o video) como mensajes separados y en orden; valida formato/tamaño antes de encolar para no enviar a medias. `POST .../video` permite adjuntar video propio con pie opcional.
- **UI:** el composer acepta foto o video, muestra el video en la burbuja con controles y agrega un selector «Elegir plantilla…» con botón «Enviar plantilla». Los videos WebM/MOV se rechazan al enviar con mensaje claro (Wasender solo MP4/3GPP).
- **Verificado:** `lint`, `typecheck`, `build` y Docker OK; plantilla inexistente → 404, archivo inválido → 400, las opciones de plantilla llegan al HTML de la bandeja. **No se envió ningún mensaje real**: Supabase no tiene conversaciones ni hay destinatario autorizado; queda pendiente la validación real con el usuario.

### AL. Adjunto propio (foto/video) en plantillas

El usuario pidió reemplazar el selector «recursos del negocio» por subida de su propio archivo. Se eliminó el uso de `ProductImage` para plantillas nuevas y se añadió:

- **BD:** migración `20261127140000_template_media_uploads` con tabla `template_media` (Drive `storageKey`, mime, tamaño, tenant) y `message_templates.mediaId` (FK `ON DELETE SET NULL`). 14 migraciones aplicadas.
- **Storage:** `saveTemplateMedia` en `product-images.ts` valida JPEG/PNG/WebP ≤5 MB o MP4/WebM/MOV ≤50 MB con firma de bytes y sube a `OneTouch/.../Plantillas/<tenant>` en Drive. Errores de validación mapeados a HTTP 400.
- **API:** `POST /api/admin/templates/media` (multipart) sube y devuelve `{id,url,mimeType,fileName}`; `GET /api/admin/templates/media/[id]/file` sirve bytes con `Range`/206 y auth de tenant; `DELETE /api/admin/templates/media/[id]` borra en Drive. Plantillas creadas/actualizadas con `mediaId`; al quitar o reemplazar el adjunto se limpia el archivo anterior si ya no está en uso. Plantillas antiguas con `imageId` siguen legibles.
- **UI:** el modal tiene input de archivo propio, estado «Subiendo a Drive…», botón Quitar y vista previa inmediata (foto o `<video controls>`) en la burbuja de WhatsApp. La tabla muestra FOTO/VIDEO.
- **Verificado:** `lint`, `typecheck`, `build` y Docker OK; subida PNG → 201 y archivo servido 200 `image/png`; plantilla con media → DTO correcto; borrar media en uso → 409; al quitarlo se limpia solo; tipo inválido → 400. Datos de prueba eliminados (0 plantillas y 0 archivos de prueba).

### AK. Módulo de Tipos de plantilla en Configuración

A pedido del usuario («como categoría, para agregar más tipos») los tipos dejaron de ser un enum fijo y pasaron a un catálogo editable por negocio:

- **BD:** migración `20261127130000_template_types_catalog`: tabla `template_types` (tenantId, name, slug, description, isSystem, único por tenant+slug), `message_templates.type` convertido de enum a texto (sin perder plantillas existentes) y seed de los 10 tipos predeterminados por tenant. El servicio además los garantiza en cada tenant nuevo (`ensureDefaultTemplateTypes`). 13 migraciones aplicadas.
- **API:** `GET/POST /api/admin/template-types` y `PATCH/DELETE /api/admin/template-types/[id]`, con `flowErrorResponse`. Los tipos predeterminados no se pueden editar ni borrar; borrar un tipo en uso responde 409; `checkout`/`message` están reservados.
- **UI:** nueva tarjeta «Tipos de plantilla» en Configuración, con listado, badge «Predeterminado», alta, edición y baja de tipos propios. Plantillas y bloques Mensaje leen el catálogo (los tipos nuevos aparecen en el selector).
- **Verificado:** `lint`, `typecheck`, `build` y Docker OK; los 10 tipos sembrados; crear tipo «Recordatorio» → 201; plantilla con ese tipo → 201; tipo en uso → 409; tipo libre → 200; tipo inválido en plantilla → 400. Datos de prueba eliminados, sin dejar residuos.

### AJ. Plantillas de mensaje: más tipos, contenido amplio, emojis, multimedia y preview

A pedido del usuario se amplió `/dashboard/templates`:

- **Tipos:** el enum `TemplateType` pasó de 2 a 10 valores (`MESSAGE`, `CHECKOUT`, `GREETING`, `PRODUCT`, `PROMOTION`, `FOLLOW_UP`, `CONFIRMATION`, `DELIVERY`, `THANKS`, `FAQ`). Migración `20261127120000_expand_template_types` aplicada en Supabase (12 migraciones). Los bloques Mensaje de los flujos aceptan todos los tipos excepto Checkout; los bloques Checkout siguen exigiendo Checkout.
- **Contenido:** textarea de 12 filas / 220 px mínimo con contador (`/ 4000 caracteres`, límite existente del servidor) y barra de 12 emojis insertables. El servidor ya permitía emojis ( solo rechaza HTML).
- **Multimedia:** el selector de adjuntos usa los archivos del catálogo con etiqueta 🖼️ FOTO / 🎬 VIDEO y sirve las URLs por `/api/admin/products/images/[id]/file` (funciona con Drive/Range).
- **Preview:** panel lateral con burbuja estilo WhatsApp (hora y doble check) que muestra texto y foto/video adjuntos en vivo.
- **DTO:** `TemplateDTO.imageMimeType` nuevo para distinguir foto/video en la tabla.
- **Verificado:** `lint`, `typecheck`, `build` y Docker OK; los 10 tipos y el preview están en el bundle cliente; `POST /api/admin/templates` con tipo inválido → 400; con `GREETING` + emoji → 201 (plantilla de prueba eliminada después). Sin secretos en logs ni docs.

### AI. Miniatura del video sin foto de portada

El usuario pidió que la miniatura del video **no muestre la primera foto**, sino un fondo negro que indique claramente que es video. Se eliminó el `<img>` con `poster` en ambos selectores (editor de producto y selector de foto principal de la landing); ahora es un bloque `bg-slate-900` con círculo ▶ y etiqueta VIDEO. **Verificado en HTML de ambas rutas:** fondo oscuro y etiqueta presentes, sin `img` de "Video del producto". `lint`, `typecheck`, `build` y Docker OK.

### AH. Video en el selector de foto principal de la landing

El usuario mostró DevTools y el 404 de favicon, pero el problema real era otra pantalla: `/dashboard/landings/[id]` (editor de landing), no el editor de producto. Su selector «Fotografía principal» seguía renderizando `<img>` para todos los archivos, incluido el video. Se corrigió: los videos ahora se muestran como miniatura oscura con «▶» y etiqueta VIDEO, **no se pueden elegir como portada** (la portada debe ser foto) y se añadió una nota indicando que el video aparece en la galería. **Verificado en HTML:** miniatura, etiqueta y nota presentes en el editor de landing. `lint`, `typecheck`, `build` y Docker OK.

### AG. Miniatura de video: fallback antihíbrido

El usuario siguió viendo el icono roto. El `src` de la miniatura respondía 200 y el HTML del editor ya era el nuevo, así que se reforzó: fondo degradado oscuro en la tarjeta, `onError` que oculta el `<img>` si falla (evita el icono roto) y query `?v=2` para forzar recarga del navegador. **Verificado en HTML:** las tres marcas presentes. Si persiste, es caché local: recarga fuerte o ventana de incógnito.

### AF. Miniatura de video en el editor

A pesar del `<video>` con `poster`, el usuario seguía viendo un icono de imagen rota en la tarjeta del editor. Se reemplazó el reproductor de la tarjeta por una **miniatura `<img>`** (usa la primera foto del producto como portada) con círculo «▶» y etiqueta «VIDEO». El video se reproduce en la galería de la landing. **Verificado en HTML:** `alt="Video del producto"`, overlay y etiqueta presentes. Recarga fuerte recomendada.

### AE. Galería integrada en la foto de portada

El usuario pidió que las miniaturas estén **debajo de la foto principal**, no en una sección aparte, y que al seleccionarlas cambie la imagen/video manteniendo el tamaño. Se creó `HeroMedia` (cliente) que reemplaza el bloque de imagen del hero: archivo principal (foto o video) con la altura/esquinas configuradas y miniaturas cuadradas debajo; respeta `imageFit`, `object-position`, zoom y el interruptor `showGallery`. Se eliminó la sección separada «Galería del producto» y el componente `ProductMediaGallery`. Además se añadió `poster` al video en el editor (usa la primera foto) para que no parezca roto. **Verificado:** landing sin sección separada, 3 miniaturas y `<video>`; editor con `<video poster>` e insignia «▶ VIDEO». `lint`, `typecheck`, `build` y Docker OK.

### AD. Reproducción de video y galería con miniaturas

El usuario reportó que el video parecía roto y que la galería se veía fea. Causas: el endpoint de archivos no soportaba peticiones `Range` (necesarias para `<video>`) y el editor usaba la URL pública del producto. Se agregó `fileResponse` con soporte 206/`Accept-Ranges` en `/api/images/[id]/file` y `/api/admin/products/images/[id]/file`; el editor y `ImageManager` ahora usan la ruta admin. La galería se rediseñó con `ProductMediaGallery`: **un archivo grande** (foto o video con controles) y **miniaturas cuadradas abajo**; al hacer clic en una miniatura cambia el archivo principal manteniendo el mismo tamaño. **Validado:** petición con `Range` devolvió 206 con `Content-Range: bytes 0-99/1513047`; la landing mostró 3 miniaturas y `<video>`. `lint`, `typecheck`, `build` y Docker OK.

### AC. Video en el editor: apariencia de error

El usuario vio una tarjeta con icono de imagen rota en «Fotografía principal». La causa era HTML del editor anterior al despliegue: las tres URLs respondían 200 (`image/jpeg`, `image/jpeg`, `video/mp4`). Se verificó que el editor actual renderiza `<video>` y la opción «Añadir video», y se añadió una insignia «▶ VIDEO» sobre el reproductor para evitar confusión. Recomendación: recarga fuerte (Ctrl+Shift+R).

### AB. Videos de producto y galería en la landing

El usuario pidió subir video al producto y mostrar todas las fotos/video en la landing.

- `saveProductVideo` en `storage/product-images.ts`: MP4/WebM/MOV hasta 50 MB, valida firma y guarda en Drive (`Productos/<tenant>/videos`). `addProductImage` detecta `video/` y elige el guardado correcto; los videos nunca son portada y `setCoverImage` los rechaza.
- Editor de producto: nueva opción «Añadir video» junto a «Añadir foto»; las tarjetas muestran `<video controls>` para videos y ocultan la acción de portada.
- `StoreImageDTO` y `publicProductInclude` ahora incluyen `mimeType`; `adminToStoreProduct` lo propaga al editor de landing.
- Landing: nueva sección «Galería del producto» con todas las fotos en cuadrícula (`object-contain`, sin recorte) y el video grande con controles. Interruptor `showGallery` en Diseño y Opciones (por defecto activo).
- **Validado en vivo:** se subió un MP4 real de 788 KB, se guardó como `video/mp4` con `isCover=false`, la landing pública mostró `<video>` y la galería con las fotos; el video de prueba se eliminó (y su archivo de Drive). `lint`, `typecheck`, `build` y Docker OK.

### AA. Una sola cabecera en la landing pública

La landing pública heredaba el layout de la tienda (`StoreHeader` + `StoreFooter`) y además renderizaba su propia cabecera. Se creó `StoreShell` (cliente, usa `usePathname`) que omite cabecera/pie de tienda cuando la ruta contiene `/landing/`. **Verificado:** en la landing no aparece «Carrito» y sí «Ver tienda»; en la tienda ocurre al revés.

### Z. URL pública de la landing

El usuario reportó 404 al abrir `/tienda/ganga-online/landing/mouse-logitech-x2`. Dos causas: (1) el producto estaba `storeVisible=false` (se activó vía `PATCH /api/admin/products/[id]` → `storeVisible:true`) y (2) el slug real del tenant es `ganga-online-zq1p8a`, no `ganga-online`. La URL correcta, tomada del botón «copiar enlace» del listado, es `/tienda/ganga-online-zq1p8a/landing/mouse-logitech-x2`. **Validado:** HTTP 200, HTML con la landing y el botón de WhatsApp. Para anuncios se requiere el dominio desplegado (localhost solo funciona en esta máquina).

### Y. Efectos decorativos por landing

El usuario pidió ambientar las landing por evento (Navidad, Año nuevo, Halloween, Carnaval, Cumpleaños o propio). Se agregaron al diseño: `effect` (enum `none|snow|newyear|halloween|carnival|birthday|custom`), `effectIntensity` (1-3), `effectSpeed` (1-3) y `effectEmoji` (máx. 8). Controles en «Diseño y Opciones → Efecto de evento». Render en `LandingEffect` con partículas emoji animadas por CSS (sin librerías ni recursos externos), `pointer-events:none`, `aria-hidden` y `@media (prefers-reduced-motion: reduce)` para ocultarlas. **Validado:** PATCH con `snow/3/3` devolvió 200 y el preview mostró copos, trineo, keyframes y `pointer-events:none`; se restauró el diseño original.

### X. Botón de WhatsApp en la landing

El usuario preguntó por qué el botón decía «La consulta por WhatsApp todavía no está disponible» pese a tener WhatsApp conectado. Causa: la conexión estaba `CONNECTED` con `verifiedPhone=930956208`, pero `tenants.whatsappPhone` seguía `null`; la tienda/landing leían ese campo viejo. Además el modo preview desactivaba el botón a propósito.

Se agregó `resolveStoreWhatsappPhone` en `store/service.ts`: toma el `verifiedPhone` (o `expectedPhone`) de la conexión `CONNECTED` del tenant y usa el campo del tenant solo como respaldo. Lo usan `getStoreBySlug`, `getPublishedLanding` y `getLandingPreview`. En preview el botón ahora queda habilitado y llama al nuevo endpoint privado `POST /api/admin/landings/[id]/whatsapp` (usa el borrador, no requiere publicación). `LandingWhatsappButton` acepta `endpoint` opcional. **Validado:** preview sin mensaje de "no disponible", endpoint preview 200 con URL `https://wa.me/930956208?text=...`.

### W. Scroll intermitente en el preview del editor

Al cambiar la altura de la foto, el preview aparecía/desaparecía el scrollbar en bucle. Causa: `ScaledPreview` observaba también el contenedor; el scrollbar reducía el ancho, eso cambiaba el escalado y el escalado cambiaba la altura. Se dejó `ResizeObserver` solo sobre el contenido, se agregó `scrollbar-gutter: stable` al contenedor con scroll y se evita actualizar el estado si el valor no cambia. `lint`, `typecheck`, `build` y Docker OK.

### V. Precio con campaña en la landing

El usuario pidió poder mostrar un precio de campaña y uno anterior. Se agregaron tres campos al diseño (guardados por versión): `priceText` (si está vacío usa el precio del catálogo), `oldPriceText` (se muestra tachado) y `discountText` (insignia, ej. `-50%`), con validación de longitud y sin HTML. Aparecen en «Diseño y opciones → Textos». **Validado:** PATCH con `S/ 120.00`, `S/ 240.00` y `-50%` devolvió 200 y el preview mostró el precio actual, el anterior con `line-through` y la insignia; se restauró el diseño original.

### U. Preview fija en el editor

El panel de vista previa del editor ahora es `sticky` (`lg:sticky lg:top-[92px]`, `self-start`) y tiene altura `calc(100vh - 140px)` con scroll interno, así permanece visible mientras se baja por «Diseño y opciones de la landing» y se pueden ver los cambios en vivo sin perder el panel.

### T. Preview del editor igual a la página real

El usuario notó que la vista previa dentro del editor se veía apilada/diferente porque el panel es angosto y no alcanzaba el breakpoint `lg`. Se agregó `ScaledPreview`: renderiza `LandingView` a 1280 px de ancho y aplica `transform: scale(anchoDisponible / 1280)` con `transform-origin: top left`, ajustando la altura con `ResizeObserver`. Así el editor muestra el mismo diseño de escritorio que `/preview/landing/[id]`, manteniendo los cambios en vivo. **Verificado en HTML:** `width:1280px` y `transform-origin:top left` presentes en la página del editor.

### S. Encuadre manual de la foto (nuevo)

El usuario pidió poder elegir qué parte de la foto se muestra en vez del encuadre automático. Se agregaron tres opciones al diseño (guardadas por versión): `imagePositionX` (0-100 %), `imagePositionY` (0-100 %) e `imageZoom` (100-300 %), con valores por defecto 50/50/100. Aparecen como deslizadores en el editor bajo «Encuadre de la foto» y aplican cuando el ajuste es «Cubrir»: `object-position` y `transform: scale()` con origen en el punto elegido. **Validado:** PATCH con `20/75/150` devolvió 200 y el preview contuvo `object-position:20% 75%` y `scale(1.5)`; se restauró el diseño original.

### R. Ajustes visuales de la landing

- **Botón final:** la CTA de la sección «¿Necesitas más información?» ahora siempre está centrada y alineada al centro (antes seguía la alineación del bloque de texto y parecía descentrada/cortada). `LandingWhatsappButton` acepta `align`.
- **Contorno de la foto:** con `imageFit=contain` ya no se dibuja un recuadro gris con la imagen dentro; el `<img>` se ajusta a su propia proporción (`height:auto; width:auto; max-height:<altura>; max-width:100%`) y el `borderRadius` se aplica a la imagen. Con `cover` se mantiene el recuadro fijo. **Verificado en HTML:** `max-height:420px` presente, sin `object-contain p-3`, y botón final `flex justify-center`.

### Q. Diseño personalizable por landing (nuevo)

A pedido del usuario se agregaron opciones de diseño por landing, con migración `20261126090000_landing_design` (`landing_versions.design JSONB NOT NULL DEFAULT '{}'`). Los valores por defecto se aplican a versiones antiguas.

- Tipos y constantes compartidas en `src/lib/landings/design.ts` (sin `server-only`) para que el editor cliente y el render servidor usen lo mismo. Validación estricta en `validateContent`/`validateDesign` (colores `#RGB`/`#RRGGBB`, enums, longitudes, rangos y booleanos).
- **Opciones:** distribución (texto izquierda/derecha, imagen arriba, centrado); foto completa (`contain`, por defecto) o cubrir (`cover`), altura 200-640 px y esquinas 0-48 px; colores principal/fondo/texto/botón/texto del botón; estilo del botón (relleno o borde); tamaño del titular; espaciado; textos editables (etiqueta superior, insignia, etiqueta de precio, texto del botón, pie); y 9 interruptores para mostrar/ocultar insignia, referencia, precio, WhatsApp, descripción, variantes, beneficios, FAQs y sección final.
- Editor: sección plegable «Diseño y opciones de la landing» con `LandingDesignEditor` y botón «Restablecer». `LandingWhatsappButton` acepta estilo para aplicar colores del tema.
- **Validado en vivo:** valores por defecto (`imageFit=contain`, `layout=split-left`, color `#4f46e5`) y preview 200 con `object-contain`; PATCH con diseño personalizado (`centered`, `cover`, `#ff0000`, botón «Consultar ahora», insignia oculta) devolvió 200 y el preview reflejó color, texto, `object-cover` y ocultación. Se restauró el diseño original.

### P. Vista previa sin panel de control

El usuario indicó que la vista previa debe verse como la ve el cliente, sin el sidebar «Inicio/Productos/…». Como la ruta antigua vivía bajo `/dashboard`, heredaba el layout del panel. Se creó la ruta raíz `/preview/landing/[id]` (solo el `LandingView`, sin sidebar ni cabecera de administración), se actualizaron los dos enlaces («Vista previa» del editor y el icono del listado, ambos con `target="_blank"`) y se eliminó `/dashboard/landings/[id]/preview`. Sigue requiriendo sesión y membresía. **Verificado:** nueva ruta 200 con el producto y sin «NAVEGACIÓN» ni «Panel de control» en el HTML; ruta antigua 404. Se conserva la franja ámbar «Vista previa privada del borrador» para distinguirla de la página publicada.

### O. Vista previa de landing (corrección 404)

La vista previa `/dashboard/landings/[id]/preview` devolvía 404 aunque la landing existía. Causa: `getLandingPreview` llamaba a `getStoreProduct`, que filtra `storeVisible=true` (consulto pública); el producto de la landing estaba `ACTIVE` pero no visible en tienda, así que el producto devuelto era `null`. Se agregó la opción `includeInvisible` a `getStoreProduct` y la vista previa la usa, manteniendo el filtro para la tienda pública. **Validado:** la URL de preview de `cmwxivw3r000301naer1zdc7a` pasó de 404 a **200** y el HTML contiene el producto y el modo «Vista previa».

### N. Crear landing: campos opcionales (corrección)

El diálogo «Nueva landing» enviaba `slug: ""` y `headline: ""` aun dejando los campos vacíos; el servidor interpretaba el string vacío como valor provisto y fallaba con «El titular debe tener entre 3 y 120 caracteres y sin HTML». Se corrigió en `landings/service.ts` (`asText(...) || porDefecto`) y en el cliente (ya no envía las claves vacías). También se agregaron textos de ayuda bajo ambos campos. **Validado:** crear landing con `slug: ""` y `headline: ""` devolvió 201, con slug generado `mouse-logitech-x2`; la landing de prueba se eliminó.

### M. Foto al crear producto (nuevo)

El diálogo «Nuevo producto» no tenía campo de imagen (solo la edición). Se agregó un selector opcional «Foto del producto (opcional)» (JPEG/PNG/WebP, máx. 5 MB). El flujo: primero crea el producto, luego sube el archivo a `POST /api/admin/products/[id]/images`, que usa `saveProductImage` → **Google Drive** (`drive:<fileId>`). Si la subida falla, el producto queda creado y se muestra el error con opción de cerrar; el botón pasa a «Listo» para evitar crear un segundo producto.

- **Validado en vivo:** crear producto → subir PNG de 69 bytes → `storageKey=drive:1YYWkSaxLaENMG3UvxTH8jBwxXmYKH8rD` en BD; lectura por `/api/admin/products/images/[id]/file` devolvió 200 y los bytes PNG. La ruta pública `/api/images/[id]/file` devuelve 404 si el producto no está `ACTIVE` y `storeVisible=true` (comportamiento existente, no un error). Se eliminaron el producto de prueba y su archivo de Drive.
- A pedido del usuario se quitaron todas las menciones a Drive en la interfaz: el selector dice «JPG / PNG / WebP · máx. 5 MB» y el error de subida es «Producto creado, pero no se pudo subir la imagen…». Los errores internos de Drive no llegan al cliente (`catalogErrorResponse` los convierte en un mensaje genérico). Verificado: no queda texto «Drive» en componentes ni en el bundle cliente.

### L. Sidebar y rendimiento (correcciones)

- **Dos items resaltados a la vez:** `Sidebar` marcaba «Inicio» como activo en cualquier subpágina porque usaba `pathname.startsWith("/dashboard/")` con `href="/dashboard"`. Se especializó: para `/dashboard` solo coincide la ruta exacta; para el resto se mantiene el prefijo. Verificado en HTML: exactamente **1 item resaltado** en `/dashboard`, `/dashboard/products` y `/dashboard/configuracion`.
- **Lentitud:** se midió Supabase desde este equipo: conexión TLS ~1.0-1.35 s y cada query ~150-210 ms (región `us-west-2`). El layout y las páginas repetían consultas de sesión/tenant. Se memoizaron por petición con `cache()` de React: `getMembershipRole`, `listUserTenants`, `getActiveTenantForUser` y `getActiveTenantSettings` en `src/lib/tenants/service.ts` (`getSession` ya estaba memoizado). Medición antes/después: `/dashboard` 1914→1127 ms, `/dashboard/configuracion` 1271→968 ms, `/login` 2246→1453 ms (promedios de 3 peticiones). El piso restante sigue siendo la latencia de red a Supabase; cambiar a Postgres local reduciría las consultas a milisegundos pero requeriría decisions del usuario (los datos actuales están en Supabase).

### K. Centro de configuración (nuevo)

A pedido del usuario, y **previamente aprobado el plan**, `/dashboard/configuracion` pasó a ser un centro de configuración en una sola página con tarjetas:

- **Datos del negocio:** nombre editable (solo OWNER) y slug de solo lectura. Nuevo servicio `updateTenantName` y ruta `PATCH /api/admin/tenants/general`; el slug no se modifica al renombrar.
- **WhatsApp:** número Click to Chat + enlace a la conexión real WasenderAPI/QR/webhooks (`/dashboard/configuracion/whatsapp`).
- **Categorías del catálogo:** listado y formulario de creación (mismo endpoint `/api/admin/categories`). Se **movió** la gestión desde Productos: se eliminó el botón «Categorías» y su diálogo de `products-view.tsx`; el filtro por categoría sigue en Productos.
- **Tienda:** tarjeta «Próximamente» (dominios, políticas y métodos de entrega), sin implementar.
- Componente `src/components/settings/configuration-cards.tsx`. Roles respetados: solo OWNER edita datos del negocio y número de WhatsApp.
- **Verificado:** `lint`, `typecheck`, `build` y Docker OK; HTML de Configuración contiene todas las secciones; el botón de Categorías ya no aparece en Productos; `PATCH /api/admin/tenants/general` con nombre inválido responde 400.
- **Ajuste posterior aprobado:** las tarjetas ahora son botones que abren una **ventana emergente (modal)** con todo el contenido de cada sección; se cierra con clic fuera, botón × o Esc. El **Canal de WhatsApp** ya no tiene campo editable separado: muestra el `verifiedPhone` (o `expectedPhone` como respaldo) de la conexión principal obtenida con `listConnections`, su estado y proveedor. Si no hay conexión, muestra «Sin conectar». El formulario anterior `WhatsappSettings` dejó de usarse aquí (se conserva el componente y su ruta por si se requiere en el futuro).
- **Unificación final (aprobada):** dentro del modal del Canal de WhatsApp se renderiza **todo** `ConnectionsManager` (proveedores, «Conectar con QR», estado, QR, renovación, verificación, eliminación y URL del webhook), con el modal más ancho (`max-w-3xl`). Se **eliminó la vista** `/dashboard/configuracion/whatsapp` y todo enlace hacia ella. Verificado: la ruta antigua responde **404**, la tarjeta sigue presente y no queda link a la ruta eliminada. El componente y las APIs de conexión siguen intactas; solo cambió dónde se muestran.
- **Una sola cuenta por negocio (aprobado):** `createConnectionFromQr` cuenta las conexiones del tenant **antes** de crear la sesión en Wasender (para no dejar sesiones huérfanas) y vuelve a verificar dentro de la transacción; responde 409 si ya existe una. En la UI se oculta «Conectar con QR» cuando hay una conexión y se muestra el aviso «Este negocio ya tiene una cuenta de WhatsApp vinculada. Solo se permite una; elimínela para poder conectar otra.». Las cuentas siguen siendo independientes entre tenants. **Validado:** con una conexión ficticia insertada, `POST /api/admin/whatsapp/sessions` devolvió 409 con ese mensaje y no se creó ninguna sesión remota; la fila de prueba se eliminó.

### J. Duplicado de mensajes salientes (corregido)

El usuario reportó que al enviar un mensaje aparecía dos veces. Confirmado en BD: el mensaje se creaba al encolarlo (`externalId=null`, `ACCEPTED`) y otra vez cuando llegaba el webhook `messages.upsert` con `fromMe=true` (`externalId=<id de WhatsApp>`, `SENT`).

- `handleIncomingMessage` ahora reconcilia los mensajes salientes: si el webhook trae `fromMe=true`, busca un mensaje `OUTBOUND` reciente (≤15 min), mismo contenido y sin `externalId`, y lo **actualiza** con el ID externo y el estado `SENT` en lugar de crear uno nuevo. Si no hay coincidencia (mensaje enviado desde el teléfono), se crea normalmente.
- Los mensajes salientes del webhook ya no incrementan `unreadCount`.
- **Validado en vivo:** se creó un mensaje local de prueba, se envió un webhook firmado al endpoint público y quedó **una sola fila** con `externalId` y `status=SENT` (antes eran dos). El registro de prueba se eliminó.
- **Limpieza autorizada:** se fusionó el duplicado histórico de «mayra enviame una foto»: se conservó el mensaje original, se le copiaron `externalId`, estado y `providerStatus` del duplicado y se eliminó solo la fila repetida (1 par). Verificado en BD: un solo mensaje saliente con `externalId=3EB0258EB5EC928048284F` y `status=SENT`.
- **Segundo caso (doble envío real):** el usuario envió «hola» y aparecieron dos burbujas con dos `providerMessageId` distintos (`100207414`, `100207418`) y dos eventos «Mensaje encolado para envío» a 1.8 s de diferencia. No era el webhook: la UI llamó dos veces a `send()` (doble clic / Enter + clic). Se agregó: (1) `sendingRef` en el cliente para ignorar disparos simultáneos y limpiar el borrador antes de la petición; (2) input deshabilitado mientras envía; (3) **idempotencia en servidor** con `pg_advisory_xact_lock` sobre hash(tenant+conversación+texto) dentro de la transacción, recheck del mensaje de los últimos 15 s y devolución del existente en lugar de crear otro.
- **Validado en vivo (idempotencia):** dos `POST` concurrentes al endpoint de mensajes devolvieron **el mismo `id` de mensaje** (antes creaban dos). Se limpiaron los mensajes de prueba y se fusionó el par histórico de «hola», conservando el original con `externalId=3EB0B04A723AFF612F30F7` y `status=DELIVERED`. El worker se detuvo durante la prueba y se reinició después.

### I. Google Drive como almacenamiento (nuevo)

A pedido del usuario, se unificó el almacenamiento con el mismo Google Drive usado en el proyecto de reservas (`One-Touch-test`):

- Se copiaron `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_DRIVE_REFRESH_TOKEN` desde `.env.local` del proyecto de reservas al `.env` de este proyecto, **sin imprimir valores**. El token del `.env.local` estaba revocado (`invalid_grant`); se recuperó el token vigente cifrado en la tabla `app_integration_credentials` de Supabase de ese proyecto y se validó con Google. Ningún valor se escribió en docs, logs ni consola.
- Módulo `src/lib/storage/google-drive.ts`: access token con refresh token, caché de carpetas, subida multipart, descarga, borrado y permiso público opcional. Estructura: `OneTouch/One-Touch-Ecommerce/{Productos,Comprobantes,WhatsApp}/<tenant>`.
- **Compatibilidad hacia atrás:** las claves locales existentes (`tenant/...`) siguen leyéndose del volumen Docker. Solo los archivos nuevos usan clave `drive:<fileId>`, por lo que no se migró ni borró nada.
- Imágenes de producto (`saveProductImage`/`readStoredImage`/`deleteStoredImage`), comprobantes de pago (`saveVoucher`/`readVoucher`/`deleteVoucher`) y fotos de WhatsApp (`saveWhatsappImage`/`readWhatsappImage`) ahora guardan en Drive. Las firmas de `deleteStoredImage` y `deleteVoucher` pasaron a `async` y se actualizaron sus llamadores.
- Se inyectaron las 3 variables en `docker-compose.yml` y se documentaron en `.env.example`.
- **Validado en vivo:** `uploadToDrive` → `downloadFromDrive` (69 bytes, `image/png`) → `deleteFromDrive`, con un PNG de prueba dentro del contenedor; archivo eliminado al final. `lint`, `typecheck`, `build` y Docker OK.

### H. Fotos en la bandeja (nuevo)

El usuario reportó que las conversaciones no mostraban fotos. Con datos reales se confirmó: `kind=IMAGE`, `content=""`, `media={}` — la imagen llegaba pero se descartaba en la normalización. La bandeja estaba implementada solo para texto (`inbox-view.tsx` pintaba `<p>{content}</p>` y el adjunto tenía tooltip «Adjuntos disponibles en una fase posterior»).

Se cerró el circuito completo:

- **Entrada:** `mapper.ts` extrae `imageMessage` (url, mimetype, mediaKey, sha256, fileName, caption) y `types.ts` lo transporta en `NormalizedMessage.media`. `sanitizePayload` **no persiste mediaKey** (secreto del proveedor).
- **Desencriptado:** `decryptMedia` en el adaptador Wasender usa `POST /api/decrypt-media` (contrato oficial: `{data:{messages:{key:{id},message:{imageMessage:{url,mimetype,mediaKey,...}}}}}` → `publicUrl` válida 1 h), descarga los bytes y valida que sea imagen ≤16 MB. Se guardan en `/app/storage/whatsapp-media/<tenant>/<id>.<ext>` (volumen persistente); `mediaKey` nunca se escribe en BD.
- **Persistencia/API:** `ConversationMessage.media` ahora se puebla con `{type,status,path,mimeType,fileName}`. `MessageDTO` expone `media`. Vista previa de conversación usa `[Foto]` cuando no hay caption.
- **Servir:** `GET /api/admin/conversations/[id]/media/[messageId]` valida tenant+conversación y devuelve los bytes con `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`.
- **Envío:** botón de adjuntar en el composer + `POST /api/admin/conversations/[id]/image` (multipart). Sube a `POST /api/upload` de Wasender (URL pública 24 h), guarda copia local, crea mensaje `IMAGE` y encola `OutboundMessage` con `kind=IMAGE`/`mediaUrl`. Migración `20261124120000_whatsapp_outbound_image` agrega esas columnas; el worker usa `sendImage`. Límites: JPEG/PNG/WebP/GIF ≤16 MB.
- **UI:** la burbuja muestra `<img>` cuando `media.status="ready"`, si no `[Foto no disponible]`. Caption opcional al adjuntar. Al hacer clic en la miniatura se abre un visor a pantalla completa (hasta 92 % de la ventana) con botón de cierre, clic fuera y tecla Esc.
- **Verificado:** `lint`, `typecheck`, `build` OK; migración aplicada (columnas `kind` y `mediaUrl` presentes); Docker healthy; el HTML de la bandeja contiene el input de imagen; `POST .../image` sin archivo responde 400; las rutas nuevas aparecen en el build. **Pendiente de validación real:** recibir una foto nueva por WhatsApp para confirmar el desencriptado, y enviar una foto a un destinatario autorizado (no se ejecutó ningún envío real sin destinatario confirmado).

- **Corrección de número verificado (real):** la conexión `yeltsin` (sesión `134777`) quedaba en `CONNECTING` y `GET /api/admin/whatsapp/sessions/[id]` devolvía 409 porque `/api/user` reporta el número de la **cuenta** Wasender y sobrescribía el número de la **sesión**. Se priorizó `phone_number` de la sesión en `refreshQrConnection` y `verifyConnection`. Verificado en vivo: la conexión pasó a `CONNECTED` con `expectedPhone = verifiedPhone = 930956208` y `lastError = null`.
- **Diagnóstico del error «No se pudo generar el QR»:** al sondear la sesión `134781` se confirmó que Wasender la reportaba `connected` y rechazaba la generación con `connect` → HTTP 400 «WhatsApp session is already connected.» y `qrcode` → HTTP 400 «Session does not need scanning. Please initialize the session first.». El estado local estaba desactualizado (`CONNECTING`) y el botón intentaba regenerar de todos modos. Se corrigió: `regenerateQrConnection` detecta ese caso (WasenderError 409), sincroniza la conexión local a `CONNECTED` con el número de la sesión y devuelve `alreadyConnected: true` sin QR; la UI muestra «La sesión ya está vinculada en WasenderAPI. Estado sincronizado.» en lugar del error.
- **Segundo error «WhatsApp session is not connected. Cannot restart.»:** Wasender solo admite `POST /restart` en sesiones `connected`; en `need_scan` responde 400. Se sondeó el contrato real: en `need_scan`, `GET /qrcode` y `POST /connect` devuelven QR (239 chars) y `POST /restart` falla; en `connected` ocurre lo contrario. Además se verificó que el QR **rota con el tiempo** (hash distinto tras ~65 s), por lo que `connect` entrega un QR efectivamente nuevo cuando el anterior venció. Se eliminó la llamada a `restart` para sesiones no conectadas y se usa directamente `connectAndReadQr`. **Validado en vivo:** `POST /api/admin/whatsapp/sessions/{id}/regenerate` sobre la conexión «VENTAS YELTSIN» (sesión `134782`, estado local `ERROR`) devolvió **HTTP 200**, QR data-URI PNG de 6766 caracteres, `alreadyConnected: false` y estado local `NEEDS_LINKING`, sin errores.
- Nota operativa: la cuenta de Wasender del usuario está al **límite de 3 sesiones** del plan; crear una 4ª sesión responde 403 («You have reached your WhatsApp session limit»). Sesiones actuales: `134777` (yeltsin, conectada), `131947` (GANGA ONLINE, conectada) y `122685` (EntraconEsteban, logged out). No se crearon ni modificaron sesiones durante esta Validación; la prueba de `restart` no pudo ejecutarse en una sesión temporal por el límite del plan.
- Verificación local: `lint`, `typecheck` y `build` sin errores; Docker reconstruido; botón presente en el HTML; endpoint con body vacío responde 400 (existe y valida).
- **Prueba real controlada contra WasenderAPI:** crear sesión → HTTP 201 con `api_key` y `webhook_secret`; `connect` → HTTP 200 con QR de 239 caracteres; **sesión de prueba eliminada** (HTTP 204) para no dejar residuos. No se vinculó ningún número real ni se enviaron mensajes.
- Dependencia nueva: `qrcode` + `@types/qrcode` (generación local de QR). Sin frameworks de prueba.
- Pendiente de validación visual/real: que el usuario escanee el QR con su WhatsApp Business y confirme `CONNECTED` con el número correcto. No se declaró aprobado.
