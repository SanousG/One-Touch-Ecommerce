import "server-only";
import { Prisma } from "@prisma/client";
import {
  assertFulfillmentManager,
  assertInventoryAdjustment,
  assertOrderManager,
  assertPaymentVerification,
} from "../auth/permissions";
import { getPrisma } from "../db/prisma";
import { getApiCatalogContext, requireCatalogContext } from "../catalog/service";
import type {
  Actor,
  AttentionItemDTO,
  CreateOrderInput,
  InventoryRowDTO,
  MovementDTO,
  OrderDTO,
} from "./types";

export class CommerceError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "CommerceError";
  }
}

export class CommerceNotFoundError extends Error {
  constructor(message = "Recurso no encontrado") {
    super(message);
    this.name = "CommerceNotFoundError";
  }
}

export class CommerceConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommerceConflictError";
  }
}

export async function requireCommerceActor(): Promise<Actor> {
  return requireCatalogContext();
}

export async function getApiCommerceActor(request: Request): Promise<Actor> {
  return getApiCatalogContext(request);
}

function decimal(value: unknown, field: string, allowZero = true): Prisma.Decimal {
  const text = String(value ?? "").trim();
  const amount = Number(text);
  if (!text || !Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0)) {
    throw new CommerceError(`${field} debe ser un importe válido`, 400);
  }
  return new Prisma.Decimal(amount.toFixed(2));
}

function cleanText(value: unknown, field: string, max: number, required = false): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw new CommerceError(`${field} es obligatorio`, 400);
  if (text.length > max) throw new CommerceError(`${field} excede ${max} caracteres`, 400);
  if (/[<>]/.test(text)) throw new CommerceError(`${field} no puede contener HTML`, 400);
  return text || null;
}

function imageUrl(imageId: string) {
  return `/api/admin/products/images/${imageId}/file`;
}

function toInventoryRow(row: {
  variant: { id: string; sku: string; name: string; stockPhysical: number; stockReserved: number; isActive: boolean; productId: string; product: { name: string; images: { id: string }[] } };
}): InventoryRowDTO {
  return {
    variantId: row.variant.id,
    productId: row.variant.productId,
    productName: row.variant.product.name,
    variantName: row.variant.name,
    sku: row.variant.sku,
    physical: row.variant.stockPhysical,
    reserved: row.variant.stockReserved,
    available: row.variant.stockPhysical - row.variant.stockReserved,
    isActive: row.variant.isActive,
    coverUrl: row.variant.product.images[0] ? imageUrl(row.variant.product.images[0].id) : null,
  };
}

