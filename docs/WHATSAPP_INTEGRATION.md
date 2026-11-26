# Integración de WhatsApp (Fase 4B)

## Arquitectura multiproveedor

El núcleo no conoce a WasenderAPI. Depende de la interfaz `WhatsAppProvider` (`src/lib/whatsapp/types.ts`) resuelta por `registry.ts`.

```text
src/lib/whatsapp/
  types.ts            interfaz común y DTOs
  crypto.ts           AES-256-GCM versionado + comparación segura
  registry.ts         Wasender disponible; Meta registrado como futuro no disponible
  connection-access.ts acceso de bajo nivel sin dependencias de Next (worker)
  service.ts          administración de conexiones por negocio
  conversations.ts    bandeja, contactos, mensajes e ingesta de webhooks
  outbox.ts           cola durable con claim atómico
  providers/wasender/ client, adapter, webhook, mapper
worker/outbox.ts      proceso Docker que envía la cola
```

Operaciones de la interfaz: `verifyCredentials`, `getConnectionState`, `sendText`, `sendImage`, `sendDocument`, `verifyWebhook`, `normalizeWebhook`, `mapMessageStatus`, `capabilities`.

## Adaptador WasenderAPI

Basado en la documentación oficial consultada el 21/11/2026:

- Autenticación: `Authorization: Bearer <Session API Key>` para sesiones conectadas. La creación de sesiones desde el panel usa `WASENDER_PERSONAL_ACCESS_TOKEN` solo en servidor.
- Verificación: `GET /api/status` (`connected|connecting|disconnected|need_scan|need_passkey|logged_out|expired`) y `GET /api/user` para número/nombre cuando está disponible.
- Envío: `POST /api/send-message` con `{to,text}`, `{to,imageUrl,text}` o `{to,documentUrl,fileName,text}`; respuesta `{success:true,data:{msgId,jid,status:"in_progress"}}`.
- Webhook: `X-Webhook-Signature` se compara **directamente** con el Webhook Secret (no HMAC, no Meta). Comparación en tiempo constante.
- Eventos soportados: `messages.received`, `messages.upsert`, `messages.update`, `message-receipt.update`, `message.sent`, `session.status`. Se ignoran grupos, canales, estados, llamadas y reacciones. `message.sent` confirma el envío propio mediante `{key, message, success}` (sin `update`/`status`): `success:true` → `SENT`, `false` → error; se conserva `success` al sanitizar.
- Rate limits: 1 msg/min y 50/día en trial; 256/min en planes pagos; cabeceras `X-RateLimit-*`. El worker usa 1–5 concurrentes por sesión.

## Sesiones y credenciales

`WHATSAPP_ENCRYPTION_KEY` (base64 de 32 bytes) cifra `apiKey`, `webhookSecret` y `sessionId` con AES-256-GCM: formato `v1:<iv>:<tag>:<ciphertext>`, nonce individual por cifrado, versión para rotación. Clave solo en `.env`/Docker Compose, nunca en Git ni en la imagen. Rotación futura: cifrar de nuevo con `v2` y mantener la clave anterior solo para descifrar mientras se migra.

El panel **nunca** devuelve secretos; solo estado, número verificado y URL del webhook. Guardar credenciales deja la conexión en `PENDING`; solo `Guardar y verificar` que consulte realmente al proveedor puede marcar `CONNECTED`. Solo OWNER administra conexiones. `verifyConnection` persiste el número real devuelto por `GET /api/user` en `verifiedPhone` (solo cuando el estado es `connected`); la UI muestra «esperado / verificado» para que el usuario confirme que la cuenta corresponde al negocio activo.

### Flujo de conexión por QR (recomendado)

Además del registro manual, el panel ofrece **«Conectar con QR»**: la app crea la sesión en WasenderAPI, registra el webhook y muestra el QR para escanear con WhatsApp Business (*Ajustes → Dispositivos vinculados*). El usuario **no pega API keys ni secretos**: la respuesta de `POST /api/whatsapp-sessions` devuelve `api_key` y `webhook_secret`, que se guardan cifrados con el mismo AES-256-GCM.

- El PAT de cuenta (`WASENDER_PERSONAL_ACCESS_TOKEN`) se usa **solo en servidor** para crear/consultar sesiones; nunca se guarda en BD ni se envía al navegador.
- Se usa `POST /api/whatsapp-sessions`, luego `POST /api/whatsapp-sessions/{id}/connect` (o los endpoints `qrcode`/`qr-code` como respaldo) y `GET /api/whatsapp-sessions/{id}` para el polling.
- El QR se normaliza en servidor (`qr-image.ts`) a data-URI PNG localmente; no se envía a servicios externos.
- El `webhook_url` se construye con el `webhookId` opaco generado localmente y la base `WHATSAPP_WEBHOOK_BASE_URL` (ngrok en validación), de modo que el tenant se resuelve igual que en el flujo manual.
- El polling del panel consulta cada 4 s (1.5 s la primera vez, máx. 75 intentos, pausa si la pestaña está oculta). Al detectar `connected`, se guarda `verifiedPhone` y la conexión pasa a `CONNECTED`.
- Implementado en `providers/wasender/sessions.ts`, `service.ts` (`createConnectionFromQr`, `refreshQrConnection`) y las rutas `/api/admin/whatsapp/sessions` y `/api/admin/whatsapp/sessions/[id]`. Todo detrás de `WhatsAppProvider` (opcional), sin acoplar módulos comerciales al adaptador.

