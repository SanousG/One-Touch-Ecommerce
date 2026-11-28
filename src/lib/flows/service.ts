import "server-only";
import { Prisma } from "@prisma/client";
import { assertFlowManager, assertFlowPublisher } from "../auth/permissions";
import { getPrisma } from "../db/prisma";
import { getApiCatalogContext, requireCatalogContext } from "../catalog/service";
import { slugify, shortSuffix } from "../utils/slug";
import { deleteStoredImage, ImageValidationError, saveTemplateMedia } from "../storage/product-images";
import {
  normalizeDiagram,
  validateForPublish,
  FLOW_LIMITS,
} from "./validation";
import {
  DEFAULT_TEMPLATE_TYPES,
  type FlowDTO,
  type FlowDiagramDTO,
  type FlowVersionDTO,
  type GlobalFlowSnapshotItem,
  type TemplateDTO,
  type TemplateSnapshotItem,
  type TemplateType,
  type TemplateTypeDTO,
} from "./types";

export class FlowNotFoundError extends Error {
  constructor(message = "Flujo no encontrado") {
    super(message);
    this.name = "FlowNotFoundError";
  }
}

export class FlowInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowInputError";
  }
}

export class FlowConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlowConflictError";
  }
}

export class FlowValidationError extends Error {
  constructor(public issues: { nodeId?: string; edgeId?: string; message: string }[]) {
    super("El diagrama no es válido para publicar");
    this.name = "FlowValidationError";
  }
}

type Actor = { userId: string; tenantId: string; role: "OWNER" | "OPERATOR" };

export async function requireFlowActor(): Promise<Actor> {
  return requireCatalogContext();
}

export async function getApiFlowActor(request: Request): Promise<Actor> {
  return getApiCatalogContext(request);
}

function text(value: unknown, max: number, field: string, required = false): string {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new FlowInputError(`${field} es obligatorio`);
  if (/[<>]/.test(result)) throw new FlowInputError(`${field} no puede contener HTML`);
  if (result.length > max) throw new FlowInputError(`${field} excede ${max} caracteres`);
  return result;
}

