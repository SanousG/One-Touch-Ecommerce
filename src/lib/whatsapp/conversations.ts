import "server-only";
import { createHash } from "node:crypto";
import { Prisma, type WhatsAppConnection } from "@prisma/client";
import { assertInboxManager } from "../auth/permissions";
import { getPrisma } from "../db/prisma";
import { getApiCatalogContext, requireCatalogContext } from "../catalog/service";
import type { CatalogActor } from "../catalog/service";
import { getConnectionProvider } from "./connection-access";
import { sanitizePayload } from "./providers/wasender/webhook";
import type { NormalizedMessage } from "./types";

export class InboxError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "InboxError";
  }
}

export type ConversationDTO = {
  id: string;
  contactName: string;
  contactPhone: string | null;
  contactLid: string | null;
  status: string;
  mode: string;
  assignedTo: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  context: Record<string, unknown>;
};

export type MessageDTO = {
  id: string;
  direction: string;
  kind: string;
  author: string | null;
  content: string | null;
  status: string;
  createdAt: string;
};

export type ConversationDetailDTO = ConversationDTO & {
  messages: MessageDTO[];
  events: Array<{ id: string; type: string; description: string; createdAt: string }>;
  orders: Array<{ id: string; orderNumber: number; total: string; paymentStatus: string; fulfillmentStatus: string }>;
};

export async function requireInboxActor(): Promise<CatalogActor> {
  return requireCatalogContext();
}

export async function getApiInboxActor(request: Request): Promise<CatalogActor> {
  return getApiCatalogContext(request);
}

function contactLabel(contact: { displayName: string | null; phone: string | null; externalId: string }): string {
  return contact.displayName || contact.phone || contact.externalId.slice(0, 24);
}

function toDTO(row: Prisma.ConversationGetPayload<{ include: { contact: true } }>): ConversationDTO {
  return {
    id: row.id,
    contactName: contactLabel(row.contact),
    contactPhone: row.contact.phone,
    contactLid: row.contact.lid,
    status: row.status,
    mode: row.mode,
    assignedTo: row.assignedToId,
    lastMessage: row.lastMessage,
    lastMessageAt: row.lastMessageAt.toISOString(),
    unreadCount: row.unreadCount,
    context: (row.context ?? {}) as Record<string, unknown>,
  };
}

export async function listConversations(actor: CatalogActor, status?: string, q?: string): Promise<ConversationDTO[]> {
  const where: Prisma.ConversationWhereInput = { tenantId: actor.tenantId };
  if (status && ["PENDING", "HUMAN", "RESOLVED"].includes(status)) where.status = status as never;
  if (q) {
    where.contact = {
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { externalId: { contains: q, mode: "insensitive" } },
      ],
    };
  }
  const rows = await getPrisma().conversation.findMany({
    where,
    include: { contact: true },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });
  return rows.map(toDTO);
}

async function ownedConversation(actor: CatalogActor, id: string) {
  const row = await getPrisma().conversation.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: { contact: true },
  });
  if (!row) throw new InboxError("Conversación no encontrada", 404);
  return row;
}

export async function getConversation(actor: CatalogActor, id: string): Promise<ConversationDetailDTO> {
  const row = await ownedConversation(actor, id);
  const [messages, events, orders] = await Promise.all([
    getPrisma().conversationMessage.findMany({
      where: { conversationId: id, tenantId: actor.tenantId },
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
    getPrisma().conversationEvent.findMany({
      where: { conversationId: id, tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getPrisma().order.findMany({
      where: { conversationId: id, tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true, total: true, paymentStatus: true, fulfillmentStatus: true },
    }),
  ]);
  return {
    ...toDTO(row),
    messages: messages.map((message) => ({
      id: message.id,
      direction: message.direction,
      kind: message.kind,
      author: message.authorName,
      content: message.content,
      status: message.status,
      createdAt: message.createdAt.toISOString(),
    })),
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      description: event.description,
      createdAt: event.createdAt.toISOString(),
    })),
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total.toFixed(2),
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
    })),
  };
}

