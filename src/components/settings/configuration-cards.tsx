"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import { ConnectionsManager } from "@/components/whatsapp/connections-manager";
import type { CategoryDTO } from "@/lib/catalog/service";
import type { ConnectionDTO } from "@/lib/whatsapp/service";

type Settings = {
  id: string;
  name: string;
  slug: string;
  role: "OWNER" | "OPERATOR";
};

type ConnectionInfo = {
  status: string;
  verifiedPhone: string | null;
  expectedPhone: string | null;
  providerLabel: string | null;
  webhookUrl: string | null;
} | null;

type ProviderOption = { kind: string; label: string; available: boolean };

type Props = {
  settings: Settings;
  categories: CategoryDTO[];
  connection: ConnectionInfo;
  connections: ConnectionDTO[];
  providers: ProviderOption[];
  canEdit: boolean;
  webhookBaseConfigured: boolean;
};

type SectionId = "business" | "whatsapp" | "categories" | "store";

type IconName = "settings" | "chat" | "folder" | "storefront";

const SECTIONS: Array<{ id: SectionId; icon: IconName; title: string; description: string; summary: string }> = [
  { id: "business", icon: "settings", title: "Datos del negocio", description: "Nombre y dirección de la tienda.", summary: "" },
  { id: "whatsapp", icon: "chat", title: "Canal de WhatsApp", description: "Número vinculado y conexión WasenderAPI.", summary: "" },
  { id: "categories", icon: "folder", title: "Categorías del catálogo", description: "Agrupa los productos de la tienda.", summary: "" },
  { id: "store", icon: "storefront", title: "Tienda", description: "Dominios, políticas y entregas.", summary: "Próximamente" },
];

function BusinessSection({ settings }: { settings: Settings }) {
  const router = useRouter();
  const canEdit = settings.role === "OWNER";
  const [name, setName] = useState(settings.name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/admin/tenants/general", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "No se pudo guardar"); return; }
      setSaved(true);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Nombre del negocio</span>
        <input value={name} disabled={!canEdit} maxLength={60} onChange={(event) => setName(event.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Dirección de la tienda</span>
        <input value={settings.slug} disabled className={`${inputClass} opacity-70`} />
      </label>
      <p className="text-[11px] text-muted">El slug no cambia al renombrar. Solo el propietario (OWNER) puede modificar estos datos.</p>
      {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
      {saved ? <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Datos guardados.</p> : null}
      {canEdit ? (
        <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      ) : null}
    </form>
  );
}

function WhatsappSection({
  connection,
  connections,
  providers,
  canEdit,
  webhookBaseConfigured,
}: {
  connection: ConnectionInfo;
  connections: ConnectionDTO[];
  providers: ProviderOption[];
  canEdit: boolean;
  webhookBaseConfigured: boolean;
}) {
  const phone = connection?.verifiedPhone ?? connection?.expectedPhone ?? null;
  const connected = connection?.status === "CONNECTED";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-background p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Número vinculado</p>
        <p className="mt-1 text-lg font-semibold">{phone ?? "Sin número registrado"}</p>
        <p className="mt-2 text-xs text-muted">
          Este número se toma directamente de la sesión de WhatsApp conectada. Ya no se configura por separado.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-medium text-muted">Estado</p>
            <p className={connected ? "text-emerald-700" : "text-amber-700"}>
              {connection ? String(connection.status).replaceAll("_", " ").toLowerCase() : "Sin conexión"}
            </p>
          </div>
          <div>
            <p className="font-medium text-muted">Proveedor</p>
            <p>{connection?.providerLabel ?? "—"}</p>
          </div>
        </div>
        {connection?.webhookUrl ? (
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-muted">URL del webhook</p>
            <code className="block break-all rounded-lg bg-surface p-2 text-[11px]">{connection.webhookUrl}</code>
          </div>
        ) : null}
      </div>
      <ConnectionsManager
        connections={connections}
        providers={providers}
        canEdit={canEdit}
        webhookBaseConfigured={webhookBaseConfigured}
      />
    </div>
  );
}

function CategoriesSection({ categories }: { categories: CategoryDTO[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "No se pudo crear la categoría"); return; }
      setName("");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2">
        {categories.length === 0 ? (
          <li className="text-xs text-muted">Aún no hay categorías.</li>
        ) : categories.map((category) => (
          <li key={category.id} className="rounded-full border border-border bg-background px-3 py-1 text-xs">
            {category.name}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted">Nueva categoría</span>
          <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Bebidas" className={inputClass} />
        </label>
        {error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
        <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Creando…" : "Añadir categoría"}
        </button>
      </form>
    </div>
  );
}

export function ConfigurationCards({ settings, categories, connection, connections, providers, canEdit, webhookBaseConfigured }: Props) {
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const summaries: Record<SectionId, string> = {
    business: settings.name,
    whatsapp: connection?.verifiedPhone ?? connection?.expectedPhone ?? "Sin conectar",
    categories: `${categories.length} ${categories.length === 1 ? "categoría" : "categorías"}`,
    store: "Próximamente",
  };

  const activeSection = SECTIONS.find((section) => section.id === active);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActive(section.id)}
            className="flex flex-col items-start rounded-xl border border-border bg-surface p-5 text-left shadow-sm transition hover:border-primary/40 hover:bg-background"
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon name={section.icon} size={20} className="text-primary" />
                <h2 className="text-sm font-semibold">{section.title}</h2>
              </div>
              <span className="text-primary" aria-hidden>→</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">{section.description}</p>
            <p className="mt-3 text-xs font-medium text-foreground">{summaries[section.id]}</p>
          </button>
        ))}
      </div>

      {active && activeSection ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setActive(null)} role="presentation">
          <div
            className={`max-h-[90vh] w-full overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl ${active === "whatsapp" ? "max-w-3xl" : "max-w-lg"}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Icon name={activeSection.icon} size={19} className="text-primary" />
                <div>
                  <h2 className="text-base font-semibold">{activeSection.title}</h2>
                  <p className="text-[11px] text-muted">{activeSection.description}</p>
                </div>
              </div>
              <button type="button" onClick={() => setActive(null)} aria-label="Cerrar" className="rounded-full px-2 text-xl leading-none text-muted hover:bg-background">×</button>
            </div>
            {active === "business" ? <BusinessSection settings={settings} /> : null}
            {active === "whatsapp" ? (
              <WhatsappSection
                connection={connection}
                connections={connections}
                providers={providers}
                canEdit={canEdit}
                webhookBaseConfigured={webhookBaseConfigured}
              />
            ) : null}
            {active === "categories" ? <CategoriesSection categories={categories} /> : null}
            {active === "store" ? (
              <p className="rounded-lg border border-dashed border-border bg-background px-3 py-6 text-center text-xs text-muted">
                Dominios personalizados, políticas de tienda y métodos de entrega. Próximamente.
              </p>
            ) : null}
            <p className="mt-5 text-right text-[11px] text-muted">Clic fuera o Esc para cerrar</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