## Webhook y durabilidad

Ruta: `/api/webhooks/whatsapp/wasender/[webhookId]`. El tenant se resuelve desde el `webhookId` opaco de la conexión, nunca desde el JSON. Flujo:

1. Buscar conexión por webhookId.
2. Comparar firma con el secreto descifrado.
3. Normalizar y **sanitizar** el payload: se descartan `sessionId`/claves antes de persistir.
4. Insertar `WebhookEvent` con `dedupeKey` única; si ya existe, responder duplicado sin reprocesar. La clave incluye **todos** los `externalId` del evento ordenados (con `fingerprint` del payload como reserva), de modo que un `messages.upsert` con varios mensajes no pierde los posteriores por deduplicación.
5. Procesar en transacciones: contacto, conversación, mensaje, estados o estado de sesión.
6. Responder 200 rápidamente; si falla el procesamiento, el evento queda en `FAILED` para diagnóstico sin reintentos ciegos. `GET/POST /api/admin/whatsapp/webhooks` (solo OWNER/manager de bandeja) permite listar y reintentar explícitamente esos eventos desde el payload sanitizado guardado, sin borrar el registro ni duplicar mensajes ya persistidos (la reprocesión usa la misma ingesta idempotente).

Identidad: se conservan `remoteJid`, `cleanedSenderPn`, `senderPn`, `senderLid` y `addressingMode`. Un LID **no** se convierte en teléfono. Se reutiliza contacto por teléfono o LID dentro de la misma conexión y se reabre una conversación resuelta si llega un mensaje nuevo.

## Cola saliente

`OutboundMessage` en PostgreSQL + worker Docker. Claim atómico `PENDING → PROCESSING`; estados `PENDING|PROCESSING|SENT|FAILED|UNCERTAIN`. Reintentos con backoff hasta 5 intentos solo para 429/5xx. Timeout de red se marca **incierto** y no se reenvía automáticamente. La respuesta de Wasender no equivale a entrega: los webhooks `messages.update` mapean 0–5 a `FAILED|PENDING|SENT|DELIVERED|READ`.

## Contexto comercial y pedidos

El mensaje entrante se analiza buscando SKUs reales del tenant; se guardan referencias y precios vigentes del catálogo en `conversation.context`. No se confía en cantidades/precios escritos por el cliente. La bandeja permite crear un pedido manual precargado reutilizando `createOrder` de la Fase 4A con `conversationId`; el vendedor revisa y confirma. Atender o responder **no** crea pedidos ni reserva stock.

## Límitaciones y riesgos

- Proveedor no oficial: su contrato puede cambiar; los endpoints y eventos están aislados en el adaptador.
- **Fotos entrantes y salientes (implementado):** el webhook extrae `imageMessage` (`url`, `mimetype`, `mediaKey`, etc.) y el caption de `messageBody`. `decryptMedia` llama a `POST /api/decrypt-media` de Wasender con la API key de la sesión, descarga el archivo y lo guarda en Google Drive (`OneTouch/One-Touch-Ecommerce/WhatsApp/<tenant>`) con clave `drive:<fileId>`; `mediaKey` nunca se persiste. Las fotos antiguas en volumen local siguen leyéndose sin migrar. `GET /api/admin/conversations/[id]/media/[messageId]` sirve la imagen solo al usuario autenticado del tenant. Para enviar, `POST /api/admin/conversations/[id]/image` sube el archivo con `POST /api/upload` (URL pública temporal de 24 h) y encola un `OutboundMessage` con `kind=IMAGE` y `mediaUrl`; el worker usa `sendImage`. Límites: JPEG/PNG/WebP/GIF hasta 16 MB. Si el desencriptado falla, el mensaje se guarda con `media.status="unavailable"` y se muestra «[Foto no disponible]».
- No hay chatbot, IA, clasificación de intenciones ni ejecución de diagramas.
- No se crean túneles ni se publica el webhook automáticamente; `WHATSAPP_WEBHOOK_BASE_URL` debe configurarse con HTTPS (por ejemplo Cloudflare Tunnel) de forma autorizada.
- Sin expiración automática de reservas ni verificación automática de pagos.

## Pasos futuros para Meta Cloud API

Implementar un `MetaProvider` con el mismo contrato, verificación `X-Hub-Signature-256`, Embedded Signup y plantillas aprobadas detrás de su adaptador; registrar el proveedor en `registry.ts` sin tocar conversaciones, pedidos ni flujos.