async function event(tenantId: string, conversationId: string, type: "ASSIGNED" | "UNASSIGNED" | "RESOLVED" | "REOPENED" | "MODE_CHANGED" | "MESSAGE_OUT", description: string, actorId: string) {
  await getPrisma().conversationEvent.create({
    data: { tenantId, conversationId, type, description, actorId },
  });
}

export async function takeConversation(actor: CatalogActor, id: string): Promise<ConversationDTO> {
  assertInboxManager(actor.role);
  const row = await ownedConversation(actor, id);
  const updated = await getPrisma().$transaction(async (tx) => {
    const current = await tx.conversation.findFirst({ where: { id, tenantId: actor.tenantId } });
    if (!current) throw new InboxError("Conversación no encontrada", 404);
    if (current.assignedToId && current.assignedToId !== actor.userId) {
      throw new InboxError("Otro vendedor ya tomó esta conversación", 409);
    }
    const result = await tx.conversation.update({
      where: { id },
      data: { assignedToId: actor.userId, status: "HUMAN" },
    });
    await tx.conversationEvent.create({
      data: {
        tenantId: actor.tenantId,
        conversationId: id,
        type: "ASSIGNED",
        description: `${actor.userId} tomó la conversación`,
        actorId: actor.userId,
      },
    });
    return result;
  });
  void row;
  return toDTO({ ...updated, contact: row.contact });
}

export async function resolveConversation(actor: CatalogActor, id: string, reopen = false): Promise<ConversationDTO> {
  assertInboxManager(actor.role);
  const row = await ownedConversation(actor, id);
  const updated = await getPrisma().$transaction(async (tx) => {
    const result = await tx.conversation.update({
      where: { id },
      data: reopen ? { status: "PENDING", unreadCount: 0 } : { status: "RESOLVED", unreadCount: 0 },
    });
    await tx.conversationEvent.create({
      data: {
        tenantId: actor.tenantId,
        conversationId: id,
        type: reopen ? "REOPENED" : "RESOLVED",
        description: reopen ? "Conversación reabierta" : "Conversación resuelta",
        actorId: actor.userId,
      },
    });
    return result;
  });
  return toDTO({ ...updated, contact: row.contact });
}

export async function assignConversation(actor: CatalogActor, id: string, userId: string): Promise<ConversationDTO> {
  assertInboxManager(actor.role);
  const row = await ownedConversation(actor, id);
  const member = await getPrisma().tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: actor.tenantId, userId } },
  });
  if (!member) throw new InboxError("El usuario no pertenece al negocio", 400);
  const updated = await getPrisma().conversation.update({
    where: { id },
    data: { assignedToId: userId, status: "HUMAN" },
  });
  await event(actor.tenantId, id, "ASSIGNED", `Transferida a ${userId}`, actor.userId);
  return toDTO({ ...updated, contact: row.contact });
}

