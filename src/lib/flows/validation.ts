import {
  BLOCK_TYPES,
  CHECKOUT_FIELDS,
  END_MODES,
  defaultConfig,
  isMessageTemplateType,
  type FlowBlockType,
  type FlowDiagramDTO,
  type FlowEdgeDTO,
  type FlowIssue,
  type FlowNodeDTO,
  type GlobalFlowSnapshotItem,
  type TemplateSnapshotItem,
} from "./types";

export const FLOW_LIMITS = {
  nodes: 60,
  edges: 120,
  templatesPerNode: 6,
  optionsPerDecision: 6,
  text: 240,
  content: 4000,
} as const;

function cleanText(value: unknown, max: number, field: string): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error(`${field} debe ser texto`);
  const text = value.trim();
  if (/[<>]/.test(text)) throw new Error(`${field} no puede contener HTML`);
  if (text.length > max) throw new Error(`${field} excede ${max} caracteres`);
  return text;
}

function cleanId(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) {
    throw new Error(`${field} no válido`);
  }
  return value;
}

/** Normaliza y valida la estructura del diagrama recibido del navegador. */
export function normalizeDiagram(input: unknown): FlowDiagramDTO {
  if (!input || typeof input !== "object") throw new Error("Diagrama no válido");
  const raw = input as Record<string, unknown>;
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) throw new Error("Diagrama no válido");
  if (raw.nodes.length > FLOW_LIMITS.nodes) throw new Error(`Máximo ${FLOW_LIMITS.nodes} nodos`);
  if (raw.edges.length > FLOW_LIMITS.edges) throw new Error(`Máximo ${FLOW_LIMITS.edges} conexiones`);

  const nodeIds = new Set<string>();
  const nodes: FlowNodeDTO[] = raw.nodes.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Nodo no válido");
    const node = item as Record<string, unknown>;
    const id = cleanId(node.id, "ID de nodo");
    if (nodeIds.has(id)) throw new Error("IDs de nodo duplicados");
    nodeIds.add(id);
    if (typeof node.type !== "string" || !BLOCK_TYPES.includes(node.type as FlowBlockType)) {
      throw new Error("Tipo de bloque no permitido");
    }
    const pos = (node.position ?? {}) as Record<string, unknown>;
    const x = Number(pos.x);
    const y = Number(pos.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 100000 || Math.abs(y) > 100000) {
      throw new Error("Posición de nodo no válida");
    }
    const rawConfig = (node.config ?? {}) as Record<string, unknown>;
    const base = defaultConfig(node.type as FlowBlockType);

    const templateIds = Array.isArray(rawConfig.templateIds)
      ? [...new Set(rawConfig.templateIds.map((value) => cleanId(value, "Plantilla")))]
      : [];
    if (templateIds.length > FLOW_LIMITS.templatesPerNode) throw new Error("Demasiadas plantillas en un bloque");

    const options = Array.isArray(rawConfig.options)
      ? rawConfig.options.map((item) => {
          const option = item as Record<string, unknown>;
          return {
            id: cleanId(option.id, "Opción"),
            label: cleanText(option.label, FLOW_LIMITS.text, "Etiqueta de opción"),
          };
        })
      : [];
    if (options.length > FLOW_LIMITS.optionsPerDecision) throw new Error("Demasiadas opciones");
    if (new Set(options.map((option) => option.id)).size !== options.length) {
      throw new Error("No pueden existir opciones repetidas en una decisión");
    }

    const checkoutFields = Array.isArray(rawConfig.checkoutFields)
      ? rawConfig.checkoutFields.filter((value): value is string => typeof value === "string" && (CHECKOUT_FIELDS as readonly string[]).includes(value))
      : [];

    const endMode = END_MODES.includes(rawConfig.endMode as never)
      ? (rawConfig.endMode as typeof END_MODES[number])
      : base.endMode;

    return {
      id,
      type: node.type as FlowBlockType,
      position: { x, y },
      config: {
        label: cleanText(rawConfig.label ?? base.label, FLOW_LIMITS.text, "Etiqueta") || base.label,
        templateIds,
        question: cleanText(rawConfig.question, FLOW_LIMITS.text, "Pregunta"),
        options,
        fallbackLabel: cleanText(rawConfig.fallbackLabel, FLOW_LIMITS.text, "Fallback"),
        globalFlowId: typeof rawConfig.globalFlowId === "string" && rawConfig.globalFlowId
          ? cleanId(rawConfig.globalFlowId, "Flujo global")
          : "",
        checkoutFields,
        endMode,
        finalTemplateId: typeof rawConfig.finalTemplateId === "string" && rawConfig.finalTemplateId
          ? cleanId(rawConfig.finalTemplateId, "Plantilla final")
          : "",
      },
    };
  });

  const edges: FlowEdgeDTO[] = raw.edges.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Conexión no válida");
    const edge = item as Record<string, unknown>;
    const result: FlowEdgeDTO = {
      id: cleanId(edge.id, "ID de conexión"),
      source: cleanId(edge.source, "Origen"),
      target: cleanId(edge.target, "Destino"),
    };
    if (typeof edge.sourceHandle === "string" && edge.sourceHandle) {
      result.sourceHandle = cleanId(edge.sourceHandle, "Salida");
    }
    if (typeof edge.label === "string" && edge.label) {
      result.label = cleanText(edge.label, FLOW_LIMITS.text, "Etiqueta de conexión");
    }
    return result;
  });

  return { nodes, edges };
}

