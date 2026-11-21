"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import type { TemplateDTO } from "@/lib/flows/types";

type ImageOption = { id: string; url: string; label: string };

type FormState = {
  name: string;
  type: "MESSAGE" | "CHECKOUT";
  content: string;
  imageId: string;
  isActive: boolean;
};

const emptyForm: FormState = { name: "", type: "MESSAGE", content: "", imageId: "", isActive: true };

export function TemplateManager({ templates, images }: { templates: TemplateDTO[]; images: ImageOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TemplateDTO | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function open(template: TemplateDTO | "new") {
    setEditing(template);
    setForm(template === "new" ? emptyForm : {
      name: template.name,
      type: template.type,
      content: template.content,
      imageId: template.imageId ?? "",
      isActive: template.isActive,
    });
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = editing === "new" ? "/api/admin/templates" : `/api/admin/templates/${(editing as TemplateDTO).id}`;
      const response = await fetch(url, {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "No se pudo guardar"); return; }
      setEditing(null);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plantillas de mensaje</h1>
          <p className="mt-1 text-xs text-muted">Contenido reutilizable por los bloques Mensaje y Checkout.</p>
        </div>
        <button type="button" onClick={() => open("new")} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
          <Icon name="plus" size={17} /> Nueva plantilla
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="font-semibold">No hay plantillas</p>
          <p className="mt-1 text-xs text-muted">Cree una plantilla para usarla en los flujos de venta.</p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{template.name}</p>
                    <p className="line-clamp-1 max-w-md text-xs text-muted">{template.content}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{template.type === "CHECKOUT" ? "Checkout" : "Mensaje"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${template.isActive ? "bg-emerald-50 text-emerald-700" : "bg-surface-soft text-muted"}`}>
                      {template.isActive ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button type="button" onClick={() => open(template)} className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-primary" title="Editar plantilla">
                      <Icon name="edit" size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setEditing(null)}>
          <form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="w-full max-w-xl space-y-3 rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing === "new" ? "Nueva plantilla" : "Editar plantilla"}</h2>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Nombre</span>
              <input required minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Tipo</span>
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as FormState["type"] })} className={inputClass}>
                <option value="MESSAGE">Mensaje</option>
                <option value="CHECKOUT">Checkout</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Contenido</span>
              <textarea required rows={5} maxLength={4000} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} className={inputClass} />
              <span className="text-[11px] text-muted">Texto plano. Las variables dinámicas se resolverán en el futuro motor.</span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted">Imagen opcional (recursos del negocio)</span>
              <select value={form.imageId} onChange={(event) => setForm({ ...form, imageId: event.target.value })} className={inputClass}>
                <option value="">Sin imagen</option>
                {images.map((image) => <option key={image.id} value={image.id}>{image.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
              Activa
            </label>
            {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
