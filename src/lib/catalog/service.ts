import "server-only";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getAuth } from "../auth/auth";
import {
  assertAuthenticated,
  assertTenantMembership,
  ForbiddenError,
} from "../auth/guards";
import { assertCatalogManager, assertCatalogOwner } from "../auth/permissions";
import { getPrisma } from "../db/prisma";
import { requireDashboardContext } from "../tenants/context";
import { getActiveTenantForUser, getMembershipRole } from "../tenants/service";
import { shortSuffix, slugify } from "../utils/slug";
import { deleteStoredImage, saveProductImage, type StoredImage } from "../storage/product-images";

export class NotFoundError extends Error {
  constructor(message = "Recurso no encontrado") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export type CatalogActor = { userId: string; tenantId: string; role: "OWNER" | "OPERATOR" };

export type VariantDTO = {
  id: string;
  sku: string;
  name: string;
  price: string;
  isActive: boolean;
  isDefault: boolean;
  stockPhysical: number;
  stockReserved: number;
  stockAvailable: number;
};

export type ProductImageDTO = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  position: number;
  isCover: boolean;
  url: string;
};

export type ProductDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  storeVisible: boolean;
  categoryId: string | null;
  categoryName: string | null;
  mainSku: string | null;
  variantCount: number;
  priceFrom: string | null;
  coverUrl: string | null;
  images: ProductImageDTO[];
  variants: VariantDTO[];
  createdAt: string;
  updatedAt: string;
};

export type CategoryDTO = { id: string; name: string; slug: string; description: string | null };

export type ProductFilters = { q?: string; categoryId?: string; status?: string; visible?: string };

async function resolveActor(userId: string, tenantId?: string): Promise<CatalogActor> {
  const tenant = tenantId ? { id: tenantId } : await getActiveTenantForUser(userId);
  if (!tenant?.id) throw new ForbiddenError("Seleccione un negocio antes de administrar el catálogo");

  const role = await getMembershipRole(userId, tenant.id);
  const membership = assertTenantMembership(
    role ? { tenantId: tenant.id, userId, role } : null,
    tenant.id,
    userId,
  );
  assertCatalogManager(membership.role);
  return { userId, tenantId: tenant.id, role: membership.role };
}

/** Contexto para páginas: redirige al onboarding si no hay negocio activo. */
export async function requireCatalogContext(): Promise<CatalogActor> {
  const { user, activeTenant } = await requireDashboardContext();
  if (!activeTenant) redirect("/onboarding");
  return resolveActor(user.id, activeTenant.id);
}

/** Contexto para Route Handlers: siempre verifica la sesión contra la BD. */
export async function getApiCatalogContext(request: Request): Promise<CatalogActor> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  const user = assertAuthenticated(session);
  return resolveActor(user.id);
}

function parsePrice(value: unknown): Prisma.Decimal {
  const text = String(value ?? "").trim();
  const amount = Number(text);
  if (!text || !Number.isFinite(amount) || amount < 0) {
    throw new ValidationError("El precio debe ser un número positivo");
  }
  return new Prisma.Decimal(amount.toFixed(2));
}

function cleanText(value: unknown, max: number, required = false): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && text.length === 0) throw new ValidationError("Este campo es obligatorio");
  if (text.length > max) throw new ValidationError(`Máximo ${max} caracteres`);
  return text.length ? text : null;
}

function toVariantDTO(variant: {
  id: string;
  sku: string;
  name: string;
  price: Prisma.Decimal;
  isActive: boolean;
  isDefault: boolean;
  stockPhysical: number;
  stockReserved: number;
}): VariantDTO {
  return {
    id: variant.id,
    sku: variant.sku,
    name: variant.name,
    price: variant.price.toFixed(2),
    isActive: variant.isActive,
    isDefault: variant.isDefault,
    stockPhysical: variant.stockPhysical,
    stockReserved: variant.stockReserved,
    stockAvailable: variant.stockPhysical - variant.stockReserved,
  };
}

function imageUrl(imageId: string) {
  return `/api/admin/products/images/${imageId}/file`;
}

function toImageDTO(image: {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  position: number;
  isCover: boolean;
}): ProductImageDTO {
  return {
    id: image.id,
    fileName: image.fileName,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    position: image.position,
    isCover: image.isCover,
    url: imageUrl(image.id),
  };
}

