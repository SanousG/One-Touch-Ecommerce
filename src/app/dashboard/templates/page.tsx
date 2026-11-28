import { TemplateManager } from "@/components/flows/template-manager";
import { listTemplateTypes, listTemplates, requireFlowActor } from "@/lib/flows/service";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const actor = await requireFlowActor();
  const [templates, templateTypes] = await Promise.all([
    listTemplates(actor),
    listTemplateTypes(actor),
  ]);
  return <TemplateManager templates={templates} templateTypes={templateTypes} />;
}
