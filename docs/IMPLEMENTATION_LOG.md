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
