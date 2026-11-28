export const BLOCK_TYPES = ["START", "MESSAGE", "DECISION", "GLOBAL_FLOW", "CHECKOUT", "END"] as const;
export type FlowBlockType = (typeof BLOCK_TYPES)[number];

/** Tipos creados automáticamente para cada negocio. El catálogo editable vive en `template_types`. */
export const DEFAULT_TEMPLATE_TYPES = [
  { slug: "MESSAGE", name: "Mensaje" },
  { slug: "CHECKOUT", name: "Checkout" },
  { slug: "GREETING", name: "Saludo" },
  { slug: "PRODUCT", name: "Presentación de producto" },
  { slug: "PROMOTION", name: "Promoción" },
  { slug: "FOLLOW_UP", name: "Seguimiento" },
  { slug: "CONFIRMATION", name: "Confirmación" },
  { slug: "DELIVERY", name: "Entrega" },
  { slug: "THANKS", name: "Agradecimiento" },
  { slug: "FAQ", name: "Pregunta / FAQ" },
] as const;

export type TemplateType = string;

export const TEMPLATE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DEFAULT_TEMPLATE_TYPES.map((item) => [item.slug, item.name]),
);

export type TemplateTypeDTO = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
};

/** Todos los tipos excepto Checkout se pueden usar en bloques Mensaje. */
export function isMessageTemplateType(type: TemplateType): boolean {
  return type.toLowerCase() !== "checkout";
}

export const END_MODES = ["FINISH", "HANDOFF", "FINISH_AFTER_CONFIRMATION"] as const;
export type FlowEndMode = (typeof END_MODES)[number];

export const CHECKOUT_FIELDS = [
  "producto",
  "variante",
  "cantidad",
  "nombre",
  "telefono",
  "entrega",
  "modalidad",
  "pago",
  "adelanto",
  "confirmacion",
] as const;

export type FlowOption = { id: string; label: string };

export type FlowNodeConfig = {
  label: string;
  templateIds: string[];
  question: string;
  options: FlowOption[];
  fallbackLabel: string;
  globalFlowId: string;
  checkoutFields: string[];
  endMode: FlowEndMode;
  finalTemplateId: string;
};

export type FlowNodeDTO = {
  id: string;
  type: FlowBlockType;
  position: { x: number; y: number };
  config: FlowNodeConfig;
};

export type FlowEdgeDTO = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
};

export type FlowDiagramDTO = { nodes: FlowNodeDTO[]; edges: FlowEdgeDTO[] };

export type TemplateSnapshotItem = {
  id: string;
  name: string;
  type: TemplateType;
  content: string;
  imageId: string | null;
  mediaId: string | null;
};

export type GlobalFlowSnapshotItem = {
  id: string;
  name: string;
  versionId: string;
  version: number;
  published: boolean;
  diagram: FlowDiagramDTO;
};

export type FlowVersionDTO = {
  version: number;
  revision: number;
  diagram: FlowDiagramDTO;
  templates: Record<string, TemplateSnapshotItem>;
  globalFlows: Record<string, GlobalFlowSnapshotItem>;
};

export type FlowDTO = {
  id: string;
  tenantId: string;
  productId: string | null;
  scope: "PRODUCT" | "GLOBAL";
  name: string;
  slug: string;
  description: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
  productName: string | null;
  productPriceLabel: string | null;
  version: FlowVersionDTO;
};

export type TemplateDTO = {
  id: string;
  name: string;
  type: TemplateType;
  content: string;
  /** Adjunto propio subido por el usuario (Drive). */
  mediaId: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
  /** Adjunto heredado del catálogo (plantillas antiguas). */
  imageId: string | null;
  imageUrl: string | null;
  imageMimeType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FlowIssue = { nodeId?: string; edgeId?: string; message: string };

export const BLOCK_LABELS: Record<FlowBlockType, string> = {
  START: "Inicio",
  MESSAGE: "Mensaje",
  DECISION: "Decisión",
  GLOBAL_FLOW: "Flujo global",
  CHECKOUT: "Checkout",
  END: "Cierre",
};

export function defaultConfig(type: FlowBlockType): FlowNodeConfig {
  return {
    label: BLOCK_LABELS[type],
    templateIds: [],
    question: type === "DECISION" ? "¿Qué desea hacer el cliente?" : "",
    options:
      type === "DECISION"
        ? [
            { id: "option_1", label: "Quiero comprar" },
            { id: "option_2", label: "Tengo una duda" },
            { id: "fallback", label: "Hablar con un asesor" },
          ]
        : [],
    fallbackLabel: "Respuesta no reconocida",
    globalFlowId: "",
    checkoutFields: type === "CHECKOUT" ? [...CHECKOUT_FIELDS] : [],
    endMode: "FINISH",
    finalTemplateId: "",
  };
}
