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
