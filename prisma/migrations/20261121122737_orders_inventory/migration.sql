-- CreateEnum
CREATE TYPE "OrderOrigin" AS ENUM ('MANUAL', 'CHATBOT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'ADVANCE_PENDING', 'VOUCHER_RECEIVED', 'ADVANCE_VERIFIED', 'PAID');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('WAITING_ADVANCE', 'READY_TO_PREPARE', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('LOCAL', 'PICKUP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_ON_DELIVERY', 'TRANSFER');

-- CreateEnum
CREATE TYPE "MovementReason" AS ENUM ('INITIAL', 'RESTOCK', 'DAMAGE', 'COUNT_CORRECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('CREATED', 'VOUCHER_RECEIVED', 'ADVANCE_VERIFIED', 'PAYMENT_RECORDED', 'PREPARATION_STARTED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "previousPhysical" INTEGER NOT NULL,
    "newPhysical" INTEGER NOT NULL,
    "reason" "MovementReason" NOT NULL,
    "note" TEXT,
    "reference" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "origin" "OrderOrigin" NOT NULL DEFAULT 'MANUAL',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "deliveryMode" "DeliveryMode" NOT NULL,
    "deliveryAddress" TEXT,
    "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingKnown" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "requiresAdvance" BOOLEAN NOT NULL DEFAULT false,
    "advanceRequired" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "advancePaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'READY_TO_PREPARE',
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_vouchers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "amountReported" DECIMAL(12,2) NOT NULL,
    "reference" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAmount" DECIMAL(12,2),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_movements_tenantId_variantId_createdAt_idx" ON "inventory_movements"("tenantId", "variantId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_tenantId_fulfillmentStatus_idx" ON "orders"("tenantId", "fulfillmentStatus");

-- CreateIndex
CREATE INDEX "orders_tenantId_paymentStatus_idx" ON "orders"("tenantId", "paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenantId_orderNumber_key" ON "orders"("tenantId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenantId_idempotencyKey_key" ON "orders"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "order_items_tenantId_orderId_idx" ON "order_items"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "stock_reservations_tenantId_status_idx" ON "stock_reservations"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_reservations_orderId_variantId_key" ON "stock_reservations"("orderId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_vouchers_storageKey_key" ON "payment_vouchers"("storageKey");

-- CreateIndex
CREATE INDEX "payment_vouchers_tenantId_orderId_idx" ON "payment_vouchers"("tenantId", "orderId");

-- CreateIndex
CREATE INDEX "order_events_tenantId_orderId_createdAt_idx" ON "order_events"("tenantId", "orderId", "createdAt");

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Invariantes de inventario (PostgreSQL CHECK).
ALTER TABLE "product_variants" ADD CONSTRAINT "stock_physical_non_negative" CHECK ("stockPhysical" >= 0);
ALTER TABLE "product_variants" ADD CONSTRAINT "stock_reserved_non_negative" CHECK ("stockReserved" >= 0);
ALTER TABLE "product_variants" ADD CONSTRAINT "reserved_not_above_physical" CHECK ("stockPhysical" >= "stockReserved");
ALTER TABLE "stock_reservations" ADD CONSTRAINT "reservation_quantity_positive" CHECK (quantity > 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_item_quantity_positive" CHECK (quantity > 0);
ALTER TABLE "orders" ADD CONSTRAINT "order_totals_non_negative" CHECK ("subtotal" >= 0 AND "total" >= 0 AND "advanceRequired" >= 0 AND "advancePaid" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "advance_paid_within_required" CHECK ("advancePaid" <= "advanceRequired");

-- Numeración de pedidos segura y concurrente por negocio.
CREATE TABLE IF NOT EXISTS "order_number_sequences" (
  "tenantId" TEXT NOT NULL PRIMARY KEY REFERENCES "tenants"("id") ON DELETE CASCADE,
  "lastNumber" INTEGER NOT NULL DEFAULT 0
);
CREATE OR REPLACE FUNCTION next_order_number(p_tenant_id TEXT) RETURNS INTEGER AS $$
DECLARE v_number INTEGER;
BEGIN
  INSERT INTO "order_number_sequences" ("tenantId", "lastNumber")
  VALUES (p_tenant_id, 1)
  ON CONFLICT ("tenantId") DO UPDATE SET "lastNumber" = "order_number_sequences"."lastNumber" + 1
  RETURNING "lastNumber" INTO v_number;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

