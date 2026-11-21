import "server-only";
import { Prisma } from "@prisma/client";
import { assertFlowManager, assertFlowPublisher } from "../auth/permissions";
import { getPrisma } from "../db/prisma";
import { getApiCatalogContext, requireCatalogContext } from "../catalog/service";
import { slugify, shortSuffix } from "../utils/slug";
import {
  normalizeDiagram,
  validateForPublish,
  FLOW_LIMITS,
} from "./validation";
import type {
  FlowDTO,
  FlowDiagramDTO,
  FlowVersionDTO,
  GlobalFlowSnapshotItem,
  TemplateDTO,
  TemplateSnapshotItem,
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
  type: "MESSAGE" | "CHECKOUT";
  content: string;
  imageId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): TemplateDTO {
  return {
    id: template.id,
    name: template.name,
    type: template.type,
    content: template.content,
    imageId: template.imageId,
    imageUrl: template.imageId ? `/api/admin/products/images/${template.imageId}/file` : null,
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

export async function listTemplates(actor: Actor): Promise<TemplateDTO[]> {
  const rows = await getPrisma().messageTemplate.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toTemplateDTO);
}

export async function createTemplate(actor: Actor, input: Record<string, unknown>): Promise<TemplateDTO> {
  assertFlowManager(actor.role);
  const type = input.type === "CHECKOUT" ? "CHECKOUT" : input.type === "MESSAGE" ? "MESSAGE" : null;
  if (!type) throw new FlowInputError("Tipo de plantilla no válido");
  const created = await getPrisma().messageTemplate.create({
    data: {
      tenantId: actor.tenantId,
      name: text(input.name, 80, "Nombre", true),
      type,
      content: text(input.content, FLOW_LIMITS.content, "Contenido", true),
      imageId: await validateTemplateImage(actor.tenantId, input.imageId),
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
  const type = input.type === undefined ? existing.type : input.type === "CHECKOUT" ? "CHECKOUT" : input.type === "MESSAGE" ? "MESSAGE" : null;
  if (!type) throw new FlowInputError("Tipo de plantilla no válido");
  const updated = await getPrisma().messageTemplate.update({
    where: { id: templateId },
    data: {
      name: input.name === undefined ? existing.name : text(input.name, 80, "Nombre", true),
      type,
      content: input.content === undefined ? existing.content : text(input.content, FLOW_LIMITS.content, "Contenido", true),
      imageId: input.imageId === undefined ? existing.imageId : await validateTemplateImage(actor.tenantId, input.imageId),
      isActive: input.isActive === undefined ? existing.isActive : input.isActive === true,
    },
  });
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

  const flowId = await getPrisma().$transaction(async (tx) => {
    const slug = await uniqueSlug(actor.tenantId, preferredSlug);
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
  });

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
  });

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
  });
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

/** Contrato previsto para el chatbot: versión publicada por producto. Sin conversaciones. */
export async function getPublishedFlowForProduct(tenantId: string, productId: string) {
  const flow = await getPrisma().salesFlow.findFirst({
    where: { tenantId, productId, scope: "PRODUCT" },
    include: { published: true },
  });
  if (!flow?.publishedVersionId || !flow.published) return null;
  return {
    flowId: flow.id,
    versionId: flow.published.id,
    version: flow.published.version,
    diagram: toVersionDTO(flow.published).diagram,
  };
}
