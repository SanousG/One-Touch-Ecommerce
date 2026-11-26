import "server-only";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../db/prisma";

export class StoreError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "StoreError";
  }
}

export type StoreTenantDTO = { id: string; name: string; slug: string; whatsappPhone: string | null };

export type StoreVariantDTO = {
  id: string;
  sku: string;
  name: string;
  price: string;
  isDefault: boolean;
  available: number;
};

export type StoreImageDTO = { id: string; url: string };

export type StoreProductDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryName: string | null;
  coverUrl: string | null;
  images: StoreImageDTO[];
  priceFrom: string | null;
  priceLabel: string;
  variantCount: number;
  variants: StoreVariantDTO[];
};

export type CartInput = { variantId: string; quantity: number };

export type ValidatedLine = {
  variantId: string;
  sku: string;
  productName: string;
  productSlug: string;
  variantName: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
  imageUrl: string | null;
};

export type CartValidation = {
  lines: ValidatedLine[];
  issues: string[];
  invalidVariantIds: string[];
  subtotal: string;
};

export type StoreCategoryDTO = { id: string; name: string; slug: string };

function imageUrl(imageId: string) {
  return `/api/images/${imageId}/file`;
}

function priceLabel(variants: StoreVariantDTO[]): { priceFrom: string | null; priceLabel: string } {
  if (variants.length === 0) return { priceFrom: null, priceLabel: "Consultar precio" };
  const prices = variants.map((variant) => variant.price);
  const min = prices.reduce((lowest, price) =>
    new Prisma.Decimal(price).lt(new Prisma.Decimal(lowest)) ? price : lowest,
  );
  const distinct = new Set(prices);
  return {
    priceFrom: min,
    priceLabel: distinct.size > 1 ? `Desde S/ ${min}` : `S/ ${min}`,
  };
}

/** El número público es el de la conexión activa; el campo del tenant es solo respaldo. */
export async function resolveStoreWhatsappPhone(tenantId: string, fallback: string | null): Promise<string | null> {
  const connection = await getPrisma().whatsAppConnection.findFirst({
    where: { tenantId, status: "CONNECTED" },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: { verifiedPhone: true, expectedPhone: true },
  });
  return connection?.verifiedPhone ?? connection?.expectedPhone ?? fallback;
}

/** Identidad de la tienda por slug. Nunca depende de la sesión administrativa. */
export async function getStoreBySlug(slug: string): Promise<StoreTenantDTO | null> {
  const tenant = await getPrisma().tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, whatsappPhone: true },
  });
  if (!tenant) return null;
  return {
    ...tenant,
    whatsappPhone: await resolveStoreWhatsappPhone(tenant.id, tenant.whatsappPhone),
  };
}

export async function listStoreCategories(tenantId: string): Promise<StoreCategoryDTO[]> {
  const categories = await getPrisma().category.findMany({
    where: {
      tenantId,
      products: { some: { status: "ACTIVE", storeVisible: true } },
    },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  return categories;
}

function toStoreProduct(product: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: { name: string } | null;
  images: { id: string }[];
  variants: {
    id: string;
    sku: string;
    name: string;
    price: Prisma.Decimal;
    isDefault: boolean;
    stockPhysical: number;
    stockReserved: number;
  }[];
}): StoreProductDTO {
  const images = product.images.map((image) => ({ id: image.id, url: imageUrl(image.id) }));
  const variants: StoreVariantDTO[] = product.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    name: variant.name,
    price: variant.price.toFixed(2),
    isDefault: variant.isDefault,
    available: Math.max(0, variant.stockPhysical - variant.stockReserved),
  }));
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryName: product.category?.name ?? null,
    coverUrl: images[0]?.url ?? null,
    images,
    ...priceLabel(variants),
    variantCount: variants.length,
    variants,
  };
}

const publicProductInclude = {
  category: { select: { name: true } },
  images: { orderBy: { position: "asc" as const }, select: { id: true } },
  variants: {
    where: { isActive: true },
    orderBy: { isDefault: "desc" as const },
    select: { id: true, sku: true, name: true, price: true, isDefault: true, stockPhysical: true, stockReserved: true },
  },
};

