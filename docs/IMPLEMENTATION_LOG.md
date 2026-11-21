# Historial de implementación

## Fases anteriores (resumen)

Fase 1: multi-tenancy y Better Auth. Fase 1.1: Docker. Fase 2A: catálogo. Fase 2B: tienda/carrito. Fase 3A: landings. Fase 3B: editor visual de flujos. Sin frameworks de testing.

## Fase 4A — Inventario, pedidos manuales y adelantos

### A. Resultado general

**Completo.** El sistema registra inventario real con historial, reserva stock al confirmar pedidos de forma atómica y segura contra concurrencia, gestiona adelantos y comprobantes privados, y mantiene estados de pago y preparación independientes con historial cronológico. El dashboard muestra pendientes reales del negocio activo. No se implementaron chatbot, webhooks, pagos ni couriers.

### B. Archivos creados y modificados

**Creados**: `prisma/migrations/20261121122737_orders_inventory/migration.sql`, `prisma/migrations/20261121124000_fix_payment_constraint/migration.sql`, `src/lib/commerce/{types,service,http}.ts`, `src/lib/storage/vouchers.ts`, `src/components/commerce/{inventory-view,new-order-form,orders-list,order-detail}.tsx`, rutas API `/api/admin/inventory`, `/inventory/adjust`, `/inventory/movements`, `/orders`, `/orders/[id]`, `/orders/[id]/action`, `/orders/[id]/voucher`, `/orders/vouchers/[id]/file`, páginas `/dashboard/inventory`, `/dashboard/orders`, `/dashboard/orders/new`, `/dashboard/orders/[id]`, `docs/ORDER_AND_INVENTORY.md`.

**Modificados**: `prisma/schema.prisma`, `src/lib/auth/permissions.ts`, `src/lib/store/service.ts` (disponibilidad real), `src/components/landings/landing-editor.tsx`, `src/app/dashboard/page.tsx`, `src/components/dashboard/sidebar.tsx`, `Dockerfile` y `docker-compose.yml` (directorio de comprobantes), documentación.

No se eliminaron datos ni migraciones. MCP y volúmenes intactos.

### C. Modelos y migraciones

Enums: `OrderOrigin`, `PaymentStatus`, `FulfillmentStatus`, `DeliveryMode`, `PaymentMethod`, `MovementReason`, `ReservationStatus`, `OrderEventType`. Modelos: `InventoryMovement`, `Order`, `OrderItem`, `StockReservation`, `PaymentVoucher`, `OrderEvent`; relaciones en `ProductVariant` y `Tenant`. Checks SQL y función `next_order_number(tenant)`. Migración correctiva `fix_payment_constraint` ajusta `advancePaid <= total`. `migrate` aplicó 7 migraciones correctamente.

### D. Funcionamiento del inventario

Ajustes con `FOR UPDATE`, validación de no invadir reservas y movimiento registrado en `InventoryMovement`. Historial consultable por variante, conservado aunque el producto se archive.

### E. Reservas y concurrencia

Reserva solo al confirmar pedido, dentro de transacción, con bloqueo por fila y validación de todas las líneas antes de escribir. Dos peticiones simultáneas por la última unidad: una 201 y otra 409. Cancelación libera; despacho consume descontando físico y reservado. Sin devolución automática tras despacho ni expiración automática.

### F. Pedidos manuales

Formulario con cliente, variantes, cantidades, precios vigentes, entrega, envío, modalidad de pago y adelanto. Numeración por negocio, snapshots en líneas, idempotencia por clave. Confirmación devuelve número de pedido.

### G. Gestión de adelantos

Comprobantes en volumen privado, formatos validados, `no-store`, endpoint autenticado. Adjuntar no verifica. Verificación manual por OWNER con monto/fecha/responsable; rechaza montos sobre el saldo.

### H. Estados e historial

Pago y preparación separados. Preparación bloqueada sin adelanto verificado. Verificar no inicia preparación. Despachar descuenta stock. Entregar no marca pago. Cobro registrado por separado. Eventos cronológicos en cada acción.

### I. Seguridad y aislamiento

B recibió 404 al consultar/modificar/despachar pedidos de A y 400 al usar su variante. OPERATOR: 403 al ajustar stock y registrar cobros; 201 al crear pedido y 200 al preparar. Sin sesión, comprobantes 401.

### J. Integración con catálogo y tienda