export async function listInventory(actor: Actor, q = ""): Promise<InventoryRowDTO[]> {
  const rows = await getPrisma().productVariant.findMany({
    where: {
      tenantId: actor.tenantId,
      ...(q
        ? {
            OR: [
              { sku: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
              { product: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    include: { product: { select: { name: true, images: { orderBy: { position: "asc" as const }, take: 1, select: { id: true } } } } },
    orderBy: [{ product: { name: "asc" } }, { name: "asc" }],
  });
  return rows.map((variant) => toInventoryRow({ variant }));
}

export async function adjustStock(
  actor: Actor,
  input: { variantId?: unknown; delta?: unknown; reason?: unknown; note?: unknown; reference?: unknown },
): Promise<InventoryRowDTO> {
  assertInventoryAdjustment(actor.role);
  if (typeof input.variantId !== "string" || !input.variantId) throw new CommerceError("Variante no válida", 400);
  const delta = Number(input.delta);
  if (!Number.isInteger(delta) || delta === 0) throw new CommerceError("La cantidad debe ser un entero distinto de cero", 400);
  const validReasons = ["INITIAL", "RESTOCK", "DAMAGE", "COUNT_CORRECTION", "OTHER"];
  const reason = String(input.reason ?? "");
  if (!validReasons.includes(reason)) throw new CommerceError("Motivo de ajuste no válido", 400);

  await getPrisma().$transaction(async (tx) => {
    // Bloqueo de fila para evitar ajustes concurrentes sobre la misma variante.
    const locked = await tx.$queryRaw<{ id: string; stockPhysical: number; stockReserved: number }[]>`
      SELECT id, "stockPhysical", "stockReserved" FROM product_variants
      WHERE id = ${input.variantId} AND "tenantId" = ${actor.tenantId} FOR UPDATE
    `;
    const variant = locked[0];
    if (!variant) throw new CommerceNotFoundError("Variante no encontrada");
    const next = variant.stockPhysical + delta;
    if (next < 0) throw new CommerceError("El stock físico no puede ser negativo", 400);
    if (next < variant.stockReserved) {
      throw new CommerceError(`El ajuste dejaría ${next} físicas por debajo de ${variant.stockReserved} reservadas`, 409);
    }
    await tx.productVariant.update({ where: { id: variant.id }, data: { stockPhysical: next } });
    await tx.inventoryMovement.create({
      data: {
        tenantId: actor.tenantId,
        variantId: variant.id,
        delta,
        previousPhysical: variant.stockPhysical,
        newPhysical: next,
        reason: reason as never,
        note: cleanText(input.note, "Nota", 300),
        reference: cleanText(input.reference, "Referencia", 80),
        createdById: actor.userId,
      },
    });
  });

  return listInventory(actor).then((rows) => rows.find((row) => row.variantId === input.variantId)!);
}

export async function listMovements(actor: Actor, variantId?: string): Promise<MovementDTO[]> {
  const rows = await getPrisma().inventoryMovement.findMany({
    where: { tenantId: actor.tenantId, ...(variantId ? { variantId } : {}) },
    include: { variant: { select: { sku: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    variantId: row.variantId,
    delta: row.delta,
    previousPhysical: row.previousPhysical,
    newPhysical: row.newPhysical,
    reason: row.reason,
    note: row.note,
    reference: row.reference,
    createdBy: row.createdById === actor.userId ? actor.userId : row.createdById,
    createdAt: row.createdAt.toISOString(),
  }));
}

const orderInclude = {
  items: true,
  vouchers: true,
  events: { orderBy: { createdAt: "asc" as const } },
} as const;

function toVoucherDTO(voucher: {
  id: string; fileName: string; amountReported: Prisma.Decimal; reference: string | null;
  verified: boolean; verifiedAmount: Prisma.Decimal | null; verifiedAt: Date | null;
}): OrderDTO["vouchers"][number] {
  return {
    id: voucher.id,
    fileName: voucher.fileName,
    amountReported: voucher.amountReported.toFixed(2),
    reference: voucher.reference,
    verified: voucher.verified,
    verifiedAmount: voucher.verifiedAmount?.toFixed(2) ?? null,
    verifiedAt: voucher.verifiedAt?.toISOString() ?? null,
    url: `/api/admin/orders/vouchers/${voucher.id}/file`,
  };
}

function toOrderDTO(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>): OrderDTO {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    origin: order.origin,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryMode: order.deliveryMode,
    deliveryAddress: order.deliveryAddress,
    shippingCost: order.shippingCost.toFixed(2),
    shippingKnown: order.shippingKnown,
    paymentMethod: order.paymentMethod,
    requiresAdvance: order.requiresAdvance,
    advanceRequired: order.advanceRequired.toFixed(2),
    advancePaid: order.advancePaid.toFixed(2),
    subtotal: order.subtotal.toFixed(2),
    total: order.total.toFixed(2),
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    notes: order.notes,
    confirmedAt: order.confirmedAt.toISOString(),
    shippedAt: order.shippedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      lineTotal: item.lineTotal.toFixed(2),
    })),
    vouchers: order.vouchers.map(toVoucherDTO),
    events: order.events.map((event) => ({
      id: event.id,
      type: event.type,
      description: event.description,
      amount: event.amount?.toFixed(2) ?? null,
      createdBy: event.createdById,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

async function findOwnedOrder(actor: Actor, orderId: string) {
  const order = await getPrisma().order.findFirst({
    where: { id: orderId, tenantId: actor.tenantId },
    include: orderInclude,
  });
  if (!order) throw new CommerceNotFoundError("Pedido no encontrado");
  return order;
}

export async function getOrder(actor: Actor, orderId: string): Promise<OrderDTO> {
  return toOrderDTO(await findOwnedOrder(actor, orderId));
}

export async function listOrders(actor: Actor): Promise<OrderDTO[]> {
  const rows = await getPrisma().order.findMany({
    where: { tenantId: actor.tenantId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrderDTO);
}

export async function createOrder(actor: Actor, input: CreateOrderInput, idempotencyKey?: string): Promise<OrderDTO> {
  assertOrderManager(actor.role);
  if (!Array.isArray(input.items) || input.items.length === 0) throw new CommerceError("El pedido necesita al menos un producto", 400);
  if (input.items.length > 30) throw new CommerceError("Máximo 30 líneas por pedido", 400);

  const normalized = input.items.map((item) => {
    const quantity = Number(item?.quantity);
    if (typeof item?.variantId !== "string" || !item.variantId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new CommerceError("Cantidades no válidas", 400);
    }
    return { variantId: item.variantId, quantity };
  });
  // Rechazar variantes duplicadas en la misma solicitud.
  if (new Set(normalized.map((item) => item.variantId)).size !== normalized.length) {
    throw new CommerceError("No repetir variantes; ajuste la cantidad", 400);
  }

  const customerName = cleanText(input.customerName, "Nombre del cliente", 120, true)!;
  const customerPhone = cleanText(input.customerPhone, "WhatsApp del cliente", 40, true)!;
  const deliveryMode = input.deliveryMode === "PICKUP" ? "PICKUP" : "LOCAL";
  const paymentMethod = input.paymentMethod === "TRANSFER" ? "TRANSFER" : "CASH_ON_DELIVERY";
  const requiresAdvance = input.requiresAdvance === true;
  const advanceRequired = requiresAdvance ? decimal(input.advanceRequired, "Adelanto requerido", false) : new Prisma.Decimal(0);
  const shippingCost = decimal(input.shippingCost ?? 0, "Costo de envío");
  const shippingKnown = input.shippingKnown !== false;

  if (idempotencyKey) {
    const existing = await getPrisma().order.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: actor.tenantId, idempotencyKey } },
      include: orderInclude,
    });
    if (existing) return toOrderDTO(existing);
  }

  const orderId = await getPrisma().$transaction(async (tx) => {
    const variants = await tx.productVariant.findMany({
      where: { id: { in: normalized.map((item) => item.variantId) }, tenantId: actor.tenantId },
      include: { product: { select: { name: true, status: true, storeVisible: true } } },
    });
    if (variants.length !== normalized.length) throw new CommerceError("Alguna variante no pertenece al negocio", 400);
    const byId = new Map(variants.map((variant) => [variant.id, variant]));

    // Bloquear y validar disponibilidad de TODAS las variantes antes de cualquier reserva.
    let subtotal = new Prisma.Decimal(0);
    const lineData: {
      tenantId: string; variantId: string; productName: string; variantName: string;
      sku: string; quantity: number; unitPrice: Prisma.Decimal; lineTotal: Prisma.Decimal;
    }[] = [];
    for (const item of normalized) {
      const locked = await tx.$queryRaw<{ id: string; stockPhysical: number; stockReserved: number }[]>`
        SELECT id, "stockPhysical", "stockReserved" FROM product_variants
        WHERE id = ${item.variantId} AND "tenantId" = ${actor.tenantId} FOR UPDATE
      `;
      const row = locked[0];
      if (!row) throw new CommerceError("Variante no encontrada", 400);
      if (!byId.get(item.variantId)!.isActive) throw new CommerceError(`La variante ${byId.get(item.variantId)!.sku} está inactiva`, 409);
      const available = row.stockPhysical - row.stockReserved;
      if (available < item.quantity) {
        throw new CommerceConflictError(`Stock insuficiente para ${byId.get(item.variantId)!.sku}: disponibles ${available}, solicitadas ${item.quantity}`);
      }
      const unitPrice = byId.get(item.variantId)!.price;
      const lineTotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);
      lineData.push({
        tenantId: actor.tenantId,
        variantId: item.variantId,
        productName: byId.get(item.variantId)!.product.name,
        variantName: byId.get(item.variantId)!.name,
        sku: byId.get(item.variantId)!.sku,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      });
    }

    const numberRow = await tx.$queryRaw<{ next_order_number: number }[]>`
      SELECT next_order_number(${actor.tenantId}) AS next_order_number
    `;
    const orderNumber = Number(numberRow[0].next_order_number);
    const total = subtotal.add(shippingCost);

    const order = await tx.order.create({
      data: {
        tenantId: actor.tenantId,
        orderNumber,
        origin: "MANUAL",
        customerName,
        customerPhone,
        deliveryMode,
        deliveryAddress: cleanText(input.deliveryAddress, "Dirección", 300),
        shippingCost,
        shippingKnown,
        paymentMethod,
        requiresAdvance,
        advanceRequired,
        subtotal,
        total,
        paymentStatus: requiresAdvance ? "ADVANCE_PENDING" : "PENDING",
        fulfillmentStatus: requiresAdvance ? "WAITING_ADVANCE" : "READY_TO_PREPARE",
        notes: cleanText(input.notes, "Notas", 600),
        idempotencyKey: idempotencyKey ?? null,
      },
    });

    await tx.orderItem.createMany({ data: lineData.map((line) => ({ ...line, orderId: order.id })) });

    for (const item of normalized) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockReserved: { increment: item.quantity } },
      });
      await tx.stockReservation.create({
        data: {
          tenantId: actor.tenantId,
          orderId: order.id,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      });
      await tx.inventoryMovement.create({
        data: {
          tenantId: actor.tenantId,
          variantId: item.variantId,
          delta: 0,
          previousPhysical: byId.get(item.variantId)!.stockPhysical,
          newPhysical: byId.get(item.variantId)!.stockPhysical,
          reason: "OTHER",
          note: `Reserva por pedido #${orderNumber}`,
          reference: `ORDER-${orderNumber}`,
          createdById: actor.userId,
        },
      });
    }

    await tx.orderEvent.create({
      data: {
        tenantId: actor.tenantId,
        orderId: order.id,
        type: "CREATED",
        description: `Pedido #${orderNumber} confirmado; ${normalized.length} línea(s), ${normalized.reduce((sum, item) => sum + item.quantity, 0)} unidad(es) reservadas.`,
        createdById: actor.userId,
      },
    });

    return order.id;
  });

  return getOrder(actor, orderId);
}

export async function attachVoucher(
  actor: Actor,
  orderId: string,
  file: { storageKey: string; fileName: string; mimeType: string; sizeBytes: number },
  input: { amountReported?: unknown; reference?: unknown },
): Promise<OrderDTO> {
  assertPaymentVerification(actor.role);
  const order = await findOwnedOrder(actor, orderId);
  if (["CANCELLED", "DELIVERED", "PAID"].includes(order.paymentStatus) || order.fulfillmentStatus === "CANCELLED") {
    throw new CommerceError("No se pueden adjuntar comprobantes a este pedido", 409);
  }
  const amountReported = decimal(input.amountReported, "Monto reportado", false);
  await getPrisma().$transaction(async (tx) => {
    await tx.paymentVoucher.create({
      data: {
        tenantId: actor.tenantId,
        orderId,
        storageKey: file.storageKey,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        amountReported,
        reference: cleanText(input.reference, "Referencia", 80),
        createdById: actor.userId,
      },
    });
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: "VOUCHER_RECEIVED" } });
    await tx.orderEvent.create({
      data: {
        tenantId: actor.tenantId,
        orderId,
        type: "VOUCHER_RECEIVED",
        description: `Comprobante adjunto por ${amountReported.toFixed(2)}. Pendiente de verificación.`,
        amount: amountReported,
        createdById: actor.userId,
      },
    });
  });
  return getOrder(actor, orderId);
}

