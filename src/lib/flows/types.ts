export const BLOCK_TYPES = ["START", "MESSAGE", "DECISION", "GLOBAL_FLOW", "CHECKOUT", "END"] as const;
export type FlowBlockType = (typeof BLOCK_TYPES)[number];

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
  type: "MESSAGE" | "CHECKOUT";
  content: string;
  imageId: string | null;
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
  type: "MESSAGE" | "CHECKOUT";
  content: string;
  imageId: string | null;
  imageUrl: string | null;
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