function toProductDTO(product: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  storeVisible: boolean;
  categoryId: string | null;
  category: { name: string } | null;
  variants: Parameters<typeof toVariantDTO>[0][];
  images: Parameters<typeof toImageDTO>[0][];
  createdAt: Date;
  updatedAt: Date;
}): ProductDTO {
  const sortedImages = [...product.images].sort((a, b) => a.position - b.position);
  const cover = sortedImages.find((image) => image.isCover) ?? sortedImages[0];
  const activeVariants = product.variants.filter((variant) => variant.isActive);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    status: product.status,
    storeVisible: product.storeVisible,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    mainSku: product.variants[0]?.sku ?? null,
    variantCount: product.variants.length,
    priceFrom: activeVariants.length
      ? activeVariants.reduce((min, v) => (v.price.lt(min) ? v.price : min), activeVariants[0].price).toFixed(2)
      : null,
    coverUrl: cover ? imageUrl(cover.id) : null,
    images: sortedImages.map(toImageDTO),
    variants: product.variants.map(toVariantDTO),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

const productInclude = {
  category: { select: { name: true } },
  variants: { orderBy: { createdAt: "asc" as const } },
  images: { orderBy: { position: "asc" as const } },
};

async function findOwnedProduct(tenantId: string, productId: string) {
  const product = await getPrisma().product.findFirst({
    where: { id: productId, tenantId },
    include: productInclude,
  });
  if (!product) throw new NotFoundError("Producto no encontrado");
  return product;
}

async function resolveCategory(tenantId: string, categoryId: unknown): Promise<string | null> {
  if (categoryId === null || categoryId === undefined || categoryId === "") return null;
  if (typeof categoryId !== "string") throw new ValidationError("Categoría no válida");
  const category = await getPrisma().category.findFirst({
    where: { id: categoryId, tenantId },
    select: { id: true },
  });
  if (!category) throw new ValidationError("La categoría no pertenece al negocio");
  return category.id;
}

async function uniqueProductSlug(tenantId: string, name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const exists = await getPrisma().product.findUnique({ where: { tenantId_slug: { tenantId, slug } } });
    if (!exists) return slug;
    slug = `${base}-${shortSuffix()}`;
  }
  throw new ValidationError("No se pudo generar un slug único");
}

async function uniqueSku(tenantId: string, preferred?: string | null): Promise<string> {
  const base = preferred
    ? preferred.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40)
    : `SKU${shortSuffix().toUpperCase()}`;
  let sku = base;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const exists = await getPrisma().productVariant.findUnique({
      where: { tenantId_sku: { tenantId, sku } },
    });
    if (!exists) return sku;
    sku = `${base}-${shortSuffix().toUpperCase()}`;
  }
  throw new ValidationError("No se pudo generar un SKU único");
}

export async function listCategories(actor: CatalogActor): Promise<CategoryDTO[]> {
  const rows = await getPrisma().category.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, description: true },
  });
  return rows;
}

export async function createCategory(actor: CatalogActor, input: { name?: unknown; description?: unknown }) {
  const name = cleanText(input.name, 80, true)!;
  const base = slugify(name);
  let slug = base;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const exists = await getPrisma().category.findUnique({
      where: { tenantId_slug: { tenantId: actor.tenantId, slug } },
    });
    if (!exists) break;
    slug = `${base}-${shortSuffix()}`;
  }
  const category = await getPrisma().category.create({
    data: {
      tenantId: actor.tenantId,
      name,
      slug,
      description: cleanText(input.description, 300),
    },
  });
  return { id: category.id, name: category.name, slug: category.slug, description: category.description };
}