export async function verifyAdvance(
  actor: Actor,
  orderId: string,
  input: { voucherId?: unknown; amount?: unknown; reference?: unknown },
): Promise<OrderDTO> {
  assertPaymentVerification(actor.role);
  if (typeof input.voucherId !== "string" || !input.voucherId) throw new CommerceError("Comprobante no válido", 400);
  const order = await findOwnedOrder(actor, orderId);
  const voucher = await getPrisma().paymentVoucher.findFirst({
    where: { id: input.voucherId, orderId, tenantId: actor.tenantId },
  });
  if (!voucher) throw new CommerceNotFoundError("Comprobante no encontrado");
  if (voucher.verified) throw new CommerceConflictError("El comprobante ya fue verificado");
  const amount = decimal(input.amount ?? voucher.amountReported, "Monto verificado", false);
  const remaining = order.advanceRequired.sub(order.advancePaid);
  if (amount.gt(remaining)) {
    throw new CommerceError(`El monto excede el adelanto pendiente (${remaining.toFixed(2)})`, 400);
  }
  const newPaid = order.advancePaid.add(amount);
  const fullyPaid = !order.requiresAdvance || newPaid.gte(order.advanceRequired);

  await getPrisma().$transaction(async (tx) => {
    await tx.paymentVoucher.update({
      where: { id: voucher.id },
      data: {
        verified: true,
        verifiedAmount: amount,
        verifiedById: actor.userId,
        verifiedAt: new Date(),
        reference: cleanText(input.reference, "Referencia de pago", 80) ?? voucher.reference,
      },
    });
    await tx.order.update({
      where: { id: orderId },
      data: {
        advancePaid: newPaid,
        paymentStatus: fullyPaid ? "ADVANCE_VERIFIED" : "VOUCHER_RECEIVED",
        // Verificar NO inicia la preparación: el vendedor debe hacerlo explícitamente.
        fulfillmentStatus: fullyPaid && order.fulfillmentStatus === "WAITING_ADVANCE" ? "READY_TO_PREPARE" : order.fulfillmentStatus,
      },
    });
    await tx.orderEvent.create({
      data: {
        tenantId: actor.tenantId,
        orderId,
        type: "ADVANCE_VERIFIED",
        description: `Adelanto verificado manualmente por ${amount.toFixed(2)}.${fullyPaid ? " Requiere iniciar preparación." : " Aún falta saldo por verificar."}`,
        amount,
        createdById: actor.userId,
      },
    });
  });
  return getOrder(actor, orderId);
}

