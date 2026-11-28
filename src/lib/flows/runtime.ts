import "server-only";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../db/prisma";
import type { CatalogActor } from "../catalog/service";
import { sendMessage, sendTemplateMessage } from "../whatsapp/conversations";
import { getPublishedFlowById, getPublishedFlowForProduct, type PublishedFlowRuntime } from "./service";
import type { FlowDiagramDTO, FlowNodeDTO, FlowOption } from "./types";

type FlowFrame = { flowId: string; versionId: string; nodeId: string };
type FlowState = {
  flowId: string;
  versionId: string;
  productId: string | null;
  frames: FlowFrame[];
  status: "ACTIVE" | "WAITING_DECISION" | "DONE";
};

type EngineInput = {
  tenantId: string;
  connectionId: string;
  conversationId: string;
  body: string;
};

const MAX_STEPS = 50;

function nextNode(diagram: FlowDiagramDTO, nodeId: string, handle?: string): FlowNodeDTO | null {
  const edge = diagram.edges.find(
    (item) => item.source === nodeId && (handle === undefined || item.sourceHandle === handle),
  );
  return edge ? diagram.nodes.find((node) => node.id === edge.target) ?? null : null;
}

function matchOption(options: FlowOption[], body: string): string {
  const text = body.trim().toLowerCase();
  const selectable = options.filter((option) => option.id !== "fallback");
  const numeric = Number(text);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= selectable.length) {
    return numeric === 0 ? "fallback" : selectable[numeric - 1].id;
  }
  for (const option of options) {
    if (option.id === "fallback") continue;
    const label = option.label.trim().toLowerCase();
    if (label && (text === label || text.includes(label))) return option.id;
  }
  return "fallback";
}

async function saveState(input: EngineInput, state: FlowState | null) {
  const row = await getPrisma().conversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: { context: true },
  });
  if (!row) return;
  const context = (row.context ?? {}) as Record<string, unknown>;
  const done = !state || state.status === "DONE";
  await getPrisma().conversation.update({
    where: { id: input.conversationId },
    data: {
      context: { ...context, flow: state } as Prisma.InputJsonValue,
      ...(state ? { mode: done ? "HUMAN" : "BOT" } : {}),
    },
  });
}

/**
 * Ejecuta el flujo publicado de un producto para un mensaje entrante.
 * Los mensajes se encolan en OutboundMessage; el worker Wasender los entrega.
 */
export async function runFlowEngine(input: EngineInput): Promise<{ handled: boolean; steps: number }> {
  const conversation = await getPrisma().conversation.findFirst({
    where: { id: input.conversationId, tenantId: input.tenantId },
    select: { status: true, context: true },
  });
  if (!conversation || conversation.status === "RESOLVED") return { handled: false, steps: 0 };

  const context = (conversation.context ?? {}) as Record<string, unknown>;
  const products = Array.isArray(context.products) ? (context.products as Array<{ productId?: string }>) : [];
  const existing = context.flow as FlowState | undefined;

  const actor: CatalogActor = { userId: "flow-engine", tenantId: input.tenantId, role: "OWNER" };
  let state: FlowState | null = existing ?? null;
  let steps = 0;
  console.info("[flow-engine] message recibido", { conversationId: input.conversationId, productId: products[0]?.productId ?? null, state: state?.status ?? "none" });

  if (!state || state.status === "DONE") {
    const productId = products[0]?.productId ?? null;
    if (!productId) return { handled: false, steps: 0 };
    const runtime = await getPublishedFlowForProduct(input.tenantId, productId);
    if (!runtime) return { handled: false, steps: 0 };
    state = {
      flowId: runtime.flowId,
      versionId: runtime.versionId,
      productId,
      frames: [{ flowId: runtime.flowId, versionId: runtime.versionId, nodeId: "start" }],
      status: "ACTIVE",
    };
    console.info("[flow-engine] flujo iniciado", runtime.flowId);
    await getPrisma().conversationEvent.create({
      data: {
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        type: "MODE_CHANGED",
        description: "Flujo automático iniciado",
        actorId: "flow-engine",
      },
    });
  } else if (state.status === "WAITING_DECISION") {
    const frame = state.frames[state.frames.length - 1];
    if (frame) {
      const runtime = await getPublishedFlowById(input.tenantId, frame.flowId);
      const node = runtime?.diagram.nodes.find((item) => item.id === frame.nodeId);
      if (runtime && node?.type === "DECISION") {
        const handle = matchOption(node.config.options, input.body);
        const target = nextNode(runtime.diagram, node.id, handle);
        frame.nodeId = target?.id ?? node.id;
        state.status = "ACTIVE";
      } else {
        state.status = "ACTIVE";
      }
    }
  }

  while (state && state.status === "ACTIVE" && steps < MAX_STEPS) {
    steps += 1;
    const frame = state.frames[state.frames.length - 1];
    if (!frame) { state.status = "DONE"; break; }
    const runtime: PublishedFlowRuntime | null = await getPublishedFlowById(input.tenantId, frame.flowId);
    if (!runtime) { state.status = "DONE"; break; }
    const node = runtime.diagram.nodes.find((item) => item.id === frame.nodeId);
    if (!node) { state.status = "DONE"; break; }

    if (node.type === "START") {
      const target = nextNode(runtime.diagram, node.id);
      if (!target) state.status = "DONE";
      else frame.nodeId = target.id;
      continue;
    }

    if (node.type === "MESSAGE" || node.type === "CHECKOUT") {
      console.info("[flow-engine] enviando bloque", node.type, node.config.templateIds.length);
      for (const templateId of node.config.templateIds) {
        try {
          await sendTemplateMessage(actor, input.conversationId, templateId);
        } catch (error) {
          console.error("[flow-engine] plantilla no enviada:", templateId, error instanceof Error ? error.message.slice(0, 160) : "error");
        }
      }
      const target = nextNode(runtime.diagram, node.id);
      if (!target) state.status = "DONE";
      else frame.nodeId = target.id;
      continue;
    }

    if (node.type === "DECISION") {
      const question = node.config.question?.trim() || "Elija una opción";
      const options = node.config.options.map((option, index) =>
        `${option.id === "fallback" ? "0" : String(index + 1)}. ${option.label}`,
      );
      try {
        await sendMessage(actor, input.conversationId, [question, ...options].join("\n"));
      } catch (error) {
        console.error("[flow-engine] decisión no enviada:", error instanceof Error ? error.message.slice(0, 160) : "error");
      }
      state.status = "WAITING_DECISION";
      break;
    }

    if (node.type === "GLOBAL_FLOW") {
      const target = nextNode(runtime.diagram, node.id);
      frame.nodeId = target?.id ?? node.id;
      const global = await getPublishedFlowById(input.tenantId, node.config.globalFlowId);
      if (global) {
        state.frames.push({ flowId: global.flowId, versionId: global.versionId, nodeId: "start" });
      }
      continue;
    }

    if (node.type === "END") {
      if (node.config.finalTemplateId) {
        try {
          await sendTemplateMessage(actor, input.conversationId, node.config.finalTemplateId);
        } catch (error) {
          console.error("[flow-engine] plantilla final no enviada:", error instanceof Error ? error.message.slice(0, 160) : "error");
        }
      }
      state.frames.pop();
      if (state.frames.length === 0) state.status = "DONE";
      continue;
    }
  }

  await saveState(input, state);
  return { handled: true, steps };
}