export async function listProducts(actor: CatalogActor, filters: ProductFilters = {}): Promise<ProductDTO[]> {
  const q = filters.q?.trim();
  const where: Prisma.ProductWhereInput = { tenantId: actor.tenantId };
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.status && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(filters.status)) {
    where.status = filters.status as "DRAFT" | "ACTIVE" | "ARCHIVED";
  } else if (!filters.status) {
    where.status = { not: "ARCHIVED" };
  }
  if (filters.visible === "visible") where.storeVisible = true;
  if (filters.visible === "hidden") where.storeVisible = false;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const products = await getPrisma().product.findMany({
    where,
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  return products.map(toProductDTO);
}

export async function getProduct(actor: CatalogActor, productId: string): Promise<ProductDTO> {
  return toProductDTO(await findOwnedProduct(actor.tenantId, productId));
}

export async function createProduct(
  actor: CatalogActor,
  input: {
    name?: unknown;
    description?: unknown;
    categoryId?: unknown;
    status?: unknown;
    storeVisible?: unknown;
    variantName?: unknown;
    variantSku?: unknown;
    price?: unknown;
  },
): Promise<ProductDTO> {
  const name = cleanText(input.name, 120, true)!;
  const categoryId = await resolveCategory(actor.tenantId, input.categoryId);
  const price = parsePrice(input.price);
  const variantName = cleanText(input.variantName, 80) ?? "Predeterminada";
  const status = input.status === "ACTIVE" ? "ACTIVE" : "DRAFT";

  const product = await getPrisma().$transaction(async (tx) => {
    const slug = await uniqueProductSlug(actor.tenantId, name);
    const sku = await uniqueSku(actor.tenantId, cleanText(input.variantSku, 40));
    const created = await tx.product.create({
      data: {
        tenantId: actor.tenantId,
        name,
        slug,
        description: cleanText(input.description, 1000),
        categoryId,
        status,
        storeVisible: input.storeVisible === true || input.storeVisible === "true",
      },
    });
    await tx.productVariant.create({
      data: {
        tenantId: actor.tenantId,
        productId: created.id,
        sku,
        name: variantName,
        price,
        isDefault: true,
      },
    });
    return created.id;
  });

  return getProduct(actor, product);
}

export async function updateProduct(
  actor: CatalogActor,
  productId: string,
  input: {
    name?: unknown;
    description?: unknown;
    categoryId?: unknown;
    status?: unknown;
    storeVisible?: unknown;
  },
): Promise<ProductDTO> {
  await findOwnedProduct(actor.tenantId, productId);
  const data: Prisma.ProductUpdateInput = {};
  if (input.name !== undefined) data.name = cleanText(input.name, 120, true)!;
  if (input.description !== undefined) data.description = cleanText(input.description, 1000);
  if (input.categoryId !== undefined) {
    const categoryId = await resolveCategory(actor.tenantId, input.categoryId);
    data.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
  }
  if (input.status !== undefined) {
    const status = String(input.status);
    if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) throw new ValidationError("Estado no válido");
    if (status === "ARCHIVED") assertCatalogOwner(actor.role);
    data.status = status as "DRAFT" | "ACTIVE" | "ARCHIVED";
  }
  if (input.storeVisible !== undefined) {
    data.storeVisible = input.storeVisible === true || input.storeVisible === "true";
  }

  await getPrisma().product.update({ where: { id: productId }, data });
  return getProduct(actor, productId);
}

export async function setProductStatus(
  actor: CatalogActor,
  productId: string,
  status: "DRAFT" | "ACTIVE" | "ARCHIVED",
): Promise<ProductDTO> {
  if (status === "ARCHIVED") assertCatalogOwner(actor.role);
  await findOwnedProduct(actor.tenantId, productId);
  await getPrisma().product.update({ where: { id: productId }, data: { status } });
  return getProduct(actor, productId);
}

export async function setProductVisibility(
  actor: CatalogActor,
  productId: string,
  visible: boolean,
): Promise<ProductDTO> {
  await findOwnedProduct(actor.tenantId, productId);
  await getPrisma().product.update({ where: { id: productId }, data: { storeVisible: visible } });
  return getProduct(actor, productId);
}

async function findOwnedVariant(actor: CatalogActor, productId: string, variantId: string) {
  const variant = await getPrisma().productVariant.findFirst({
    where: { id: variantId, productId, tenantId: actor.tenantId },
  });
  if (!variant) throw new NotFoundError("Variante no encontrada");
  return variant;
}

export async function createVariant(
  actor: CatalogActor,
  productId: string,
  input: { name?: unknown; sku?: unknown; price?: unknown },
): Promise<ProductDTO> {
  await findOwnedProduct(actor.tenantId, productId);
  const count = await getPrisma().productVariant.count({ where: { productId, tenantId: actor.tenantId } });
  await getPrisma().$transaction(async (tx) => {
    await tx.productVariant.create({
      data: {
        tenantId: actor.tenantId,
        productId,
        sku: await uniqueSku(actor.tenantId, cleanText(input.sku, 40)),
        name: cleanText(input.name, 80, true)!,
        price: parsePrice(input.price),
        isDefault: count === 0,
      },
    });
  });
  return getProduct(actor, productId);
}

export async function updateVariant(
  actor: CatalogActor,
  productId: string,
  variantId: string,
  input: { name?: unknown; sku?: unknown; price?: unknown; isActive?: unknown },
): Promise<ProductDTO> {
  await findOwnedVariant(actor, productId, variantId);
  const data: Prisma.ProductVariantUpdateInput = {};
  if (input.name !== undefined) data.name = cleanText(input.name, 80, true)!;
  if (input.sku !== undefined) data.sku = await uniqueSku(actor.tenantId, cleanText(input.sku, 40));
  if (input.price !== undefined) data.price = parsePrice(input.price);
  if (input.isActive !== undefined) data.isActive = input.isActive === true || input.isActive === "true";
  await getPrisma().productVariant.update({ where: { id: variantId }, data });
  return getProduct(actor, productId);
}

