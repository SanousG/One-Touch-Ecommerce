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

- Autenticación: `Authorization: Bearer <Session API Key>`. No se usa Personal Access Token; no se crean sesiones desde el panel.
- Verificación: `GET /api/status` (`connected|connecting|disconnected|need_scan|need_passkey|logged_out|expired`) y `GET /api/user` para número/nombre cuando está disponible.
- Envío: `POST /api/send-message` con `{to,text}`, `{to,imageUrl,text}` o `{to,documentUrl,fileName,text}`; respuesta `{success:true,data:{msgId,jid,status:"in_progress"}}`.
- Webhook: `X-Webhook-Signature` se compara **directamente** con el Webhook Secret (no HMAC, no Meta). Comparación en tiempo constante.
- Eventos soportados: `messages.received`, `messages.upsert`, `messages.update`, `message-receipt.update`, `message.sent`, `session.status`. Se ignoran grupos, canales, estados, llamadas y reacciones.
- Rate limits: 1 msg/min y 50/día en trial; 256/min en planes pagos; cabeceras `X-RateLimit-*`. El worker usa 1–5 concurrentes por sesión.

## Sesiones y credenciales

`WHATSAPP_ENCRYPTION_KEY` (base64 de 32 bytes) cifra `apiKey`, `webhookSecret` y `sessionId` con AES-256-GCM: formato `v1:<iv>:<tag>:<ciphertext>`, nonce individual por cifrado, versión para rotación. Clave solo en `.env`/Docker Compose, nunca en Git ni en la imagen. Rotación futura: cifrar de nuevo con `v2` y mantener la clave anterior solo para descifrar mientras se migra.

El panel **nunca** devuelve secretos; solo estado, número verificado y URL del webhook. Guardar credenciales deja la conexión en `PENDING`; solo `Guardar y verificar` que consulte realmente al proveedor puede marcar `CONNECTED`. Solo OWNER administra conexiones.

## Webhook y durabilidad

Ruta: `/api/webhooks/whatsapp/wasender/[webhookId]`. El tenant se resuelve desde el `webhookId` opaco de la conexión, nunca desde el JSON. Flujo:

1. Buscar conexión por webhookId.
2. Comparar firma con el secreto descifrado.
3. Normalizar y **sanitizar** el payload: se descartan `sessionId`/claves antes de persistir.
4. Insertar `WebhookEvent` con `dedupeKey` única; si ya existe, responder duplicado sin reprocesar.
5. Procesar en transacciones: contacto, conversación, mensaje, estados o estado de sesión.
6. Responder 200 rápidamente; si falla el procesamiento, el evento queda en `FAILED` para diagnóstico sin reintentos ciegos.

Identidad: se conservan `remoteJid`, `cleanedSenderPn`, `senderPn`, `senderLid` y `addressingMode`. Un LID **no** se convierte en teléfono. Se reutiliza contacto por teléfono o LID dentro de la misma conexión y se reabre una conversación resuelta si llega un mensaje nuevo.

## Cola saliente

`OutboundMessage` en PostgreSQL + worker Docker. Claim atómico `PENDING → PROCESSING`; estados `PENDING|PROCESSING|SENT|FAILED|UNCERTAIN`. Reintentos con backoff hasta 5 intentos solo para 429/5xx. Timeout de red se marca **incierto** y no se reenvía automáticamente. La respuesta de Wasender no equivale a entrega: los webhooks `messages.update` mapean 0–5 a `FAILED|PENDING|SENT|DELIVERED|READ`.

## Contexto comercial y pedidos

El mensaje entrante se analiza buscando SKUs reales del tenant; se guardan referencias y precios vigentes del catálogo en `conversation.context`. No se confía en cantidades/precios escritos por el cliente. La bandeja permite crear un pedido manual precargado reutilizando `createOrder` de la Fase 4A con `conversationId`; el vendedor revisa y confirma. Atender o responder **no** crea pedidos ni reserva stock.

## Límitaciones y riesgos

- Proveedor no oficial: su contrato puede cambiar; los endpoints y eventos están aislados en el adaptador.
- Las imágenes salientes requieren URLs públicas; hoy no se expone ninguna biblioteca privada. Solo se implementa texto; imagen/documento quedan preparados en el adaptador pero sin UI.
- No hay chatbot, IA, clasificación de intenciones ni ejecución de diagramas.
- No se crean túneles ni se publica el webhook automáticamente; `WHATSAPP_WEBHOOK_BASE_URL` debe configurarse con HTTPS (por ejemplo Cloudflare Tunnel) de forma autorizada.
- Sin expiración automática de reservas ni verificación automática de pagos.

## Pasos futuros para Meta Cloud API

Implementar un `MetaProvider` con el mismo contrato, verificación `X-Hub-Signature-256`, Embedded Signup y plantillas aprobadas detrás de su adaptador; registrar el proveedor en `registry.ts` sin tocar conversaciones, pedidos ni flujos.
