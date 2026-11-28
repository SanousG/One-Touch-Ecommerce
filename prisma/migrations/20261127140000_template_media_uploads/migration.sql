-- Adjuntos propios de plantillas (foto/video), independientes del catálogo de productos.
CREATE TABLE "template_media" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "template_media_storageKey_key" ON "template_media"("storageKey");
CREATE INDEX "template_media_tenantId_idx" ON "template_media"("tenantId");

ALTER TABLE "template_media" ADD CONSTRAINT "template_media_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_templates" ADD COLUMN "mediaId" TEXT;

ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "template_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