function toTemplateDTO(template: {
  id: string;
  name: string;
  type: TemplateType;
  content: string;
  imageId: string | null;
  mediaId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: { mimeType: string } | null;
  media?: { mimeType: string; fileName: string } | null;
}): TemplateDTO {
  return {
    id: template.id,
    name: template.name,
    type: template.type,
    content: template.content,
    mediaId: template.mediaId,
    mediaUrl: template.mediaId ? `/api/admin/templates/media/${template.mediaId}/file` : null,
    mediaMimeType: template.media?.mimeType ?? null,
    mediaFileName: template.media?.fileName ?? null,
    imageId: template.imageId,
    imageUrl: template.imageId ? `/api/admin/products/images/${template.imageId}/file` : null,
    imageMimeType: template.image?.mimeType ?? null,
    isActive: template.isActive,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

async function validateTemplateImage(tenantId: string, imageId: unknown): Promise<string | null> {
  if (!imageId || imageId === "") return null;
  if (typeof imageId !== "string") throw new FlowInputError("Imagen no válida");
  const image = await getPrisma().productImage.findFirst({
    where: { id: imageId, tenantId },
    select: { id: true },
  });
  if (!image) throw new FlowInputError("La imagen no pertenece al negocio");
  return image.id;
}

async function validateTemplateMedia(tenantId: string, mediaId: unknown): Promise<string | null> {
  if (!mediaId || mediaId === "") return null;
  if (typeof mediaId !== "string") throw new FlowInputError("Archivo no válido");
  const media = await getPrisma().templateMedia.findFirst({
    where: { id: mediaId, tenantId },
    select: { id: true },
  });
  if (!media) throw new FlowInputError("El archivo no pertenece al negocio");
  return media.id;
}

export async function uploadTemplateMedia(
  actor: Actor,
  file: File,
): Promise<{ id: string; url: string; mimeType: string; fileName: string; sizeBytes: number }> {
  assertFlowManager(actor.role);
  let stored;
  try {
    stored = await saveTemplateMedia(file, actor.tenantId);
  } catch (error) {
    if (error instanceof ImageValidationError) throw new FlowInputError(error.message);
    throw error;
  }
  try {
    const media = await getPrisma().templateMedia.create({
      data: {
        tenantId: actor.tenantId,
        storageKey: stored.storageKey,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
      },
    });
    return {
      id: media.id,
      url: `/api/admin/templates/media/${media.id}/file`,
      mimeType: media.mimeType,
      fileName: media.fileName,
      sizeBytes: media.sizeBytes,
    };
  } catch (error) {
    await deleteStoredImage(stored.storageKey);
    throw error;
  }
}

export async function getTemplateMedia(
  actor: Actor,
  mediaId: string,
): Promise<{ storageKey: string; mimeType: string }> {
  const media = await getPrisma().templateMedia.findFirst({
    where: { id: mediaId, tenantId: actor.tenantId },
    select: { storageKey: true, mimeType: true },
  });
  if (!media) throw new FlowNotFoundError("Archivo no encontrado");
  return media;
}

export async function deleteTemplateMedia(actor: Actor, mediaId: string): Promise<{ id: string }> {
  assertFlowManager(actor.role);
  const media = await getPrisma().templateMedia.findFirst({
    where: { id: mediaId, tenantId: actor.tenantId },
  });
  if (!media) throw new FlowNotFoundError("Archivo no encontrado");
  const used = await getPrisma().messageTemplate.count({ where: { mediaId } });
  if (used > 0) {
    throw new FlowConflictError(`El archivo está en uso por ${used} ${used === 1 ? "plantilla" : "plantillas"}`);
  }
  await getPrisma().templateMedia.delete({ where: { id: media.id } });
  await deleteStoredImage(media.storageKey);
  return { id: media.id };
}

async function ensureDefaultTemplateTypes(tenantId: string): Promise<void> {
  await getPrisma().templateType.createMany({
    data: DEFAULT_TEMPLATE_TYPES.map((item) => ({
      tenantId,
      name: item.name,
      slug: item.slug,
      isSystem: true,
    })),
    skipDuplicates: true,
  });
}

async function parseTemplateType(tenantId: string, value: unknown, fallback?: TemplateType): Promise<TemplateType> {
  const slug = typeof value === "string" ? value.trim() : fallback;
  if (!slug) throw new FlowInputError("Tipo de plantilla no válido");
  const found = await getPrisma().templateType.findFirst({ where: { tenantId, slug } });
  if (!found) throw new FlowInputError("Tipo de plantilla no válido");
  return found.slug;
}

export async function listTemplateTypes(actor: Actor): Promise<TemplateTypeDTO[]> {
  await ensureDefaultTemplateTypes(actor.tenantId);
  const rows = await getPrisma().templateType.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, description: true, isSystem: true },
  });
  return rows;
}

export async function createTemplateType(actor: Actor, input: Record<string, unknown>): Promise<TemplateTypeDTO> {
  assertFlowManager(actor.role);
  await ensureDefaultTemplateTypes(actor.tenantId);
  const name = text(input.name, 40, "Nombre del tipo", true);
  const base = slugify(name);
  if (base === "checkout" || base === "message") {
    throw new FlowConflictError("Ese tipo está reservado");
  }
  let slug = base;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const exists = await getPrisma().templateType.findUnique({
      where: { tenantId_slug: { tenantId: actor.tenantId, slug } },
    });
    if (!exists) break;
    slug = `${base}-${shortSuffix()}`;
  }
  const created = await getPrisma().templateType.create({
    data: {
      tenantId: actor.tenantId,
      name,
      slug,
      description: text(input.description, 160, "Descripción"),
    },
  });
  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    description: created.description,
    isSystem: created.isSystem,
  };
}

export async function updateTemplateType(actor: Actor, typeId: string, input: Record<string, unknown>): Promise<TemplateTypeDTO> {
  assertFlowManager(actor.role);
  const existing = await getPrisma().templateType.findFirst({
    where: { id: typeId, tenantId: actor.tenantId },
  });
  if (!existing) throw new FlowNotFoundError("Tipo de plantilla no encontrado");
  if (existing.isSystem) throw new FlowInputError("Los tipos predeterminados no se pueden modificar");
  const updated = await getPrisma().templateType.update({
    where: { id: existing.id },
    data: {
      name: input.name === undefined ? existing.name : text(input.name, 40, "Nombre del tipo", true),
      description: input.description === undefined ? existing.description : text(input.description, 160, "Descripción"),
    },
  });
  return {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description,
    isSystem: updated.isSystem,
  };
}

