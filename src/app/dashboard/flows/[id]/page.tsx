import { notFound } from "next/navigation";
import { FlowEditor } from "@/components/flows/flow-editor";
import { FlowNotFoundError, getFlow, listGlobalFlowOptions, listTemplates, requireFlowActor } from "@/lib/flows/service";

export const dynamic = "force-dynamic";

export default async function EditFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireFlowActor();
  const { id } = await params;
  let flow;
  try {
    flow = await getFlow(actor, id);
  } catch (error) {
    if (error instanceof FlowNotFoundError) notFound();
    throw error;
  }
  const [templates, globalFlows] = await Promise.all([
    listTemplates(actor),
    listGlobalFlowOptions(actor),
  ]);

  return (
    <FlowEditor
      flow={flow}
      templates={templates}
      globalFlows={globalFlows.filter((item) => item.id !== flow.id)}
      canPublish={actor.role === "OWNER"}
    />
  );
}
