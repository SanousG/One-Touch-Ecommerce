"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import { FlowNodeCard, type FlowRFNode } from "./flow-node-card";
import { FlowSimulator } from "./flow-simulator";
import {
  BLOCK_LABELS,
  defaultConfig,
  isMessageTemplateType,
  type FlowBlockType,
  type FlowDTO,
  type FlowIssue,
  type GlobalFlowSnapshotItem,
  type TemplateDTO,
  type TemplateSnapshotItem,
} from "@/lib/flows/types";

const nodeTypes = { flow: FlowNodeCard };

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
}

type Props = {
  flow: FlowDTO;
  templates: TemplateDTO[];
  globalFlows: { id: string; name: string; published: boolean; version: number }[];
  canPublish: boolean;
};

function toRFNodes(flow: FlowDTO): FlowRFNode[] {
  return flow.version.diagram.nodes.map((node) => ({
    id: node.id,
    type: "flow" as const,
    position: node.position,
    data: { node },
  }));
}

function toRFEdges(flow: FlowDTO): Edge[] {
  return flow.version.diagram.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    label: edge.label,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { stroke: "#4f46e5", strokeWidth: 2 },
    labelStyle: { fontSize: 10, fill: "#0f172a" },
    labelBgStyle: { fill: "#ffffff", fillOpacity: 0.95 },
  }));
}

export function FlowEditor(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  );
}

