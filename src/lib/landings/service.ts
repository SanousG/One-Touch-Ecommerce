import "server-only";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { assertLandingManager, assertLandingPublisher } from "../auth/permissions";
import { ForbiddenError } from "../auth/guards";
import { getAuth } from "../auth/auth";
import { getPrisma } from "../db/prisma";
import { getActiveTenantForUser } from "../tenants/service";
import { assertAuthenticated } from "../auth/guards";
import { shortSuffix, slugify } from "../utils/slug";
import {
  getStoreProduct,
  whatsappUrl,
  type StoreProductDTO,
  type StoreTenantDTO,
} from "../store/service";

export class LandingNotFoundError extends Error {
  constructor() {
    super("Landing no encontrada");
    this.name = "LandingNotFoundError";
  }
}

export class LandingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LandingValidationError";
  }
}

export class LandingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LandingConflictError";
  }
}

export type FaqDTO = { question: string; answer: string };

export type LandingContentDTO = {
  headline: string;
  summary: string;
  heroImageId: string | null;
  benefits: string[];
  faqs: FaqDTO[];
};

export type LandingVersionDTO = LandingContentDTO & { version: number; revision: number };

export type LandingDTO = {
  id: string;
  tenantId: string;
  productId: string;
  slug: string;
  isPublished: boolean;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
  productName: string;
  productSlug: string;
  publicUrl: string | null;
  draft: LandingVersionDTO;
  published: LandingVersionDTO | null;
};

type Actor = { userId: string; tenantId: string; role: "OWNER" | "OPERATOR" };

async function resolveActor(userId: string): Promise<Actor> {
  const tenant = await getActiveTenantForUser(userId);
  if (!tenant?.id) throw new ForbiddenError("Seleccione un negocio");
  return { userId, tenantId: tenant.id, role: tenant.role };
}

export async function requireLandingActor(): Promise<Actor> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const user = assertAuthenticated(session);
  return resolveActor(user.id);
}

export async function getApiLandingActor(request: Request): Promise<Actor> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  const user = assertAuthenticated(session);
  return resolveActor(user.id);
}

function asText(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function noMarkup(value: string): boolean {
  return !/[<>]/.test(value);
}

function parseBenefits(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function parseFaqs(value: unknown): FaqDTO[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ question: String(item.question ?? ""), answer: String(item.answer ?? "") }))
    .filter((item) => item.question && item.answer);
}

function toVersionDTO(version: {
  version: number;
  revision: number;
  headline: string;
  summary: string;
  heroImageId: string | null;
  benefits: Prisma.JsonValue;
  faqs: Prisma.JsonValue;
}): LandingVersionDTO {
  return {
    version: version.version,
    revision: version.revision,
    headline: version.headline,
    summary: version.summary,
    heroImageId: version.heroImageId,
    benefits: parseBenefits(version.benefits),
    faqs: parseFaqs(version.faqs),
  };
}

async function validateHeroImage(tenantId: string, productId: string, heroImageId: unknown): Promise<string | null> {
  if (heroImageId === null || heroImageId === undefined || heroImageId === "") return null;
  if (typeof heroImageId !== "string") throw new LandingValidationError("Fotografía no válida");
  const image = await getPrisma().productImage.findFirst({
    where: { id: heroImageId, tenantId, productId },
    select: { id: true },
  });
  if (!image) throw new LandingValidationError("La fotografía no pertenece al producto del negocio");
  return image.id;
}

function validateContent(input: Record<string, unknown>, content: {
  headline: string;
  summary: string;
  benefits: string[];
  faqs: FaqDTO[];
}) {
  const headline = asText(input.headline);
  const summary = asText(input.summary);
  if (!headline || headline.length < 3 || headline.length > 120 || !noMarkup(headline)) {
    throw new LandingValidationError("El titular debe tener entre 3 y 120 caracteres y sin HTML");
  }
  if (!summary || summary.length < 10 || summary.length > 600 || !noMarkup(summary)) {
    throw new LandingValidationError("La descripción debe tener entre 10 y 600 caracteres y sin HTML");
  }

  const rawBenefits = input.benefits === undefined ? content.benefits : input.benefits;
  if (!Array.isArray(rawBenefits) || rawBenefits.length > 6) {
    throw new LandingValidationError("Se permiten hasta 6 beneficios");
  }
  const benefits = rawBenefits.map(asText);
  if (benefits.some((item) => !item || item.length < 3 || item.length > 200 || !noMarkup(item))) {
    throw new LandingValidationError("Cada beneficio debe tener entre 3 y 200 caracteres y sin HTML");
  }

  const rawFaqs = input.faqs === undefined ? content.faqs : input.faqs;
  if (!Array.isArray(rawFaqs) || rawFaqs.length > 8) {
    throw new LandingValidationError("Se permiten hasta 8 preguntas frecuentes");
  }
  const faqs = rawFaqs.map((item) => {
    if (!item || typeof item !== "object") throw new LandingValidationError("Pregunta no válida");
    const record = item as Record<string, unknown>;
    return { question: asText(record.question), answer: asText(record.answer) };
  });
  if (faqs.some((faq) =>
    !faq.question || faq.question.length < 3 || faq.question.length > 160 || !noMarkup(faq.question) ||
    !faq.answer || faq.answer.length < 3 || faq.answer.length > 600 || !noMarkup(faq.answer)
  )) {
    throw new LandingValidationError("Revise las preguntas: texto entre 3 y 160/600 caracteres y sin HTML");
  }

  return {
    headline,
    summary,
    benefits: benefits as string[],
    faqs: faqs as FaqDTO[],
  };
}

