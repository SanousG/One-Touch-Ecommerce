"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { BLOCK_LABELS, type FlowNodeDTO } from "@/lib/flows/types";

export type FlowRFNode = Node<{ node: FlowNodeDTO }, "flow">;

const accent: Record<FlowNodeDTO["type"], string> = {
  START: "bg-emerald-500",
  MESSAGE: "bg-primary",
  DECISION: "bg-violet-600",
  GLOBAL_FLOW: "bg-sky-600",
  CHECKOUT: "bg-amber-600",
  END: "bg-slate-500",
};

export function FlowNodeCard({ data, selected }: NodeProps<FlowRFNode>) {
  const node = data.node;
  const isDecision = node.type === "DECISION";
  const isEnd = node.type === "END";
  const isStart = node.type === "START";

  return (
    <div
      className={`w-56 overflow-hidden rounded-lg border bg-surface shadow-sm ${selected ? "ring-2 ring-primary" : "border-border"}`}
    >
      <div className={`h-1.5 w-full ${accent[node.type]}`} />
      <div className="px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {BLOCK_LABELS[node.type]}
        </p>
        <p className="truncate text-sm font-semibold" title={node.config.label}>{node.config.label}</p>

        {node.type === "MESSAGE" || node.type === "CHECKOUT" ? (
          <p className="mt-1 text-[11px] text-muted">
            {node.config.templateIds.length} {node.config.templateIds.length === 1 ? "plantilla" : "plantillas"}
          </p>
        ) : null}
        {isDecision ? (
          <div className="mt-1 space-y-0.5">
            {node.config.options.map((option) => (
              <p key={option.id} className="truncate rounded bg-background px-1.5 py-0.5 text-[10px] text-muted">
                {option.label}
              </p>
            ))}
          </div>
        ) : null}
        {node.type === "GLOBAL_FLOW" ? (
          <p className="mt-1 truncate text-[11px] text-muted">{node.config.globalFlowId || "Sin flujo seleccionado"}</p>
        ) : null}
        {isEnd ? (
          <p className="mt-1 text-[11px] text-muted">{node.config.endMode}</p>
        ) : null}
      </div>

      {!isStart ? <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !bg-primary" /> : null}

      {!isEnd ? (
        isDecision ? (
          <>
            {node.config.options.map((option, index) => (
              <Handle
                key={option.id}
                id={option.id}
                type="source"
                position={Position.Right}
                style={{ top: `${38 + index * 24}px` }}
                title={option.label}
                className="!h-2.5 !w-2.5 !bg-violet-600"
              />
            ))}
          </>
        ) : (
          <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !bg-primary" />
        )
      ) : null}
    </div>
  );
}