export async function recordPayment(actor: Actor, orderId: string, input: { amount?: unknown; reference?: unknown }): Promise<OrderDTO> {
  assertPaymentVerification(actor.role);
  const order = await findOwnedOrder(actor, orderId);
  const amount = decimal(input.amount, "Monto cobrado", false);
  const remaining = order.total.sub(order.advancePaid);
  if (amount.gt(remaining)) throw new CommerceError(`El monto excede el saldo pendiente (${remaining.toFixed(2)})`, 400);
  await getPrisma().$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        advancePaid: order.advancePaid.add(amount),
        paymentStatus: order.advancePaid.add(amount).gte(order.total) ? "PAID" : "ADVANCE_VERIFIED",
      },
    });
    await tx.orderEvent.create({
      data: {
        tenantId: actor.tenantId,
        orderId,
        type: "PAYMENT_RECORDED",
        description: `Cobo registrado manualmente por ${amount.toFixed(2)}.`,
        amount,
        createdById: actor.userId,
      },
    });
  });
  return getOrder(actor, orderId);
}

async function releaseReservations(tx: Prisma.TransactionClient, actor: Actor, orderId: string) {
  const reservations = await tx.stockReservation.findMany({
    where: { orderId, tenantId: actor.tenantId, status: "ACTIVE" },
  });
  for (const reservation of reservations) {
    await tx.productVariant.update({
      where: { id: reservation.variantId },
      data: { stockReserved: { decrement: reservation.quantity } },
    });
    await tx.stockReservation.update({
      where: { id: reservation.id },
      data: { status: "RELEASED", releasedAt: new Date() },
    });
  }
}