const landingInclude = {
  draft: true,
  published: true,
  tenant: { select: { slug: true } },
  product: { select: { name: true, slug: true, id: true } },
} as const;

async function findOwnedLanding(actor: Actor, landingId: string) {
  const landing = await getPrisma().landing.findFirst({
    where: { id: landingId, tenantId: actor.tenantId },
    include: landingInclude,
  });
  if (!landing) throw new LandingNotFoundError();
  return landing;
}

function toDTO(landing: Prisma.LandingGetPayload<{ include: typeof landingInclude }>): LandingDTO {
  if (!landing.draft) throw new LandingNotFoundError();
  const published = landing.published ? toVersionDTO(landing.published) : null;
  return {
    id: landing.id,
    tenantId: landing.tenantId,
    productId: landing.productId,
    slug: landing.slug,
    isPublished: Boolean(landing.publishedVersionId),
    publishedAt: landing.publishedAt?.toISOString() ?? null,
    hasUnpublishedChanges: !landing.publishedVersionId || landing.draftVersionId !== landing.publishedVersionId,
    productName: landing.product.name,
    productSlug: landing.product.slug,
    publicUrl: landing.publishedVersionId ? `/tienda/${landing.tenant.slug}/landing/${landing.slug}` : null,
    draft: toVersionDTO(landing.draft),
    published,
  };
}

export async function listLandings(actor: Actor): Promise<LandingDTO[]> {
  const rows = await getPrisma().landing.findMany({
    where: { tenantId: actor.tenantId },
    include: landingInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDTO);
}

export async function getLanding(actor: Actor, landingId: string): Promise<LandingDTO> {
  return toDTO(await findOwnedLanding(actor, landingId));
}

async function uniqueSlug(tenantId: string, preferred: string): Promise<string> {
  const base = slugify(preferred);
  let slug = base;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const exists = await getPrisma().landing.findUnique({ where: { tenantId_slug: { tenantId, slug } } });
    if (!exists) return slug;
    slug = `${base}-${shortSuffix()}`;
  }
  throw new LandingValidationError("No se pudo generar un slug único");
}