/** Encola un mensaje saliente. El worker realiza la llamada al proveedor. */
export async function sendMessage(actor: CatalogActor, conversationId: string, text: string): Promise<MessageDTO> {
  assertInboxManager(actor.role);
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 4000) throw new InboxError("El mensaje debe tener entre 1 y 4000 caracteres");
  const conversation = await ownedConversation(actor, conversationId);
  if (conversation.status === "RESOLVED") throw new InboxError("Reabra la conversación antes de responder", 409);

  const provider = getConnectionProvider({ provider: "WASENDER" });
  if (!provider?.capabilities.text) throw new InboxError("El proveedor no admite texto", 409);

  const connection = await getPrisma().whatsAppConnection.findFirst({
    where: { id: conversation.connectionId, tenantId: actor.tenantId },
  });
  if (!connection) throw new InboxError("Conexión no encontrada", 404);
  if (connection.status !== "CONNECTED") throw new InboxError("La conexión de WhatsApp no está conectada", 409);
  if (!conversation.contact.phone && !conversation.contact.externalId.includes("@")) {
    throw new InboxError("El contacto no tiene un destinatario válido", 409);
  }

  const created = await getPrisma().$transaction(async (tx) => {
    const message = await tx.conversationMessage.create({
      data: {
        tenantId: actor.tenantId,
        connectionId: connection.id,
        conversationId,
        direction: "OUTBOUND",
        kind: "TEXT",
        authorName: actor.userId,
        content: trimmed,
        status: "PENDING",
        createdAt: new Date(),
      },
    });
    await tx.outboundMessage.create({
      data: {
        tenantId: actor.tenantId,
        connectionId: connection.id,
        conversationId,
        conversationMessageId: message.id,
        to: conversation.contact.phone ?? conversation.contact.externalId,
        text: trimmed,
        status: "PENDING",
      },
    });
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: trimmed.slice(0, 200), lastMessageAt: new Date() },
    });
    await tx.conversationEvent.create({
      data: {
        tenantId: actor.tenantId,
        conversationId,
        type: "MESSAGE_OUT",
        description: "Mensaje encolado para envío",
        actorId: actor.userId,
      },
    });
    return message;
  });

  return {
    id: created.id,
    direction: created.direction,
    kind: created.kind,
    author: created.authorName,
    content: created.content,
    status: created.status,
    createdAt: created.createdAt.toISOString(),
  };
}

