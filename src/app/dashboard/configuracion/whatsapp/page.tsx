import { ConnectionsManager } from "@/components/whatsapp/connections-manager";
import { requireWhatsAppActor, listConnections, providerCatalog } from "@/lib/whatsapp/service";

export const dynamic = "force-dynamic";

export default async function WhatsAppConfigPage() {
  const actor = await requireWhatsAppActor();
  const [connections, providers] = await Promise.all([listConnections(actor), Promise.resolve(providerCatalog())]);
  return (
    <ConnectionsManager
      connections={connections}
      providers={providers}
      canEdit={actor.role === "OWNER"}
      webhookBaseConfigured={Boolean(process.env.WHATSAPP_WEBHOOK_BASE_URL)}
    />
  );
}
