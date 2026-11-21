import { listProducts } from "@/lib/catalog/service";
import { FlowsList } from "@/components/flows/flows-list";
import { listFlows, requireFlowActor } from "@/lib/flows/service";

export const dynamic = "force-dynamic";

export default async function FlowsPage() {
  const actor = await requireFlowActor();
  const [flows, products] = await Promise.all([listFlows(actor), listProducts(actor)]);
  return <FlowsList flows={flows} products={products} />;
}