function FlowEditorInner({ flow, templates, globalFlows, canPublish }: Props) {
  const router = useRouter();
  const [published, setPublished] = useState(flow.isPublished);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(flow.hasUnpublishedChanges);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowRFNode>(toRFNodes(flow));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toRFEdges(flow));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revision, setRevision] = useState(flow.version.revision);
  const [status, setStatus] = useState<string | null>(null);
  const [issues, setIssues] = useState<FlowIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const onConnect = (connection: Connection) => setEdges((current) => addEdge({ ...connection, type: "smoothstep", markerEnd: { type: MarkerType.ArrowClosed } }, current));

  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const diagram = useMemo(() => ({
    nodes: nodes.map((node) => node.data.node),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      label: typeof edge.label === "string" ? edge.label : undefined,
    })),
  }), [nodes, edges]);

  const templateSnapshots: Record<string, TemplateSnapshotItem> = Object.fromEntries(
    templates.map((template) => [template.id, {
      id: template.id,
      name: template.name,
      type: template.type,
      content: template.content,
      imageId: template.imageId,
      mediaId: template.mediaId,
    }]),
  );

  const globalSnapshots: Record<string, GlobalFlowSnapshotItem> = Object.fromEntries(
    Object.entries(flow.version.globalFlows).map(([id, item]) => [id, item]),
  );

  function addBlock(type: FlowBlockType) {
    if (type === "START" && nodes.some((node) => node.data.node.type === "START")) {
      setStatus("Solo puede existir un bloque Inicio");
      return;
    }
    const id = newId("n");
    const node: FlowRFNode = {
      id,
      type: "flow",
      position: { x: 100 + (nodes.length % 4) * 260, y: 80 + Math.floor(nodes.length / 4) * 180 },
      data: {
        node: {
          id,
          type,
          position: { x: 100 + (nodes.length % 4) * 260, y: 80 + Math.floor(nodes.length / 4) * 180 },
          config: defaultConfig(type),
        },
      },
    };
    setNodes((current) => [...current, node]);
    setSelectedId(id);
    setSimulating(false);
  }

  function updateConfig(patch: Partial<FlowRFNode["data"]["node"]["config"]>) {
    if (!selected) return;
    setNodes((current) => current.map((node) =>
      node.id === selected.id
        ? { ...node, data: { node: { ...node.data.node, config: { ...node.data.node.config, ...patch } } } }
        : node,
    ));
  }

  function removeSelected() {
    if (!selected || selected.data.node.type === "START") return;
    setNodes((current) => current.filter((node) => node.id !== selected.id));
    setEdges((current) => current.filter((edge) => edge.source !== selected.id && edge.target !== selected.id));
    setSelectedId(null);
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    setIssues([]);
    try {
      const response = await fetch(`/api/admin/flows/${flow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diagram, expectedRevision: revision }),
      });
      const data = (await response.json()) as { error?: string; flow?: FlowDTO };
      if (!response.ok || !data.flow) { setStatus(data.error ?? "No se pudo guardar"); return; }
      setRevision(data.flow.version.revision);
      setPublished(data.flow.isPublished);
      setHasUnpublishedChanges(data.flow.hasUnpublishedChanges);
      setStatus("Borrador guardado. La versión publicada no se ha cambiado.");
      router.refresh();
    } catch {
      setStatus("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setSaving(true);
    setStatus(null);
    setIssues([]);
    try {
      const response = await fetch(`/api/admin/flows/${flow.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: revision }),
      });
      const data = (await response.json()) as { error?: string; issues?: FlowIssue[]; flow?: FlowDTO };
      if (!response.ok || !data.flow) {
        setStatus(data.error ?? "No se pudo publicar");
        setIssues(data.issues ?? []);
        return;
      }
      setRevision(data.flow.version.revision);
      setPublished(true);
      setHasUnpublishedChanges(false);
      setStatus("Flujo publicado correctamente.");
      router.refresh();
    } catch {
      setStatus("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-sm font-bold text-primary">Flujos de venta</span>
          <nav className="hidden items-center gap-1 text-xs text-muted md:flex">
            <Link href="/dashboard/flows" className="hover:text-primary">Flujos de venta</Link>
            <Icon name="chevronRight" size={13} />
            <span className="truncate text-foreground">{flow.name}</span>
          </nav>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${hasUnpublishedChanges ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {!published ? "Borrador" : hasUnpublishedChanges ? "Cambios sin publicar" : "Publicado"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50">
            <Icon name="check" size={16} /> Guardar
          </button>
          <button type="button" onClick={() => setSimulating((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm">
            <Icon name="play" size={16} /> Probar flujo
          </button>
          <button type="button" onClick={publish} disabled={saving || !canPublish} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">
            <Icon name="rocket" size={16} /> Publicar
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-3">
          {(["START", "MESSAGE", "DECISION", "GLOBAL_FLOW", "CHECKOUT", "END"] as FlowBlockType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type)}
              title={`Añadir ${BLOCK_LABELS[type]}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-primary"
            >
              <Icon name={type === "START" ? "hub" : type === "MESSAGE" ? "chat" : type === "DECISION" ? "split" : type === "GLOBAL_FLOW" ? "sync" : type === "CHECKOUT" ? "bag" : "check"} size={18} />
            </button>
          ))}
          <div className="my-2 h-px w-8 bg-border" />
          <button type="button" onClick={() => setSelectedId(null)} title="Deseleccionar" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-background"><Icon name="grid" size={18} /></button>
        </aside>

        <div className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => { setSelectedId(node.id); setSimulating(false); }}
            onPaneClick={() => setSelectedId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#cbd5e1" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor="#4f46e5" />
          </ReactFlow>
          {(status || issues.length > 0) ? (
            <div className="absolute left-3 top-3 z-10 max-w-md rounded-lg border border-border bg-surface/95 p-3 text-xs shadow-sm">
              {status ? <p className={issues.length ? "text-red-700" : "text-emerald-700"}>{status}</p> : null}
              {issues.length ? (
                <ul className="mt-1 space-y-0.5 text-red-700">
                  {issues.map((issue, index) => <li key={index}>• {issue.message}{issue.nodeId ? ` (${issue.nodeId})` : ""}</li>)}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-surface">
          {simulating ? (
            <FlowSimulator
              diagram={diagram}
              templates={templateSnapshots}
              globalFlows={globalSnapshots}
              productName={flow.productName}
              productPriceLabel={flow.productPriceLabel}
            />
          ) : selected ? (
            <Inspector
              node={selected.data.node}
              templates={templates}
              globalFlows={globalFlows}
              updateConfig={updateConfig}
              removeSelected={removeSelected}
            />
          ) : (
            <div className="p-4 text-xs text-muted">
              Seleccione un bloque para editar sus propiedades. Arrastre los nodos y conecte las salidas con las flechas laterales.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Inspector({
  node,
  templates,
  globalFlows,
  updateConfig,
  removeSelected,
}: {
  node: FlowRFNode["data"]["node"];
  templates: TemplateDTO[];
  globalFlows: { id: string; name: string; published: boolean; version: number }[];
  updateConfig: (patch: Partial<FlowRFNode["data"]["node"]["config"]>) => void;
  removeSelected: () => void;
}) {
  const config = node.config;
  const available = templates.filter((template) =>
    template.isActive && (node.type === "CHECKOUT" ? template.type === "CHECKOUT" : isMessageTemplateType(template.type)),
  );

  function toggleTemplate(id: string) {
    const exists = config.templateIds.includes(id);
    updateConfig({ templateIds: exists ? config.templateIds.filter((item) => item !== id) : [...config.templateIds, id] });
  }

  function moveTemplate(index: number, direction: -1 | 1) {
    const next = [...config.templateIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateConfig({ templateIds: next });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border p-4">
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          {BLOCK_LABELS[node.type]}
        </span>
        <p className="mt-2 font-mono text-[11px] text-muted">{node.id}</p>
      </div>
      <div className="flex flex-col gap-4 p-4 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Etiqueta del bloque</span>
          <input value={config.label} onChange={(event) => updateConfig({ label: event.target.value })} className={inputClass} />
        </label>

        {(node.type === "MESSAGE" || node.type === "CHECKOUT") ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted">Plantillas (en orden)</span>
            {config.templateIds.map((id, index) => (
              <div key={id} className="rounded-lg border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{templates.find((item) => item.id === id)?.name ?? id}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => moveTemplate(index, -1)} title="Subir" className="p-1 text-muted"><Icon name="arrowLeft" size={14} className="-rotate-90" /></button>
                    <button type="button" onClick={() => moveTemplate(index, 1)} title="Bajar" className="p-1 text-muted"><Icon name="arrowLeft" size={14} className="rotate-90" /></button>
                    <button type="button" onClick={() => toggleTemplate(id)} title="Quitar" className="p-1 text-red-500"><Icon name="trash" size={14} /></button>
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted">{templates.find((item) => item.id === id)?.content}</p>
              </div>
            ))}
            <select
              value=""
              onChange={(event) => event.target.value && toggleTemplate(event.target.value)}
              className={inputClass}
            >
              <option value="">+ Añadir plantilla…</option>
              {available.filter((item) => !config.templateIds.includes(item.id)).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted">Las plantillas se guardan en el snapshot del flujo; editarlas después no cambia la versión publicada.</p>
          </div>
        ) : null}

        {node.type === "DECISION" ? (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Pregunta</span>
              <input value={config.question} onChange={(event) => updateConfig({ question: event.target.value })} className={inputClass} />
            </label>
            <span className="text-xs font-medium text-muted">Opciones y ramas</span>
            {config.options.map((option, index) => (
              <div key={option.id} className="flex items-center gap-1">
                <input
                  value={option.label}
                  onChange={(event) => {
                    const options = [...config.options];
                    options[index] = { ...option, label: event.target.value };
                    updateConfig({ options });
                  }}
                  className={inputClass}
                />
                <button type="button" onClick={() => updateConfig({ options: config.options.filter((item) => item.id !== option.id) })} className="p-1 text-red-500" title="Quitar opción">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateConfig({ options: [...config.options, { id: newId("option"), label: "Nueva opción" }] })}
              className="self-start text-xs font-medium text-primary"
            >
              + Añadir opción
            </button>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Etiqueta de respuesta no reconocida</span>
              <input value={config.fallbackLabel} onChange={(event) => updateConfig({ fallbackLabel: event.target.value })} className={inputClass} />
            </label>
            <p className="text-[11px] text-muted">Conecte cada salida desde los puntos laterales del nodo. La salida <code>fallback</code> es obligatoria para publicar.</p>
          </div>
        ) : null}

        {node.type === "GLOBAL_FLOW" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted">Flujo global reutilizable</span>
            <select value={config.globalFlowId} onChange={(event) => updateConfig({ globalFlowId: event.target.value })} className={inputClass}>
              <option value="">Seleccione…</option>
              {globalFlows.map((item) => (
                <option key={item.id} value={item.id}>{item.name} {item.published ? `(v${item.version})` : "(sin publicar)"}</option>
              ))}
            </select>
          </label>
        ) : null}

        {node.type === "CHECKOUT" ? (
          <p className="rounded-lg bg-amber-50 p-3 text-[11px] text-amber-800">
            Checkout solo muestra la plantilla y los campos previstos. No confirma ventas, crea pedidos ni reserva stock.
          </p>
        ) : null}

        {node.type === "END" ? (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Tipo de cierre</span>
              <select value={config.endMode} onChange={(event) => updateConfig({ endMode: event.target.value as typeof config.endMode })} className={inputClass}>
                <option value="FINISH">Finalizar conversación</option>
                <option value="HANDOFF">Derivar a un asesor</option>
                <option value="FINISH_AFTER_CONFIRMATION">Finalizar después de confirmación válida</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Plantilla final (opcional)</span>
              <select value={config.finalTemplateId} onChange={(event) => updateConfig({ finalTemplateId: event.target.value })} className={inputClass}>
                <option value="">Ninguna</option>
                {templates.filter((item) => isMessageTemplateType(item.type) && item.isActive).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {node.type !== "START" ? (
          <button type="button" onClick={removeSelected} className="self-start text-xs font-medium text-red-600">Eliminar bloque</button>
        ) : (
          <p className="text-[11px] text-muted">El bloque Inicio no se puede eliminar.</p>
        )}
      </div>
    </div>
  );
}
