"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type {
  FlowDiagramDTO,
  FlowNodeDTO,
  GlobalFlowSnapshotItem,
  TemplateSnapshotItem,
} from "@/lib/flows/types";

type Props = {
  diagram: FlowDiagramDTO;
  templates: Record<string, TemplateSnapshotItem>;
  globalFlows: Record<string, GlobalFlowSnapshotItem>;
  productName: string | null;
  productPriceLabel: string | null;
};

type Frame = { diagram: FlowDiagramDTO; nodeId: string; returnTo?: { diagram: FlowDiagramDTO; nodeId: string } };

const MAX_STEPS = 30;

export function FlowSimulator({ diagram, templates, globalFlows, productName, productPriceLabel }: Props) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [trace, setTrace] = useState<string[]>([]);
  const [steps, setSteps] = useState(0);
  const [ended, setEnded] = useState<string | null>(null);

  const currentNode = frame ? frame.diagram.nodes.find((node) => node.id === frame.nodeId) : undefined;

  function reset() {
    const start = diagram.nodes.find((node) => node.type === "START");
    setFrame(start ? { diagram, nodeId: start.id } : null);
    setTrace(start ? ["Inicio del flujo"] : []);
    setSteps(0);
    setEnded(start ? null : "No hay bloque Inicio en el borrador");
  }

  function move(handle?: string) {
    if (!frame || steps + 1 > MAX_STEPS) {
      setEnded(`Límite de ${MAX_STEPS} pasos alcanzado`);
      return;
    }
    const edge = frame.diagram.edges.find(
      (item) => item.source === frame.nodeId && (handle === undefined || item.sourceHandle === handle),
    );
    if (!edge) {
      setEnded("Esta rama no tiene una salida conectada");
      return;
    }
    const nextNode = frame.diagram.nodes.find((node) => node.id === edge.target);
    if (!nextNode) {
      setEnded("La conexión apunta a un nodo inexistente");
      return;
    }

    const nextSteps = steps + 1;
    setSteps(nextSteps);
    setTrace((current) => [...current, `${nextNode.config.label}${edge.label ? ` · ${edge.label}` : ""}`]);

    if (nextNode.type === "GLOBAL_FLOW") {
      const snapshot = globalFlows[nextNode.config.globalFlowId];
      const start = snapshot?.diagram.nodes.find((node) => node.type === "START");
      const following = frame.diagram.edges.find((item) => item.source === nextNode.id);
      if (!snapshot || !start || !following) {
        setEnded("El flujo global no está disponible o no tiene retorno");
        return;
      }
      setFrame({
        diagram: snapshot.diagram,
        nodeId: start.id,
        returnTo: { diagram: frame.diagram, nodeId: following.target },
      });
      setTrace((current) => [...current, `Flujo global: ${snapshot.name} (v${snapshot.version})`]);
      return;
    }

    if (nextNode.type === "END") {
      if (frame.returnTo) {
        setFrame({ ...frame.returnTo });
        setTrace((current) => [...current, "Retorno al flujo principal"]);
        return;
      }
      setEnded(`Fin: ${nextNode.config.endMode}`);
      return;
    }

    setFrame({ ...frame, nodeId: nextNode.id, diagram: frame.diagram });
  }

  return (
    <section className="flex h-full flex-col gap-3 p-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <p className="font-semibold">Simulación local</p>
        <p className="mt-1">No envía mensajes, no crea pedidos, no reserva stock ni registra conversaciones.</p>
      </div>

      {productName ? (
        <div className="rounded-lg bg-background p-3 text-xs text-muted">
          Producto simulado: <span className="font-semibold text-foreground">{productName}</span>
          {productPriceLabel ? ` · ${productPriceLabel}` : ""}
        </div>
      ) : null}

      {!frame ? (
        <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
          <Icon name="play" size={16} /> Comenzar desde Inicio
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {currentNode ? <NodePreview node={currentNode} templates={templates} move={move} /> : null}
          <div className="flex items-center gap-2">
            <button type="button" onClick={reset} className="rounded-lg border border-border px-3 py-2 text-xs">Reiniciar</button>
            <span className="text-[11px] text-muted">Paso {steps}/{MAX_STEPS}</span>
          </div>
        </div>
      )}

      {ended ? (
        <div className="rounded-lg bg-surface-soft p-3 text-xs font-medium">{ended}</div>
      ) : null}

      <div className="mt-auto border-t border-border pt-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Recorrido</p>
        <ol className="max-h-40 space-y-1 overflow-y-auto text-[11px] text-muted">
          {trace.map((item, index) => <li key={index}>{index + 1}. {item}</li>)}
        </ol>
      </div>
    </section>
  );
}

function NodePreview({
  node,
  templates,
  move,
}: {
  node: FlowNodeDTO;
  templates: Record<string, TemplateSnapshotItem>;
  move: (handle?: string) => void;
}) {
  if (node.type === "DECISION") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">{node.config.question || node.config.label}</p>
        {node.config.options.map((option) => (
          <button key={option.id} type="button" onClick={() => move(option.id)} className="rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-background">
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (node.type === "MESSAGE" || node.type === "CHECKOUT") {
    const items = node.config.templateIds.map((id) => templates[id]).filter(Boolean);
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">{node.config.label}</p>
        {items.map((template) => (
          <div key={template.id} className="rounded-lg bg-background p-3 text-xs leading-relaxed">
            <p className="mb-1 font-semibold">{template.name}</p>
            <p className="whitespace-pre-wrap text-muted">{template.content}</p>
          </div>
        ))}
        {node.type === "CHECKOUT" ? (
          <p className="text-[11px] text-amber-700">Mostrar la plantilla no confirma una venta ni crea un pedido.</p>
        ) : null}
        <button type="button" onClick={() => move()} className="self-start rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">Continuar</button>
      </div>
    );
  }

  if (node.type === "GLOBAL_FLOW") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">{node.config.label}</p>
        <button type="button" onClick={() => move()} className="self-start rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white">Ejecutar flujo global</button>
      </div>
    );
  }

  if (node.type === "END") {
    const finalTemplate = node.config.finalTemplateId ? templates[node.config.finalTemplateId] : null;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Cierre: {node.config.endMode}</p>
        {finalTemplate ? <p className="rounded-lg bg-background p-3 text-xs whitespace-pre-wrap">{finalTemplate.content}</p> : null}
        <p className="text-[11px] text-muted">La derivación a asesor es solo configuración en esta fase.</p>
        <button type="button" onClick={() => move()} className="self-start rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">Finalizar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{node.config.label}</p>
      <p className="text-xs text-muted">Contexto del producto precargado en el piloto.</p>
      <button type="button" onClick={() => move()} className="self-start rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Continuar</button>
    </div>
  );
}