function outgoing(diagram: FlowDiagramDTO, nodeId: string, handle?: string): FlowEdgeDTO[] {
  return diagram.edges.filter(
    (edge) => edge.source === nodeId && (handle === undefined || edge.sourceHandle === handle),
  );
}

function findCycles(diagram: FlowDiagramDTO): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const node of diagram.nodes) adjacency.set(node.id, []);
  for (const edge of diagram.edges) adjacency.get(edge.source)?.push(edge.target);

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack: string[] = [];
  const onStack = new Set<string>();

  function visit(id: string) {
    visited.add(id);
    stack.push(id);
    onStack.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (onStack.has(next)) {
        const index = stack.indexOf(next);
        cycles.push(stack.slice(index));
      } else if (!visited.has(next)) {
        visit(next);
      }
    }
    stack.pop();
    onStack.delete(id);
  }

  for (const node of diagram.nodes) if (!visited.has(node.id)) visit(node.id);
  return cycles;
}

function globalFlowCycles(
  current: FlowDiagramDTO,
  currentFlowId: string | null,
  snapshots: Record<string, GlobalFlowSnapshotItem>,
): boolean {
  const graph = new Map<string, string[]>();
  for (const [id, snapshot] of Object.entries(snapshots)) {
    graph.set(id, snapshot.diagram.nodes
      .filter((node) => node.type === "GLOBAL_FLOW")
      .map((node) => node.config.globalFlowId)
      .filter(Boolean));
  }
  if (currentFlowId) {
    graph.set(currentFlowId, current.nodes
      .filter((node) => node.type === "GLOBAL_FLOW")
      .map((node) => node.config.globalFlowId)
      .filter(Boolean));
  }
  const visited = new Set<string>();
  const active = new Set<string>();
  function visit(id: string): boolean {
    if (active.has(id)) return true;
    if (visited.has(id)) return false;
    active.add(id);
    for (const next of graph.get(id) ?? []) if (visit(next)) return true;
    active.delete(id);
    visited.add(id);
    return false;
  }
  for (const id of graph.keys()) if (visit(id)) return true;
  return false;
}