export async function transitionOrder(
  actor: Actor,
  orderId: string,
  action: "START_PREPARATION" | "SHIP" | "DELIVER" | "CANCEL",
): Promise<OrderDTO> {
  assertFulfillmentManager(actor.role);
  const order = await findOwnedOrder(actor, orderId);

  if (action === "START_PREPARATION") {
    if (order.fulfillmentStatus === "CANCELLED") throw new CommerceError("Pedido cancelado", 409);
    if (order.requiresAdvance && !["ADVANCE_VERIFIED", "PAID"].includes(order.paymentStatus)) {
      throw new CommerceError("No se puede preparar hasta verificar el adelanto requerido", 409);
    }
    if (!["READY_TO_PREPARE", "PREPARING"].includes(order.fulfillmentStatus)) {
      throw new CommerceError("Transición no permitida", 409);
    }
    await getPrisma().$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { fulfillmentStatus: "PREPARING" } });
      await tx.orderEvent.create({
        data: { tenantId: actor.tenantId, orderId, type: "PREPARATION_STARTED", description: "Preparación iniciada.", createdById: actor.userId },
      });
    });
  }

  if (action === "SHIP") {
    if (order.fulfillmentStatus !== "PREPARING") throw new CommerceError("Solo se puede despachar un pedido en preparación", 409);
    await getPrisma().$transaction(async (tx) => {
      const reservations = await tx.stockReservation.findMany({
        where: { orderId, tenantId: actor.tenantId, status: "ACTIVE" },
      });
      for (const reservation of reservations) {
        await tx.productVariant.update({
          where: { id: reservation.variantId },
          data: {
            stockPhysical: { decrement: reservation.quantity },
            stockReserved: { decrement: reservation.quantity },
          },
        });
        await tx.stockReservation.update({
          where: { id: reservation.id },
          data: { status: "CONSUMED", consumedAt: new Date() },
        });
      }
      await tx.order.update({
        where: { id: orderId },
        data: { fulfillmentStatus: "SHIPPED", shippedAt: new Date() },
      });
      await tx.orderEvent.create({
        data: { tenantId: actor.tenantId, orderId, type: "SHIPPED", description: "Pedido despachado; stock físico y reservado descontados.", createdById: actor.userId },
      });
    });
  }

  if (action === "DELIVER") {
    if (order.fulfillmentStatus !== "SHIPPED") throw new CommerceError("Solo se puede entregar un pedido despachado", 409);
    await getPrisma().$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { fulfillmentStatus: "DELIVERED", deliveredAt: new Date() } });
      await tx.orderEvent.create({
        data: { tenantId: actor.tenantId, orderId, type: "DELIVERED", description: "Entrega registrada. El estado de pago no se modifica.", createdById: actor.userId },
      });
    });
  }

  if (action === "CANCEL") {
    if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.fulfillmentStatus)) {
      throw new CommerceError("No se puede cancelar en este estado", 409);
    }
    await getPrisma().$transaction(async (tx) => {
      await releaseReservations(tx, actor, orderId);
      await tx.order.update({ where: { id: orderId }, data: { fulfillmentStatus: "CANCELLED", cancelledAt: new Date() } });
      await tx.orderEvent.create({
        data: { tenantId: actor.tenantId, orderId, type: "CANCELLED", description: "Pedido cancelado; reservas liberadas.", createdById: actor.userId },
      });
    });
  }

  return getOrder(actor, orderId);
}

