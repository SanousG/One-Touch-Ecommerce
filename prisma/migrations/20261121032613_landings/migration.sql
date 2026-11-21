-- CreateTable
CREATE TABLE "landings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "draftVersionId" TEXT,
    "publishedVersionId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_versions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "landingId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "heroImageId" TEXT,
    "benefits" JSONB NOT NULL,
    "faqs" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "landing_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "landings_tenantId_idx" ON "landings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "landings_tenantId_slug_key" ON "landings"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "landings_tenantId_productId_key" ON "landings"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "landing_versions_tenantId_landingId_idx" ON "landing_versions"("tenantId", "landingId");

-- CreateIndex
CREATE UNIQUE INDEX "landing_versions_landingId_version_key" ON "landing_versions"("landingId", "version");

-- AddForeignKey
ALTER TABLE "landings" ADD CONSTRAINT "landings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landings" ADD CONSTRAINT "landings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landings" ADD CONSTRAINT "landings_draftVersionId_fkey" FOREIGN KEY ("draftVersionId") REFERENCES "landing_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landings" ADD CONSTRAINT "landings_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "landing_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_versions" ADD CONSTRAINT "landing_versions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_versions" ADD CONSTRAINT "landing_versions_landingId_fkey" FOREIGN KEY ("landingId") REFERENCES "landings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_versions" ADD CONSTRAINT "landing_versions_heroImageId_fkey" FOREIGN KEY ("heroImageId") REFERENCES "product_images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
