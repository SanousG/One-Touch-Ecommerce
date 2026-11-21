import { WhatsappSettings } from "@/components/tenants/whatsapp-settings";
import { requireUser } from "@/lib/auth/session";
import { getActiveTenantSettings } from "@/lib/tenants/service";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const user = await requireUser();
  const settings = await getActiveTenantSettings(user.id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="mt-1 text-xs text-muted">Negocio: {settings.name}</p>
      </div>
      <WhatsappSettings phone={settings.whatsappPhone} canEdit={settings.role === "OWNER"} />
      <p className="text-xs text-muted">
        Próximamente: dominios personalizados, políticas de tienda y métodos de entrega.
      </p>
    </div>
  );
}