export async function listStoreProducts(
  tenantId: string,
  filters: { q?: string; categoryId?: string } = {},
): Promise<StoreProductDTO[]> {
  const q = filters.q?.trim();
  const where: Prisma.ProductWhereInput = {
    tenantId,
    status: "ACTIVE",
    storeVisible: true,
  };
  if (filters.categoryId) {
    const belongs = await getPrisma().category.findFirst({
      where: { id: filters.categoryId, tenantId },
      select: { id: true },
    });
    if (!belongs) return [];
    where.categoryId = filters.categoryId;
  }
  if (q) where.name = { contains: q, mode: "insensitive" };

  const products = await getPrisma().product.findMany({
    where,
    include: publicProductInclude,
    orderBy: { createdAt: "desc" },
  });
  return products.map(toStoreProduct);
}

export async function getStoreProduct(
  tenantId: string,
  slug: string,
  options?: { includeInvisible?: boolean },
): Promise<StoreProductDTO | null> {
  const product = await getPrisma().product.findFirst({
    where: {
      tenantId,
      slug,
      status: "ACTIVE",
      ...(options?.includeInvisible ? {} : { storeVisible: true }),
    },
    include: publicProductInclude,
  });
  return product ? toStoreProduct(product) : null;
}

/** Revalida íntegramente el carrito contra la BD del negocio indicado. */
export async function validateCart(tenantId: string, items: CartInput[]): Promise<CartValidation> {
  const issues: string[] = [];
  const invalidVariantIds: string[] = [];
  const unique = new Map<string, number>();

  for (const item of items) {
    if (typeof item?.variantId !== "string" || !item.variantId) {
      issues.push("Hay un artículo sin identificador válido.");
      continue;
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
      issues.push("Las cantidades deben ser números enteros entre 1 y 99.");
      invalidVariantIds.push(item.variantId);
      continue;
    }
    unique.set(item.variantId, (unique.get(item.variantId) ?? 0) + item.quantity);
  }

  const ids = [...unique.keys()];
  const variants = ids.length
    ? await getPrisma().productVariant.findMany({
        where: {
          id: { in: ids },
          tenantId,
          isActive: true,
          product: { status: "ACTIVE", storeVisible: true },
        },
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              images: { orderBy: { position: "asc" as const }, select: { id: true }, take: 1 },
            },
          },
        },
      })
    : [];

  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const lines: ValidatedLine[] = [];
  let subtotal = new Prisma.Decimal(0);

  for (const [variantId, quantity] of unique) {
    const variant = byId.get(variantId);
    if (!variant) {
      issues.push("Un artículo ya no está disponible para la venta.");
      invalidVariantIds.push(variantId);
      continue;
    }
    const available = variant.stockPhysical - variant.stockReserved;
    if (available < quantity) {
      issues.push(`Stock insuficiente para ${variant.sku}: disponibles ${Math.max(0, available)}.`);
      invalidVariantIds.push(variantId);
      continue;
    }
    const unitPrice = variant.price.toFixed(2);
    const lineTotal = variant.price.mul(quantity);
    subtotal = subtotal.add(lineTotal);
    lines.push({
      variantId,
      sku: variant.sku,
      productName: variant.product.name,
      productSlug: variant.product.slug,
      variantName: variant.name,
      unitPrice,
      quantity,
      lineTotal: lineTotal.toFixed(2),
      imageUrl: variant.product.images[0] ? imageUrl(variant.product.images[0].id) : null,
    });
  }

  return { lines, issues, invalidVariantIds, subtotal: subtotal.toFixed(2) };
}

export function whatsappUrl(phone: string, message: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits || digits.length < 8) throw new StoreError("El negocio no tiene un WhatsApp válido configurado", 409);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildProductMessage(
  tenant: StoreTenantDTO,
  product: StoreProductDTO,
  variant: StoreVariantDTO,
  quantity: number,
): string {
  return [
    `Hola ${tenant.name}, estoy interesado en:`,
    ``,
    `Producto: ${product.name}`,
    `Variante: ${variant.name}`,
    `Cantidad: ${quantity}`,
    `Precio referencial: S/ ${variant.price} por unidad`,
    `Referencia: ${variant.sku}`,
    ``,
    `Quisiera recibir más información para comprarlo.`,
  ].join("\n");
}

export function buildCartMessage(tenant: StoreTenantDTO, validation: CartValidation): string {
  const lines = validation.lines.map((line, index) =>
    `${index + 1}. ${line.productName}\n   Variante: ${line.variantName}\n   Cantidad: ${line.quantity}`,
  );
  return [
    `Hola, quisiera consultar por estos productos de ${tenant.name}:`,
    ``,
    ...lines,
    ``,
    `Subtotal referencial: S/ ${validation.subtotal}`,
    ``,
    `Quisiera confirmar disponibilidad, envío y forma de pago.`,
  ].join("\n");
}
