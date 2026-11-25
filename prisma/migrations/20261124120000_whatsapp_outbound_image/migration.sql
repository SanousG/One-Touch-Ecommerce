-- OutboundMessage admite imágenes enviadas desde la bandeja.
ALTER TABLE "outbound_messages" ADD COLUMN "kind" "MessageKind" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "outbound_messages" ADD COLUMN "mediaUrl" TEXT;