La tienda consulta disponibilidad real: variante agotada rechazada en validación de carrito; variante con stock permitida. Carrito y Click to Chat sin cambios funcionales.

### K. Pantallas de Stitch implementadas

`9480b983804d47a9bcec8f7c79b5af0d` (inventario), `f81c96c596084c52b627a3e6b017c8a3` (nuevo pedido), `45955c0b898e4ca58d85d84a1991285f` (detalle), `5483e3738b1949a3a85e23d772853fb8` (dashboard). Se conservaron tabla de inventario con panel de ajuste e impacto proyectado, formulario de pedido en dos columnas con resumen, detalle con doble estado e historial, y dashboard con pendientes reales. Diferencias: sin chat vinculado, sin banco/courier integrado, sin stock ni ventas ficticias; verde solo para WhatsApp; Inter e índigo de la paleta aprobada. No se copió HTML literal.

### L. Validaciones reales y resultados

| Verificación | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores, 0 advertencias |
| `npm run typecheck` | ✅ sin errores |
| `npm run build` | ✅ 56 rutas, sin errores |
| `docker compose up -d --build` | ✅ 7 migraciones, `app` healthy |
| Inventario inicial +10/+5 e historial | ✅ |
| Ajuste -2 y movimiento `DAMAGE` | ✅ |
| Rechazo de ajuste que invade reservas | ✅ 409 |
| Pedido de una variante + reserva | ✅ `#1`, f=8 r=2 d=6 |
| Pedido de varias variantes | ✅ (cobertura por servicio y validación conjunta) |
| Idempotencia (mismo key) | ✅ mismo `#1` |
| Rechazo por stock insuficiente | ✅ 409 |
| Concurrencia última unidad | ✅ 201 + 409 |
| Cancelar y liberar reserva | ✅ r=0 d=8 |
| Pedido con adelanto | ✅ `ADVANCE_PENDING` / `WAITING_ADVANCE` |
| Preparación bloqueada sin verificar | ✅ 409 |
| Comprobante sin verificar pago | ✅ `VOUCHER_RECEIVED` |
| Verificar adelanto | ✅ `ADVANCE_VERIFIED` → `READY_TO_PREPARE` |
| Iniciar preparación / despachar / entregar | ✅ estados correctos, stock descontado |
| Entregar sin marcar pago | ✅ pago `ADVANCE_VERIFIED` |
| Registrar cobro por separado | ✅ `PAID`, 7 eventos |
| Comprobante privado | ✅ 401 sin sesión, 200 con `no-store` |
| Dashboard pendientes reales | ✅ 2 pendientes de PostgreSQL |
| Permisos OWNER/OPERATOR | ✅ 403/201/200 según regla |
| Aislamiento entre negocios | ✅ 404/400 |
| Disponibilidad real en tienda | ✅ agotada rechazada |
| Persistencia tras rebuild | ✅ 5 pedidos, pago `PAID`, 8 físicas, 8 movimientos |
| Logs de `app` | ✅ sin errores críticos |
| Interacción visual en navegador | ⚠️ pendiente (no automatizada) |

### M. Estado de Docker

`app` y `db` Up (healthy), `migrate` Exited correctamente. Sin volúmenes borrados.

### N. Problemas encontrados

1. stock inicial en 0: se registró con ajustes `INITIAL` reales antes de probar.
2. Error real `23514` al registrar cobro final: constraint `advancePaid <= advanceRequired` era incorrecto; se corrigió con migración nueva a `advancePaid <= total`.
3. Script de validación con montos esperados erróneos: se corrigió a 59.90 (total 99.90 − adelanto 40).
4. HTML del dashboard con comentarios de hidratación de React entre tokens; la verificación se ajustó.

### O. Decisiones arquitectónicas

Ver `docs/ORDER_AND_INVENTORY.md` y `docs/DECISIONS.md`. Reserva solo al confirmar, sin expiración automática, comprobantes privados, estados separados e idempotencia.

### P. Estado de Git

Commit de Fase 4A con mensaje «Fase 4A: inventario, pedidos y adelantos». `.env`, volúmenes e imágenes fuera del repositorio.

### Q. Pendientes para la Fase 4B

Motor de ejecución del chatbot, API de WhatsApp, clasificación de intenciones, checkout interactivo, pedidos desde conversación, expiración de reservas, devoluciones y transportistas. No se implementaron aquí.