async function findOwnedImage(actor: CatalogActor, productId: string, imageId: string) {
  const image = await getPrisma().productImage.findFirst({
    where: { id: imageId, productId, tenantId: actor.tenantId },
  });
  if (!image) throw new NotFoundError("Imagen no encontrada");
  return image;
}

export async function addProductImage(
  actor: CatalogActor,
  productId: string,
  file: File,
): Promise<ProductDTO> {
  await findOwnedProduct(actor.tenantId, productId);
  const stored = await saveProductImage(file, actor.tenantId, productId);
  try {
    await getPrisma().$transaction(async (tx) => {
      const count = await tx.productImage.count({ where: { productId, tenantId: actor.tenantId } });
      await tx.productImage.create({
        data: {
          tenantId: actor.tenantId,
          productId,
          storageKey: stored.storageKey,
          fileName: stored.fileName,
          mimeType: stored.mimeType,
          sizeBytes: stored.sizeBytes,
          position: count,
          isCover: count === 0,
        },
      });
    });
  } catch (error) {
    await deleteStoredImage(stored.storageKey);
    throw error;
  }
  return getProduct(actor, productId);
}

export async function setCoverImage(
  actor: CatalogActor,
  productId: string,
  imageId: string,
): Promise<ProductDTO> {
  await findOwnedImage(actor, productId, imageId);
  await getPrisma().$transaction(async (tx) => {
    await tx.productImage.updateMany({
      where: { productId, tenantId: actor.tenantId },
      data: { isCover: false },
    });
    await tx.productImage.update({ where: { id: imageId }, data: { isCover: true } });
  });
  return getProduct(actor, productId);
}

export async function reorderImages(
  actor: CatalogActor,
  productId: string,
  orderedIds: string[],
): Promise<ProductDTO> {
  const images = await getPrisma().productImage.findMany({
    where: { productId, tenantId: actor.tenantId },
    select: { id: true },
  });
  const owned = new Set(images.map((image) => image.id));
  if (orderedIds.length !== images.length || orderedIds.some((id) => !owned.has(id))) {
    throw new ValidationError("La lista de imágenes no es válida");
  }
  await getPrisma().$transaction(async (tx) => {
    for (const [position, id] of orderedIds.entries()) {
      await tx.productImage.update({ where: { id }, data: { position } });
    }
  });
  return getProduct(actor, productId);
}

export async function removeProductImage(
  actor: CatalogActor,
  productId: string,
  imageId: string,
): Promise<ProductDTO> {
  const image = await findOwnedImage(actor, productId, imageId);
  const usedByLanding = await getPrisma().landingVersion.count({ where: { heroImageId: imageId } });
  if (usedByLanding > 0) {
    throw new ConflictError("La imagen está siendo usada por una landing y no se puede eliminar");
  }
  await getPrisma().productImage.delete({ where: { id: imageId } });
  await deleteStoredImage(image.storageKey);

  await getPrisma().$transaction(async (tx) => {
    const remaining = await tx.productImage.findMany({
      where: { productId, tenantId: actor.tenantId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    for (const [position, item] of remaining.entries()) {
      await tx.productImage.update({ where: { id: item.id }, data: { position, isCover: position === 0 } });
    }
  });
  return getProduct(actor, productId);
}

export async function getAdminImage(
  actor: CatalogActor,
  imageId: string,
): Promise<{ storageKey: string; mimeType: string }> {
  const image = await getPrisma().productImage.findFirst({
    where: { id: imageId, tenantId: actor.tenantId },
  });
  if (!image) throw new NotFoundError("Imagen no encontrada");
  return { storageKey: image.storageKey, mimeType: image.mimeType };
}

/** Superficie pública futura: solo imágenes de productos ACTIVE y visibles en tienda. */
export async function getPublicImage(imageId: string): Promise<{ storageKey: string; mimeType: string }> {
  const image = await getPrisma().productImage.findFirst({
    where: {
      id: imageId,
      product: { status: "ACTIVE", storeVisible: true },
    },
  });
  if (!image) throw new NotFoundError("Imagen no encontrada");
  return { storageKey: image.storageKey, mimeType: image.mimeType };
}

export type { StoredImage };