/** Persiste el evento antes de confirmar y lo procesa de forma idempotente. */
export async function ingestWebhook(connection: WhatsAppConnection, payload: unknown): Promise<{ duplicate: boolean; ignored: boolean }> {
  const raw = payload as Record<string, unknown>;
  const eventName = typeof raw.event === "string" ? raw.event : "unknown";
  const provider = getConnectionProvider(connection);
  const normalized = provider.normalizeWebhook(payload);
  const fingerprint = createHash("sha256").update(JSON.stringify(payload ?? {})).digest("hex").slice(0, 32);
  const messageIds = normalized.filter((item) => item.type === "message").map((item) => (item as NormalizedMessage).externalId);
  const dedupeKey = `${connection.id}:${eventName}:${messageIds[0] ?? fingerprint}`;

  try {
    await getPrisma().webhookEvent.create({
      data: {
        tenantId: connection.tenantId,
        connectionId: connection.id,
        provider: connection.provider,
        event: eventName.slice(0, 80),
        dedupeKey,
        payload: sanitizePayload(payload) as Prisma.InputJsonValue,
        status: "RECEIVED",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { duplicate: true, ignored: false };
    }
    throw error;
  }

  let ignored = true;
  try {
    for (const item of normalized) {
      if (item.type === "message") { await handleIncomingMessage(connection, item); ignored = false; }
      if (item.type === "status") { await handleStatusUpdate(connection, item); ignored = false; }
      if (item.type === "session") {
        await getPrisma().whatsAppConnection.update({
          where: { id: connection.id },
          data: { status: item.status, providerStatus: item.providerStatus, lastCheckedAt: new Date() },
        });
        ignored = false;
      }
    }
    await getPrisma().webhookEvent.update({
      where: { dedupeKey },
      data: { status: ignored ? "IGNORED" : "PROCESSED", processedAt: new Date() },
    });
  } catch (error) {
    await getPrisma().webhookEvent.update({
      where: { dedupeKey },
      data: { status: "FAILED", error: error instanceof Error ? error.message.slice(0, 300) : "error" },
    });
    throw error;
  }
  return { duplicate: false, ignored };
}

async function identifyProducts(tenantId: string, body: string) {
  const skus = await getPrisma().productVariant.findMany({
    where: { tenantId },
    select: { sku: true, name: true, price: true, productId: true, id: true, product: { select: { name: true } } },
    take: 200,
  });
  const upper = body.toUpperCase();
  return skus
    .filter((variant) => variant.sku.length >= 4 && upper.includes(variant.sku.toUpperCase()))
    .slice(0, 5)
    .map((variant) => ({
      sku: variant.sku,
      variantId: variant.id,
      productId: variant.productId,
      productName: variant.product.name,
      variantName: variant.name,
      price: variant.price.toFixed(2),
    }));
}

async function handleIncomingMessage(connection: WhatsAppConnection, item: NormalizedMessage) {
  const externalId = item.remoteJid;
  const existingContact = await getPrisma().whatsAppContact.findFirst({
    where: {
      connectionId: connection.id,
      OR: [
        { externalId },
        ...(item.phone ? [{ phone: item.phone }] : []),
        ...(item.lid ? [{ lid: item.lid }] : []),
      ],
    },
  });

  const contact = existingContact ?? await getPrisma().whatsAppContact.create({
    data: {
      tenantId: connection.tenantId,
      connectionId: connection.id,
      externalId,
      phone: item.phone,
      lid: item.lid,
      addressingMode: item.addressingMode,
      displayName: null,
    },
  });

  // Un único contacto por conexión: se reutiliza la conversación y se reabre si estaba resuelta.
  let conversation = await getPrisma().conversation.findUnique({
    where: { connectionId_contactId: { connectionId: connection.id, contactId: contact.id } },
  });
  const products = await identifyProducts(connection.tenantId, item.body);
  const context = { products } as Prisma.InputJsonValue;

  if (!conversation) {
    conversation = await getPrisma().conversation.create({
      data: {
        tenantId: connection.tenantId,
        connectionId: connection.id,
        contactId: contact.id,
        status: "PENDING",
        mode: "HUMAN",
        unreadCount: 1,
        lastMessage: item.body.slice(0, 200),
        lastMessageAt: item.eventAt ?? new Date(),
        context,
      },
    });
    await getPrisma().conversationEvent.create({
      data: { tenantId: connection.tenantId, conversationId: conversation.id, type: "CREATED", description: "Conversación creada desde un mensaje entrante" },
    });
  } else {
    const reopened = conversation.status === "RESOLVED";
    conversation = await getPrisma().conversation.update({
      where: { id: conversation.id },
      data: {
        status: reopened ? "PENDING" : conversation.status,
        unreadCount: conversation.unreadCount + 1,
        lastMessage: item.body.slice(0, 200),
        lastMessageAt: item.eventAt ?? new Date(),
        context: (products.length ? context : conversation.context) as Prisma.InputJsonValue,
      },
    });
    if (reopened) {
      await getPrisma().conversationEvent.create({
        data: { tenantId: connection.tenantId, conversationId: conversation.id, type: "REOPENED", description: "Reabierta por un mensaje del cliente" },
      });
    }
  }

  try {
    await getPrisma().conversationMessage.create({
      data: {
        tenantId: connection.tenantId,
        connectionId: connection.id,
        conversationId: conversation.id,
        externalId: item.externalId,
        direction: item.fromMe ? "OUTBOUND" : "INBOUND",
        kind: item.kind,
        authorName: item.fromMe ? connection.name : contactLabel(contact),
        content: item.body,
        status: item.fromMe ? "SENT" : "DELIVERED",
        eventAt: item.eventAt,
      },
    });
  } catch (error) {
    // Deduplicación: el mismo messageId puede llegar por received y upsert.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
}

async function handleStatusUpdate(connection: WhatsAppConnection, item: { externalId: string; status: string; providerStatus: string }) {
  const rows = await getPrisma().conversationMessage.updateMany({
    where: { connectionId: connection.id, externalId: item.externalId },
    data: { status: item.status as never, providerStatus: item.providerStatus },
  });
  if (rows.count > 0) {
    await getPrisma().outboundMessage.updateMany({
      where: { connectionId: connection.id, providerMessageId: item.externalId },
      data: { status: item.status === "FAILED" ? "FAILED" : "SENT" },
    });
  }
}
