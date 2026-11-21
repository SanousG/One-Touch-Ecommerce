# One-Touch-Ecommerce

Plataforma SaaS multi-tenant: autenticación, catálogo, tienda pública, landings, flujos de venta, inventario, pedidos y **bandeja de conversaciones de WhatsApp**. Todo se ejecuta en Docker Desktop sin `npm run dev`.

## Arranque

```powershell
cd "C:\Users\Yeltsin\Documents\SanousG\One-Touch-Ecommerce"
Copy-Item .env.example .env   # solo la primera vez
docker compose up -d --build
docker compose ps
```

Panel: http://localhost:3000/login — `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` de `.env` (crea el usuario con `docker compose run --rm seed`).

## Módulos

| Ruta | Función |
|---|---|
| `/dashboard/products` | Catálogo y acción Crear/Abrir flujo |
| `/dashboard/inventory` | Stock por variante y movimientos |
| `/dashboard/orders` | Pedidos manuales, adelantos y estados |
| `/dashboard/landings` | Landings con borrador/publicación |
| `/dashboard/flows` | Editor visual de flujos |
| `/dashboard/templates` | Plantillas de mensaje y checkout |
| `/dashboard/conversations` | Bandeja de WhatsApp (3 columnas, actualización automática) |
| `/dashboard/configuracion/whatsapp` | Conexiones WasenderAPI y webhook |

## WhatsApp

1. Crear una sesión en el panel de WasenderAPI (QR) y copiar su Session API Key y Webhook Secret.
2. Registrarla en `/dashboard/configuracion/whatsapp` con **Guardar y verificar**. Guardar solo no marca la conexión como conectada.
3. Configurar `WHATSAPP_WEBHOOK_BASE_URL` con una URL HTTPS pública y pegar la URL mostrada en el panel en la sesión de WasenderAPI.
4. Los mensajes entrantes crean contactos y conversaciones; la bandeja permite tomar, responder, transferir, resolver y crear pedidos manuales precargados.

El futuro chatbot no está implementado. Ver `docs/WHATSAPP_INTEGRATION.md`.

## Comandos Docker

```powershell
docker compose up -d --build
docker compose logs -f app
docker compose logs -f worker
docker compose stop
docker compose start
docker compose run --rm migrate
docker compose run --rm seed
```

## Verificación

`npm run lint`, `npm run typecheck`, `npm run build`. Sin pruebas automatizadas.
