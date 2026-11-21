-- CreateEnum
CREATE TYPE "FlowScope" AS ENUM ('PRODUCT', 'GLOBAL');

-- CreateEnum
CREATE TYPE "FlowBlockType" AS ENUM ('START', 'MESSAGE', 'DECISION', 'GLOBAL_FLOW', 'CHECKOUT', 'END');

-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('MESSAGE', 'CHECKOUT');

-- CreateEnum
CREATE TYPE "FlowEndMode" AS ENUM ('FINISH', 'HANDOFF', 'FINISH_AFTER_CONFIRMATION');

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TemplateType" NOT NULL,
    "content" TEXT NOT NULL,
    "imageId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_flows" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "scope" "FlowScope" NOT NULL DEFAULT 'PRODUCT',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "draftVersionId" TEXT,
    "publishedVersionId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_flow_versions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "templates" JSONB NOT NULL,
    "globalFlows" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_flow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_templates_tenantId_type_idx" ON "message_templates"("tenantId", "type");

-- CreateIndex
CREATE INDEX "sales_flows_tenantId_scope_idx" ON "sales_flows"("tenantId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "sales_flows_tenantId_slug_key" ON "sales_flows"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "sales_flows_tenantId_productId_key" ON "sales_flows"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "sales_flow_versions_tenantId_flowId_idx" ON "sales_flow_versions"("tenantId", "flowId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_flow_versions_flowId_version_key" ON "sales_flow_versions"("flowId", "version");

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "product_images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_flows" ADD CONSTRAINT "sales_flows_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_flows" ADD CONSTRAINT "sales_flows_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_flows" ADD CONSTRAINT "sales_flows_draftVersionId_fkey" FOREIGN KEY ("draftVersionId") REFERENCES "sales_flow_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_flows" ADD CONSTRAINT "sales_flows_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "sales_flow_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_flow_versions" ADD CONSTRAINT "sales_flow_versions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_flow_versions" ADD CONSTRAINT "sales_flow_versions_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "sales_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