export async function createLanding(
  actor: Actor,
  input: { productId?: unknown; slug?: unknown; headline?: unknown },
): Promise<LandingDTO> {
  assertLandingManager(actor.role);
  if (typeof input.productId !== "string" || !input.productId) {
    throw new LandingValidationError("Seleccione un producto");
  }
  const product = await getPrisma().product.findFirst({
    where: { id: input.productId, tenantId: actor.tenantId },
    include: {
      images: { orderBy: { position: "asc" }, select: { id: true } },
      variants: { where: { isActive: true }, orderBy: { isDefault: "desc" }, take: 1 },
    },
  });
  if (!product) throw new LandingNotFoundError();

  const existing = await getPrisma().landing.findUnique({
    where: { tenantId_productId: { tenantId: actor.tenantId, productId: product.id } },
    select: { id: true },
  });
  if (existing) throw new LandingConflictError("Este producto ya tiene una landing");

  const headline = asText(input.headline) ?? product.name;
  const content = validateContent({ headline, summary: product.description ?? "" }, {
    headline,
    summary: product.description ?? "",
    benefits: [],
    faqs: [],
  });

  const landingId = await getPrisma().$transaction(async (tx) => {
    const slug = await uniqueSlug(actor.tenantId, asText(input.slug) ?? product.slug);
    const landing = await tx.landing.create({
      data: {
        tenantId: actor.tenantId,
        productId: product.id,
        slug,
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });
    const version = await tx.landingVersion.create({
      data: {
        tenantId: actor.tenantId,
        landingId: landing.id,
        version: 1,
        headline: content.headline,
        summary: content.summary,
        heroImageId: product.images[0]?.id ?? null,
        benefits: content.benefits as unknown as Prisma.InputJsonValue,
        faqs: content.faqs as unknown as Prisma.InputJsonValue,
        createdById: actor.userId,
      },
    });
    await tx.landing.update({ where: { id: landing.id }, data: { draftVersionId: version.id } });
    return landing.id;
  });

  return getLanding(actor, landingId);
}

export async function saveLandingDraft(
  actor: Actor,
  landingId: string,
  input: Record<string, unknown>,
  expectedRevision?: number,
): Promise<LandingDTO> {
  assertLandingManager(actor.role);
  const landing = await findOwnedLanding(actor, landingId);
  const draft = landing.draft;
  if (!draft) throw new LandingNotFoundError();

  if (expectedRevision !== undefined && draft.revision !== expectedRevision) {
    throw new LandingConflictError("El borrador cambió en otra pestaña. Recargue antes de guardar.");
  }

  const current = toVersionDTO(draft);
  const validated = validateContent(input, current);
  const heroImageId = await validateHeroImage(actor.tenantId, landing.productId,
    input.heroImageId === undefined ? current.heroImageId : input.heroImageId);

  await getPrisma().$transaction(async (tx) => {
    if (landing.publishedVersionId && draft.id === landing.publishedVersionId) {
      const latest = await tx.landingVersion.findFirst({
        where: { landingId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      await tx.landingVersion.create({
        data: {
          tenantId: actor.tenantId,
          landingId,
          version: (latest?.version ?? 1) + 1,
          headline: validated.headline,
          summary: validated.summary,
          heroImageId,
          benefits: validated.benefits as unknown as Prisma.InputJsonValue,
          faqs: validated.faqs as unknown as Prisma.InputJsonValue,
          createdById: actor.userId,
        },
      });
      const created = await tx.landingVersion.findFirst({
        where: { landingId },
        orderBy: { version: "desc" },
        select: { id: true },
      });
      await tx.landing.update({
        where: { id: landingId },
        data: { draftVersionId: created!.id, updatedById: actor.userId },
      });
    } else {
      await tx.landingVersion.update({
        where: { id: draft.id },
        data: {
          headline: validated.headline,
          summary: validated.summary,
          heroImageId,
          benefits: validated.benefits as unknown as Prisma.InputJsonValue,
          faqs: validated.faqs as unknown as Prisma.InputJsonValue,
          revision: { increment: 1 },
        },
      });
      await tx.landing.update({ where: { id: landingId }, data: { updatedById: actor.userId } });
    }
  });

  return getLanding(actor, landingId);
}

export async function publishLanding(
  actor: Actor,
  landingId: string,
  expectedRevision?: number,
): Promise<LandingDTO> {
  assertLandingPublisher(actor.role);
  const landing = await findOwnedLanding(actor, landingId);
  const draft = landing.draft;
  if (!draft) throw new LandingNotFoundError();
  if (expectedRevision !== undefined && draft.revision !== expectedRevision) {
    throw new LandingConflictError("El borrador cambió. Guarde y vuelva a publicar.");
  }
  const content = toVersionDTO(draft);
  validateContent(content, content);
  if (!content.headline || !content.summary) throw new LandingValidationError("Contenido incompleto");

  await getPrisma().$transaction(async (tx) => {
    await tx.landing.update({
      where: { id: landingId },
      data: {
        publishedVersionId: draft.id,
        publishedAt: new Date(),
        updatedById: actor.userId,
      },
    });
  });
  return getLanding(actor, landingId);
}

/** Vista previa privada: usa el borrador, pero solo con sesión y membresía válidas. */
export async function getLandingPreview(actor: Actor, landingId: string) {
  const landing = await findOwnedLanding(actor, landingId);
  if (!landing.draft) throw new LandingNotFoundError();
  const product = await getStoreProduct(actor.tenantId, landing.product.slug);
  const tenant = await getPrisma().tenant.findFirst({
    where: { id: actor.tenantId },
    select: { id: true, name: true, slug: true, whatsappPhone: true },
  });
  if (!tenant || !product) throw new LandingNotFoundError();
  return { tenant, product, content: toVersionDTO(landing.draft), landing };
}

export async function getPublishedLanding(tenantSlug: string, landingSlug: string) {
  const tenant = await getPrisma().tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, name: true, slug: true, whatsappPhone: true },
  });
  if (!tenant) return null;

  const landing = await getPrisma().landing.findFirst({
    where: { tenantId: tenant.id, slug: landingSlug },
    include: { published: true, product: { select: { slug: true, status: true, storeVisible: true } } },
  });
  if (!landing?.publishedVersionId || !landing.published) return null;
  if (landing.product.status !== "ACTIVE" || !landing.product.storeVisible) return null;

  const product = await getStoreProduct(tenant.id, landing.product.slug);
  if (!product) return null;

  return {
    tenant: tenant as StoreTenantDTO,
    product,
    content: toVersionDTO(landing.published),
    slug: landing.slug,
  };
}

export function buildLandingWhatsappMessage(tenant: StoreTenantDTO, product: StoreProductDTO): string {
  const reference = product.variants[0]?.sku ?? product.slug;
  const lines = [
    `Hola ${tenant.name}, vi la ${product.name} en su página y quisiera recibir más información para comprarla.`,
    ``,
    `Referencia de producto: ${reference}`,
  ];
  if (product.variants.length > 1) {
    lines.push(``, `¿Podrían indicarme las opciones disponibles?`);
  }
  return lines.join("\n");
}

export function buildLandingWhatsappUrl(tenant: StoreTenantDTO, product: StoreProductDTO): string {
  if (!tenant.whatsappPhone) throw new ForbiddenError("WhatsApp no configurado");
  return whatsappUrl(tenant.whatsappPhone, buildLandingWhatsappMessage(tenant, product));
}