export async function deleteTemplateType(actor: Actor, typeId: string): Promise<{ id: string }> {
  assertFlowManager(actor.role);
  const existing = await getPrisma().templateType.findFirst({
    where: { id: typeId, tenantId: actor.tenantId },
  });
  if (!existing) throw new FlowNotFoundError("Tipo de plantilla no encontrado");
  if (existing.isSystem) throw new FlowInputError("Los tipos predeterminados no se pueden eliminar");
  const used = await getPrisma().messageTemplate.count({
    where: { tenantId: actor.tenantId, type: existing.slug },
  });
  if (used > 0) {
    throw new FlowConflictError(`Hay ${used} ${used === 1 ? "plantilla" : "plantillas"} con este tipo. Cámbialas antes de eliminarlo.`);
  }
  await getPrisma().templateType.delete({ where: { id: existing.id } });
  return { id: existing.id };
}

export async function listTemplates(actor: Actor): Promise<TemplateDTO[]> {
  await ensureDefaultTemplateTypes(actor.tenantId);
  const rows = await getPrisma().messageTemplate.findMany({
    where: { tenantId: actor.tenantId },
    include: {
      image: { select: { mimeType: true } },
      media: { select: { mimeType: true, fileName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toTemplateDTO);
}

export async function createTemplate(actor: Actor, input: Record<string, unknown>): Promise<TemplateDTO> {
  assertFlowManager(actor.role);
  await ensureDefaultTemplateTypes(actor.tenantId);
  const type = await parseTemplateType(actor.tenantId, input.type, "MESSAGE");
  const created = await getPrisma().messageTemplate.create({
    data: {
      tenantId: actor.tenantId,
      name: text(input.name, 80, "Nombre", true),
      type,
      content: text(input.content, FLOW_LIMITS.content, "Contenido", true),
      imageId: await validateTemplateImage(actor.tenantId, input.imageId),
      mediaId: await validateTemplateMedia(actor.tenantId, input.mediaId),
      isActive: input.isActive !== false,
    },
  });
  return toTemplateDTO(created);
}

export async function updateTemplate(actor: Actor, templateId: string, input: Record<string, unknown>): Promise<TemplateDTO> {
  assertFlowManager(actor.role);
  const existing = await getPrisma().messageTemplate.findFirst({
    where: { id: templateId, tenantId: actor.tenantId },
  });
  if (!existing) throw new FlowNotFoundError("Plantilla no encontrada");
  const type = input.type === undefined ? existing.type : await parseTemplateType(actor.tenantId, input.type);
  const nextMediaId = input.mediaId === undefined ? existing.mediaId : await validateTemplateMedia(actor.tenantId, input.mediaId);
  const updated = await getPrisma().messageTemplate.update({
    where: { id: templateId },
    data: {
      name: input.name === undefined ? existing.name : text(input.name, 80, "Nombre", true),
      type,
      content: input.content === undefined ? existing.content : text(input.content, FLOW_LIMITS.content, "Contenido", true),
      imageId: input.imageId === undefined ? existing.imageId : await validateTemplateImage(actor.tenantId, input.imageId),
      mediaId: nextMediaId,
      isActive: input.isActive === undefined ? existing.isActive : input.isActive === true,
    },
  });
  if (existing.mediaId && existing.mediaId !== nextMediaId) {
    await deleteTemplateMedia(actor, existing.mediaId).catch(() => null);
  }
  return toTemplateDTO(updated);
}

const flowInclude = {
  draft: true,
  published: true,
  product: { select: { name: true, slug: true, variants: { where: { isActive: true }, select: { price: true } } } },
} as const;

type FlowRow = Prisma.SalesFlowGetPayload<{ include: typeof flowInclude }>;

function toVersionDTO(version: {
  version: number;
  revision: number;
  nodes: Prisma.JsonValue;
  edges: Prisma.JsonValue;
  templates: Prisma.JsonValue;
  globalFlows: Prisma.JsonValue;
}): FlowVersionDTO {
  return {
    version: version.version,
    revision: version.revision,
    diagram: {
      nodes: Array.isArray(version.nodes) ? (version.nodes as FlowDiagramDTO["nodes"]) : [],
      edges: Array.isArray(version.edges) ? (version.edges as FlowDiagramDTO["edges"]) : [],
    },
    templates: (version.templates ?? {}) as Record<string, TemplateSnapshotItem>,
    globalFlows: (version.globalFlows ?? {}) as Record<string, GlobalFlowSnapshotItem>,
  };
}

function toDTO(flow: FlowRow): FlowDTO {
  if (!flow.draft) throw new FlowNotFoundError();
  const prices = flow.product?.variants.map((variant) => variant.price.toFixed(2)) ?? [];
  return {
    id: flow.id,
    tenantId: flow.tenantId,
    productId: flow.productId,
    scope: flow.scope,
    name: flow.name,
    slug: flow.slug,
    description: flow.description,
    isPublished: Boolean(flow.publishedVersionId),
    publishedAt: flow.publishedAt?.toISOString() ?? null,
    hasUnpublishedChanges: !flow.publishedVersionId || flow.draftVersionId !== flow.publishedVersionId,
    productName: flow.product?.name ?? null,
    productPriceLabel: prices.length ? `S/ ${prices[0]}` : null,
    version: toVersionDTO(flow.draft),
  };
}

async function findOwnedFlow(actor: Actor, flowId: string): Promise<FlowRow> {
  const flow = await getPrisma().salesFlow.findFirst({
    where: { id: flowId, tenantId: actor.tenantId },
    include: flowInclude,
  });
  if (!flow) throw new FlowNotFoundError();
  return flow;
}

async function uniqueSlug(tenantId: string, preferred: string): Promise<string> {
  const base = slugify(preferred);
  let slug = base;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const exists = await getPrisma().salesFlow.findUnique({ where: { tenantId_slug: { tenantId, slug } } });
    if (!exists) return slug;
    slug = `${base}-${shortSuffix()}`;
  }
  throw new FlowInputError("No se pudo generar un slug único");
}

export async function listFlows(actor: Actor, scope?: "PRODUCT" | "GLOBAL"): Promise<FlowDTO[]> {
  const rows = await getPrisma().salesFlow.findMany({
    where: { tenantId: actor.tenantId, ...(scope ? { scope } : {}) },
    include: flowInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDTO);
}

export async function getFlow(actor: Actor, flowId: string): Promise<FlowDTO> {
  return toDTO(await findOwnedFlow(actor, flowId));
}

export async function getFlowStatusByProduct(actor: Actor): Promise<Record<string, { status: "none" | "draft" | "published" | "changes"; flowId?: string }>> {
  const flows = await listFlows(actor, "PRODUCT");
  const result: Record<string, { status: "none" | "draft" | "published" | "changes"; flowId?: string }> = {};
  for (const flow of flows) {
    if (!flow.productId) continue;
    result[flow.productId] = {
      status: !flow.isPublished ? "draft" : flow.hasUnpublishedChanges ? "changes" : "published",
      flowId: flow.id,
    };
  }
  return result;
}

export async function createFlow(actor: Actor, input: Record<string, unknown>): Promise<FlowDTO> {
  assertFlowManager(actor.role);
  const scope = input.scope === "GLOBAL" ? "GLOBAL" : "PRODUCT";
  let productId: string | null = null;
  let name: string;
  let preferredSlug: string;

  if (scope === "PRODUCT") {
    if (typeof input.productId !== "string" || !input.productId) {
      throw new FlowInputError("Seleccione un producto");
    }
    const product = await getPrisma().product.findFirst({
      where: { id: input.productId, tenantId: actor.tenantId },
      select: { id: true, name: true, slug: true },
    });
    if (!product) throw new FlowNotFoundError("Producto no encontrado");
    const existing = await getPrisma().salesFlow.findFirst({
      where: { tenantId: actor.tenantId, productId: product.id },
      select: { id: true },
    });
    if (existing) throw new FlowConflictError("Este producto ya tiene un flujo principal");
    productId = product.id;
    name = product.name;
    preferredSlug = product.slug;
  } else {
    name = text(input.name, 80, "Nombre", true);
    preferredSlug = name;
  }

  const slug = await uniqueSlug(actor.tenantId, preferredSlug);
  const flowId = await getPrisma().$transaction(async (tx) => {
    const flow = await tx.salesFlow.create({
      data: {
        tenantId: actor.tenantId,
        productId,
        scope,
        name,
        slug,
        description: text(input.description, 300, "Descripción"),
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });
    const diagram: FlowDiagramDTO = {
      nodes: [
        {
          id: "start",
          type: "START",
          position: { x: 80, y: 200 },
          config: {
            label: "Inicio",
            templateIds: [], question: "", options: [], fallbackLabel: "",
            globalFlowId: "", checkoutFields: [], endMode: "FINISH", finalTemplateId: "",
          },
        },
        {
          id: "end",
          type: "END",
          position: { x: 620, y: 200 },
          config: {
            label: "Cierre",
            templateIds: [], question: "", options: [], fallbackLabel: "",
            globalFlowId: "", checkoutFields: [], endMode: "FINISH", finalTemplateId: "",
          },
        },
      ],
      edges: [],
    };
    const version = await tx.salesFlowVersion.create({
      data: {
        tenantId: actor.tenantId,
        flowId: flow.id,
        version: 1,
        nodes: diagram.nodes as unknown as Prisma.InputJsonValue,
        edges: diagram.edges as unknown as Prisma.InputJsonValue,
        templates: {} as Prisma.InputJsonValue,
        globalFlows: {} as Prisma.InputJsonValue,
        createdById: actor.userId,
      },
    });
    await tx.salesFlow.update({ where: { id: flow.id }, data: { draftVersionId: version.id } });
    return flow.id;
  }, { maxWait: 30_000, timeout: 30_000 });

  return getFlow(actor, flowId);
}

async function buildSnapshots(actor: Actor, diagram: FlowDiagramDTO) {
  const templateIds = new Set<string>();
  for (const node of diagram.nodes) {
    node.config.templateIds.forEach((id) => templateIds.add(id));
    if (node.config.finalTemplateId) templateIds.add(node.config.finalTemplateId);
  }
  const templates = await getPrisma().messageTemplate.findMany({
    where: { id: { in: [...templateIds] }, tenantId: actor.tenantId },
  });
  const templateById = new Map(templates.map((item) => [item.id, item]));
  const snapshots: Record<string, TemplateSnapshotItem> = {};
  for (const id of templateIds) {
    const item = templateById.get(id);
    if (!item) throw new FlowInputError(`La plantilla ${id} no pertenece al negocio`);
    snapshots[id] = {
      id: item.id,
      name: item.name,
      type: item.type,
      content: item.content,
      imageId: item.imageId,
      mediaId: item.mediaId,
    };
  }

  const globalIds = new Set(
    diagram.nodes
      .filter((node) => node.type === "GLOBAL_FLOW")
      .map((node) => node.config.globalFlowId)
      .filter(Boolean),
  );
  const globalSnapshots: Record<string, GlobalFlowSnapshotItem> = {};
  for (const id of globalIds) {
    const flow = await getPrisma().salesFlow.findFirst({
      where: { id, tenantId: actor.tenantId, scope: "GLOBAL" },
      include: { draft: true, published: true },
    });
    if (!flow?.draft) throw new FlowInputError(`El flujo global ${id} no pertenece al negocio`);
    const version = flow.published ?? flow.draft;
    globalSnapshots[id] = {
      id: flow.id,
      name: flow.name,
      versionId: version.id,
      version: version.version,
      published: Boolean(flow.publishedVersionId),
      diagram: toVersionDTO(version).diagram,
    };
  }
  return { templates: snapshots, globalFlows: globalSnapshots };
}

export async function saveFlowDraft(
  actor: Actor,
  flowId: string,
  input: { diagram?: unknown; expectedRevision?: unknown },
): Promise<FlowDTO> {
  assertFlowManager(actor.role);
  const flow = await findOwnedFlow(actor, flowId);
  const draft = flow.draft;
  if (!draft) throw new FlowNotFoundError();
  const expected = typeof input.expectedRevision === "number" ? input.expectedRevision : undefined;
  if (expected !== undefined && draft.revision !== expected) {
    throw new FlowConflictError("El flujo cambió en otra pestaña. Recargue antes de guardar.");
  }
  const diagram = normalizeDiagram(input.diagram);
  const snapshots = await buildSnapshots(actor, diagram);

  await getPrisma().$transaction(async (tx) => {
    if (flow.publishedVersionId && draft.id === flow.publishedVersionId) {
      const latest = await tx.salesFlowVersion.findFirst({
        where: { flowId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const created = await tx.salesFlowVersion.create({
        data: {
          tenantId: actor.tenantId,
          flowId,
          version: (latest?.version ?? 1) + 1,
          nodes: diagram.nodes as unknown as Prisma.InputJsonValue,
          edges: diagram.edges as unknown as Prisma.InputJsonValue,
          templates: snapshots.templates as unknown as Prisma.InputJsonValue,
          globalFlows: snapshots.globalFlows as unknown as Prisma.InputJsonValue,
          createdById: actor.userId,
        },
      });
      await tx.salesFlow.update({
        where: { id: flowId },
        data: { draftVersionId: created.id, updatedById: actor.userId },
      });
    } else {
      await tx.salesFlowVersion.update({
        where: { id: draft.id },
        data: {
          nodes: diagram.nodes as unknown as Prisma.InputJsonValue,
          edges: diagram.edges as unknown as Prisma.InputJsonValue,
          templates: snapshots.templates as unknown as Prisma.InputJsonValue,
          globalFlows: snapshots.globalFlows as unknown as Prisma.InputJsonValue,
          revision: { increment: 1 },
        },
      });
      await tx.salesFlow.update({ where: { id: flowId }, data: { updatedById: actor.userId } });
    }
  }, { maxWait: 30_000, timeout: 30_000 });

  return getFlow(actor, flowId);
}

export async function publishFlow(
  actor: Actor,
  flowId: string,
  input: { expectedRevision?: unknown } = {},
): Promise<FlowDTO> {
  assertFlowPublisher(actor.role);
  const flow = await findOwnedFlow(actor, flowId);
  const draft = flow.draft;
  if (!draft) throw new FlowNotFoundError();
  const expected = typeof input.expectedRevision === "number" ? input.expectedRevision : undefined;
  if (expected !== undefined && draft.revision !== expected) {
    throw new FlowConflictError("El flujo cambió. Guarde y vuelva a publicar.");
  }

  const version = toVersionDTO(draft);
  const issues = validateForPublish({
    diagram: version.diagram,
    templates: version.templates,
    globalFlows: version.globalFlows,
    currentFlowId: flow.scope === "GLOBAL" ? flow.id : null,
    scope: flow.scope,
  });
  if (issues.length) throw new FlowValidationError(issues);

  await getPrisma().$transaction(async (tx) => {
    await tx.salesFlow.update({
      where: { id: flowId },
      data: { publishedVersionId: draft.id, publishedAt: new Date(), updatedById: actor.userId },
    });
  }, { maxWait: 30_000, timeout: 30_000 });
  return getFlow(actor, flowId);
}

export async function listGlobalFlowOptions(actor: Actor) {
  const flows = await listFlows(actor, "GLOBAL");
  return flows.map((flow) => ({
    id: flow.id,
    name: flow.name,
    published: flow.isPublished,
    version: flow.version.version,
  }));
}

export type PublishedFlowRuntime = {
  flowId: string;
  versionId: string;
  version: number;
  diagram: FlowDiagramDTO;
  templates: Record<string, TemplateSnapshotItem>;
  globalFlows: Record<string, GlobalFlowSnapshotItem>;
};

/** Versión publicada de un flujo por producto, con plantillas y flujos globales. */
export async function getPublishedFlowForProduct(tenantId: string, productId: string): Promise<PublishedFlowRuntime | null> {
  const flow = await getPrisma().salesFlow.findFirst({
    where: { tenantId, productId, scope: "PRODUCT" },
    include: { published: true },
  });
  if (!flow?.publishedVersionId || !flow.published) return null;
  const version = toVersionDTO(flow.published);
  return {
    flowId: flow.id,
    versionId: flow.published.id,
    version: flow.published.version,
    diagram: version.diagram,
    templates: version.templates,
    globalFlows: version.globalFlows,
  };
}

/** Versión publicada por id (para flujos globales). */
export async function getPublishedFlowById(tenantId: string, flowId: string): Promise<PublishedFlowRuntime | null> {
  const flow = await getPrisma().salesFlow.findFirst({
    where: { id: flowId, tenantId },
    include: { published: true },
  });
  if (!flow?.publishedVersionId || !flow.published) return null;
  const version = toVersionDTO(flow.published);
  return {
    flowId: flow.id,
    versionId: flow.published.id,
    version: flow.published.version,
    diagram: version.diagram,
    templates: version.templates,
    globalFlows: version.globalFlows,
  };
}
