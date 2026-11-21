# Motor comercial: inventario, reservas y pedidos

Este documento describe la Fase 4A. El chatbot real, los webhooks y la ejecución automática de flujos siguen pendientes.

## Inventario

Un `ProductVariant` tiene `stockPhysical` y `stockReserved`. Regla central: **disponible = físico − reservado**. No se duplica el stock en otra tabla.

Invariantes reforzadas en PostgreSQL:
- `stockPhysical >= 0`
- `stockReserved >= 0`
- `stockPhysical >= stockReserved`
- cantidades de líneas y reservas positivas
- importes no negativos y `advancePaid <= total`

`InventoryMovement` conserva cada ajuste (tenant, variante, delta, físico anterior/nuevo, motivo `INITIAL|RESTOCK|DAMAGE|COUNT_CORRECTION|OTHER`, nota, referencia, responsable, fecha). Los movimientos nunca se eliminan, ni al archivar el producto. `onDelete: Restrict` en la variante evita borrar un producto con historial.

Ajustes: `FOR UPDATE` sobre la fila de la variante, validación de que el nuevo físico no quede por debajo de lo reservado y escritura del movimiento en la misma transacción. Solo OWNER puede ajustar.

## Reservas

`StockReservation` (única por pedido+variante) se crea al **confirmar un pedido válido**, nunca al abrir landing, escribir por WhatsApp, agregar al carrito ni simular flujos.

Confirmación atómica:
1. Validar tenant/permisos y normalizar líneas (enteros 1..999, sin variantes duplicadas).
2. Cargar variantes del tenant con `FOR UPDATE` secuencial (bloqueo de fila → evita sobreventa concurrente).
3. Validar `isActive` y `físico − reservado >= cantidad` de **todas** las líneas antes de cualquier escritura (sin reservas parciales).
4. Obtener número de pedido con `SELECT next_order_number(tenant)` (función PostgreSQL con `ON CONFLICT ... RETURNING`, atómica y concurrente).
5. Crear pedido + líneas (snapshots de nombre, SKU, variante y precio) + reservas + evento `CREATED` en una sola transacción.

Estados de reserva: `ACTIVE` → `RELEASED` (cancelación) o `CONSUMED` (despacho).

- Cancelar antes del despacho: libera reservas (`stockReserved -= q`) y marca `RELEASED`.
- Despachar: `stockPhysical -= q`, `stockReserved -= q`, marca `CONSUMED`.
- Entregar: solo evento, sin descontar stock otra vez.
- Las operaciones repetidas se rechazan por transición de estado.

No hay expiración automática de reservas en esta fase: los pedidos pendientes de adelanto conservan la reserva hasta cancelación manual. Política futura de expiración pendiente.

## Pedidos y estados independientes

Pago: `PENDING` → `ADVANCE_PENDING` → `VOUCHER_RECEIVED` → `ADVANCE_VERIFIED` → `PAID`.
Preparación: `WAITING_ADVANCE` → `READY_TO_PREPARE` → `PREPARING` → `SHIPPED` → `DELIVERED`; `CANCELLED` desde estados previos al despacho.

Transiciones:
- Verificar adelanto **no** inicia preparación; solo habilita `READY_TO_PREPARE` cuando se completa el requerido.
- `START_PREPARATION` exige adelanto verificado si `requiresAdvance`.
- `SHIP` solo desde `PREPARING`; descuenta stock.
- `DELIVER` solo desde `SHIPPED`; **no** cambia el estado de pago.
- `RECORD_PAYMENT` es una acción explícita y separada.
- No se despacha ni se entrega un pedido cancelado. No hay borrado físico de pedidos.

`advancePaid` acumula todo lo cobrado (adelanto + saldo), por eso el constraint correcto es `advancePaid <= total`. La validación de que un adelanto no exceda lo requerido está en `verifyAdvance`.

## Adelantos y comprobantes

`PaymentVoucher` guarda el archivo en `/app/storage/payment-vouchers` (volumen persistente), nunca en una URL pública. Formatos JPEG/PNG/WebP/PDF, máximo 5 MB y validación de firma binaria. El endpoint `/api/admin/orders/vouchers/[id]/file` exige sesión y pertenencia al tenant, y responde `private, no-store`.

Adjuntar comprobante solo cambia el pago a `VOUCHER_RECEIVED`: **no verifica dinero**. La verificación es manual (OWNER), registra monto, fecha, responsable y referencia, y rechaza montos superiores al saldo. No se integran Yape/Plin/bancos ni se guardan credenciales.

## Permisos

| Acción | OWNER | OPERATOR |
|---|---|---|
| Ver inventario / movimientos / pedidos | ✅ | ✅ |
| Ajustar stock | ✅ | ❌ |
| Crear pedidos | ✅ | ✅ |
| Adjuntar y verificar comprobantes / cobros | ✅ | ❌ |
| Iniciar preparación / despachar / entregar / cancelar | ✅ | ✅ |

Toda operación filtra por `tenantId` en servidor. Los IDs del navegador se revalidan contra el negocio activo.

## Contrato para el futuro chatbot (sin implementar)

1. `getVariantAvailability(tenantId, variantId)` → disponibilidad y precio vigentes.
2. Preparar resumen (producto, variante, cantidad, precio) sin reservar.
3. Validar datos y disponibilidad.
4. `createOrder(actor, input, idempotencyKey)` → confirma y reserva de forma atómica.
5. Devolver `orderNumber` y vincular la conversación futura al pedido.
6. Reutilizar la misma clave de idempotencia para reintentos.

El mensaje de WhatsApp actual sigue siendo Click to Chat; no se envía automáticamente ni crea pedidos.

## Pendiente

Expiración de reservas, devoluciones con comprobación física, múltiples almacenes, transportistas, pasarelas de pago y ejecución real del chatbot.
