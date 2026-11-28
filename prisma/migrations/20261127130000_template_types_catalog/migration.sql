-- Catálogo de tipos de plantilla configurable por negocio (como las categorías).
CREATE TABLE "template_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "template_types_tenantId_slug_key" ON "template_types"("tenantId", "slug");
CREATE INDEX "template_types_tenantId_idx" ON "template_types"("tenantId");

ALTER TABLE "template_types" ADD CONSTRAINT "template_types_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Las plantillas existentes conservan su tipo: el enum pasa a texto.
ALTER TABLE "message_templates" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
DROP TYPE "TemplateType";

-- Tipos predeterminados para los tenants existentes (los nuevos se crean en el servicio).
INSERT INTO "template_types" ("id", "tenantId", "name", "slug", "description", "isSystem", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."id", v."name", v."slug", NULL, true, NOW(), NOW()
FROM "tenants" t
CROSS JOIN (VALUES
    ('MESSAGE', 'Mensaje'),
    ('CHECKOUT', 'Checkout'),
    ('GREETING', 'Saludo'),
    ('PRODUCT', 'Presentación de producto'),
    ('PROMOTION', 'Promoción'),
    ('FOLLOW_UP', 'Seguimiento'),
    ('CONFIRMATION', 'Confirmación'),
    ('DELIVERY', 'Entrega'),
    ('THANKS', 'Agradecimiento'),
    ('FAQ', 'Pregunta / FAQ')
) AS v("slug", "name")
ON CONFLICT ("tenantId", "slug") DO NOTHING;