/** Validación previa a publicar. Los borradores incompletos están permitidos. */
export function validateForPublish(args: {
  diagram: FlowDiagramDTO;
  templates: Record<string, TemplateSnapshotItem>;
  globalFlows: Record<string, GlobalFlowSnapshotItem>;
  currentFlowId: string | null;
  scope: "PRODUCT" | "GLOBAL";
}): FlowIssue[] {
  const { diagram, templates, globalFlows, currentFlowId, scope } = args;
  const issues: FlowIssue[] = [];
  const nodes = new Map(diagram.nodes.map((node) => [node.id, node]));

  for (const edge of diagram.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) {
      issues.push({ edgeId: edge.id, message: "La conexión apunta a un nodo inexistente" });
    }
  }

  const starts = diagram.nodes.filter((node) => node.type === "START");
  if (starts.length !== 1) {
    issues.push({ message: "Debe existir exactamente un bloque Inicio" });
  } else {
    const start = starts[0];
    if (diagram.edges.some((edge) => edge.target === start.id)) {
      issues.push({ nodeId: start.id, message: "Inicio no puede tener conexiones entrantes" });
    }
    if (outgoing(diagram, start.id).length === 0) {
      issues.push({ nodeId: start.id, message: "Inicio debe tener una salida" });
    }
  }

  for (const node of diagram.nodes) {
    if (node.type === "MESSAGE") {
      if (node.config.templateIds.length === 0) {
        issues.push({ nodeId: node.id, message: "El bloque Mensaje necesita al menos una plantilla" });
      }
      for (const id of node.config.templateIds) {
        const template = templates[id];
        if (!template || !isMessageTemplateType(template.type)) {
          issues.push({ nodeId: node.id, message: `Plantilla de mensaje no válida: ${id}` });
        }
      }
    }
    if (node.type === "CHECKOUT") {
      if (node.config.templateIds.length !== 1 || templates[node.config.templateIds[0]]?.type !== "CHECKOUT") {
        issues.push({ nodeId: node.id, message: "Checkout necesita una plantilla de tipo Checkout" });
      }
    }
    if (node.type === "DECISION") {
      if (node.config.options.length === 0) {
        issues.push({ nodeId: node.id, message: "La decisión necesita opciones" });
      }
      for (const option of node.config.options) {
        if (outgoing(diagram, node.id, option.id).length === 0) {
          issues.push({ nodeId: node.id, message: `La opción "${option.label}" no tiene salida conectada` });
        }
      }
      if (outgoing(diagram, node.id, "fallback").length === 0) {
        issues.push({ nodeId: node.id, message: "Falta la salida de respuesta no reconocida" });
      }
    }
    if (node.type === "GLOBAL_FLOW") {
      const target = node.config.globalFlowId;
      if (!target || !globalFlows[target]?.published) {
        issues.push({ nodeId: node.id, message: "El flujo global referenciado no existe o no tiene versión publicada" });
      }
    }
    if (node.type === "END" && node.config.finalTemplateId && !templates[node.config.finalTemplateId]) {
      issues.push({ nodeId: node.id, message: "Plantilla final no válida" });
    }
  }

  if (globalFlowCycles(diagram, scope === "GLOBAL" ? currentFlowId : null, globalFlows)) {
    issues.push({ message: "Existe una referencia circular entre flujos globales" });
  }

  const reachable = new Set<string>();
  if (starts.length === 1) {
    const queue = [starts[0].id];
    while (queue.length) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const edge of outgoing(diagram, id)) queue.push(edge.target);
    }
    for (const node of diagram.nodes) {
      if (!reachable.has(node.id)) {
        issues.push({ nodeId: node.id, message: "El nodo es inalcanzable desde Inicio" });
      }
    }
  }

  if (!diagram.nodes.some((node) => node.type === "END" && reachable.has(node.id))) {
    issues.push({ message: "Debe existir al menos una salida terminal (Cierre) alcanzable" });
  }

  for (const cycle of findCycles(diagram)) {
    const cycleSet = new Set(cycle);
    const hasExplicitExit = cycle.some((id) => {
      const node = nodes.get(id);
      if (!node || node.type !== "DECISION") return false;
      return outgoing(diagram, id, "fallback").some((edge) => !cycleSet.has(edge.target) || nodes.get(edge.target)?.type === "END");
    });
    if (!hasExplicitExit) {
      issues.push({ nodeId: cycle[0], message: "Ciclo de ejecución sin salida explícita de terminación" });
    }
  }

  return issues;
}
