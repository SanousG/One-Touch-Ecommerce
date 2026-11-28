import { ConfigurationCards } from "@/components/settings/configuration-cards";
import { requireUser } from "@/lib/auth/session";
import { listCategories, requireCatalogContext } from "@/lib/catalog/service";
import { listTemplateTypes } from "@/lib/flows/service";
import { getActiveTenantSettings } from "@/lib/tenants/service";
import { listConnections, providerCatalog } from "@/lib/whatsapp/service";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const [user, catalogActor] = await Promise.all([requireUser(), requireCatalogContext()]);
  const [settings, categories, templateTypes, connections] = await Promise.all([
    getActiveTenantSettings(user.id),
    listCategories(catalogActor),
    listTemplateTypes(catalogActor),
    listConnections(catalogActor),
  ]);
  const primary = connections.find((connection) => connection.isPrimary) ?? connections[0] ?? null;
  const connection = primary
    ? {
        status: primary.status,
        verifiedPhone: primary.verifiedPhone,
        expectedPhone: primary.expectedPhone,
        providerLabel: primary.providerLabel,
        webhookUrl: primary.webhookUrl,
      }
    : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="mt-1 text-xs text-muted">Negocio: {settings.name}</p>
      </div>
      <ConfigurationCards
        settings={settings}
        categories={categories}
        templateTypes={templateTypes}
        connection={connection}
        connections={connections}
        providers={providerCatalog()}
        canEdit={settings.role === "OWNER"}
        webhookBaseConfigured={Boolean(process.env.WHATSAPP_WEBHOOK_BASE_URL)}
      />
    </div>
  );
}
