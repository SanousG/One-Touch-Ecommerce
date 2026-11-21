-- CreateEnum
CREATE TYPE "WhatsAppProviderKind" AS ENUM ('WASENDER', 'META');

-- CreateEnum
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING', 'CONNECTED', 'CONNECTING', 'NEEDS_LINKING', 'DISCONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('PENDING', 'HUMAN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ConversationMode" AS ENUM ('HUMAN', 'BOT');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO', 'STICKER', 'LOCATION', 'CONTACT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACCEPTED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboundStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'UNCERTAIN');

-- CreateEnum
CREATE TYPE "ConversationEventType" AS ENUM ('CREATED', 'ASSIGNED', 'UNASSIGNED', 'RESOLVED', 'REOPENED', 'MODE_CHANGED', 'MESSAGE_IN', 'MESSAGE_OUT');

-- DropForeignKey
ALTER TABLE "order_number_sequences" DROP CONSTRAINT "order_number_sequences_tenantId_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "conversationId" TEXT;

-- CreateTable
CREATE TABLE "whatsapp_connections" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "WhatsAppProviderKind" NOT NULL,
    "name" TEXT NOT NULL,
    "expectedPhone" TEXT,
    "externalSessionId" TEXT,
    "status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "providerStatus" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "credentials" TEXT NOT NULL,
    "credentialsVersion" INTEGER NOT NULL DEFAULT 1,
    "webhookId" TEXT NOT NULL,
    "webhookSecretHash" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_contacts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "phone" TEXT,
    "lid" TEXT,
    "addressingMode" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'PENDING',
    "mode" "ConversationMode" NOT NULL DEFAULT 'HUMAN',
    "assignedToId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessage" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "context" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "externalId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "kind" "MessageKind" NOT NULL DEFAULT 'TEXT',
    "authorName" TEXT,
    "content" TEXT,
    "media" JSONB NOT NULL DEFAULT '{}',
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "providerStatus" TEXT,
    "eventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "type" "ConversationEventType" NOT NULL,
    "description" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "connectionId" TEXT,
    "provider" "WhatsAppProviderKind" NOT NULL,
    "event" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "conversationMessageId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "OutboundStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_externalSessionId_key" ON "whatsapp_connections"("externalSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_webhookId_key" ON "whatsapp_connections"("webhookId");

-- CreateIndex
CREATE INDEX "whatsapp_connections_tenantId_isPrimary_idx" ON "whatsapp_connections"("tenantId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_connections_tenantId_name_key" ON "whatsapp_connections"("tenantId", "name");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_tenantId_phone_idx" ON "whatsapp_contacts"("tenantId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contacts_connectionId_externalId_key" ON "whatsapp_contacts"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "conversations_tenantId_status_lastMessageAt_idx" ON "conversations"("tenantId", "status", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_connectionId_contactId_key" ON "conversations"("connectionId", "contactId");

-- CreateIndex
CREATE INDEX "conversation_messages_tenantId_conversationId_createdAt_idx" ON "conversation_messages"("tenantId", "conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_messages_connectionId_externalId_key" ON "conversation_messages"("connectionId", "externalId");

-- CreateIndex
CREATE INDEX "conversation_events_tenantId_conversationId_createdAt_idx" ON "conversation_events"("tenantId", "conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_dedupeKey_key" ON "webhook_events"("dedupeKey");

-- CreateIndex
CREATE INDEX "webhook_events_tenantId_createdAt_idx" ON "webhook_events"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "outbound_messages_conversationMessageId_key" ON "outbound_messages"("conversationMessageId");

-- CreateIndex
CREATE INDEX "outbound_messages_status_nextAttemptAt_idx" ON "outbound_messages"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "outbound_messages_connectionId_providerMessageId_key" ON "outbound_messages"("connectionId", "providerMessageId");

-- CreateIndex
CREATE INDEX "orders_tenantId_conversationId_idx" ON "orders"("tenantId", "conversationId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "whatsapp_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_conversationMessageId_fkey" FOREIGN KEY ("conversationMessageId") REFERENCES "conversation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