export async function getAttention(actor: Actor): Promise<AttentionItemDTO[]> {
  const [vouchers, waiting] = await Promise.all([
    getPrisma().paymentVoucher.findMany({
      where: { tenantId: actor.tenantId, verified: false, order: { fulfillmentStatus: { not: "CANCELLED" } } },
      include: { order: { select: { id: true, orderNumber: true, customerName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getPrisma().order.findMany({
      where: { tenantId: actor.tenantId, fulfillmentStatus: "READY_TO_PREPARE" },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return [
    ...vouchers.map((voucher) => ({
      type: "VOUCHER_RECEIVED" as const,
      orderId: voucher.order.id,
      orderNumber: voucher.order.orderNumber,
      customerName: voucher.order.customerName,
      description: `Comprobante por S/ ${voucher.amountReported.toFixed(2)} por verificar`,
      createdAt: voucher.createdAt.toISOString(),
    })),
    ...waiting.map((order) => ({
      type: "WAITING_PREPARATION" as const,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      description: "Pedido listo para preparación",
      createdAt: order.createdAt.toISOString(),
    })),
  ];
}

/** Contrato para el futuro chatbot: disponibilidad y resumen, sin crear pedidos. */
export async function getVariantAvailability(tenantId: string, variantId: string) {
  const variant = await getPrisma().productVariant.findFirst({
    where: { id: variantId, tenantId, isActive: true },
    select: { id: true, sku: true, name: true, price: true, stockPhysical: true, stockReserved: true },
  });
  if (!variant) return null;
  return {
    variantId: variant.id,
    sku: variant.sku,
    name: variant.name,
    price: variant.price.toFixed(2),
    available: variant.stockPhysical - variant.stockReserved,
  };
}
