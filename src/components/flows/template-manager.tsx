"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import { TEMPLATE_TYPE_LABELS, type TemplateDTO, type TemplateType, type TemplateTypeDTO } from "@/lib/flows/types";

type FormState = {
  name: string;
  type: TemplateType;
  content: string;
  /** Adjunto propio (Drive). */
  mediaId: string;
  mediaUrl: string;
  mediaMimeType: string;
  mediaFileName: string;
  /** Adjunto heredado del catálogo en plantillas antiguas. */
  imageId: string;
  isActive: boolean;
};

const EMOJIS = ["😀", "👍", "🔥", "🎁", "❤️", "🙏", "✨", "👋", "🎉", "😊", "💯", "🚚"];

export function TemplateManager({
  templates,
  templateTypes,
}: {
  templates: TemplateDTO[];
  templateTypes: TemplateTypeDTO[];
}) {
  const router = useRouter();
  function makeEmptyForm(): FormState {
    return {
      name: "",
      type: templateTypes.find((item) => item.slug === "MESSAGE")?.slug ?? templateTypes[0]?.slug ?? "MESSAGE",
      content: "",
      mediaId: "",
      mediaUrl: "",
      mediaMimeType: "",
      mediaFileName: "",
      imageId: "",
      isActive: true,
    };
  }
  function typeLabel(slug: string): string {
    return templateTypes.find((item) => item.slug === slug)?.name ?? TEMPLATE_TYPE_LABELS[slug] ?? slug;
  }
  const [editing, setEditing] = useState<TemplateDTO | "new" | null>(null);
  const [form, setForm] = useState<FormState>(() => makeEmptyForm());
  const [newMediaId, setNewMediaId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function close() {
    if (newMediaId) {
      fetch(`/api/admin/templates/media/${newMediaId}`, { method: "DELETE" }).catch(() => null);
    }
    setNewMediaId(null);
    setEditing(null);
    setError(null);
  }

  function open(template: TemplateDTO | "new") {
    setNewMediaId(null);
    setEditing(template);
    if (template === "new") {
      setForm(makeEmptyForm());
    } else {
      setForm({
        name: template.name,
        type: template.type,
        content: template.content,
        mediaId: template.mediaId ?? "",
        mediaUrl: template.mediaUrl ?? template.imageUrl ?? "",
        mediaMimeType: template.mediaMimeType ?? template.imageMimeType ?? "",
        mediaFileName: template.mediaFileName ?? "",
        imageId: template.imageId ?? "",
        isActive: template.isActive,
      });
    }
    setError(null);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/templates/media", { method: "POST", body });
      const data = (await response.json()) as {
        media?: { id: string; url: string; mimeType: string; fileName: string };
        error?: string;
      };
      if (!response.ok || !data.media) {
        setError(data.error ?? "No se pudo subir el archivo");
        return;
      }
      if (newMediaId) {
        fetch(`/api/admin/templates/media/${newMediaId}`, { method: "DELETE" }).catch(() => null);
      }
      setNewMediaId(data.media.id);
      setForm((current) => ({
        ...current,
        mediaId: data.media!.id,
        mediaUrl: data.media!.url,
        mediaMimeType: data.media!.mimeType,
        mediaFileName: data.media!.fileName,
        imageId: "",
      }));
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setUploading(false);
    }
  }

  async function removeMedia() {
    if (newMediaId) {
      await fetch(`/api/admin/templates/media/${newMediaId}`, { method: "DELETE" }).catch(() => null);
      setNewMediaId(null);
    }
    setForm((current) => ({
      ...current,
      mediaId: "",
      mediaUrl: "",
      mediaMimeType: "",
      mediaFileName: "",
      imageId: "",
    }));
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
      setNewMediaId(null);
      setEditing(null);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setSaving(false);
    }
  }

  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
                <th className="px-4 py-3 font-semibold">Adjunto</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {templates.map((template) => {
                const mime = template.mediaMimeType ?? template.imageMimeType;
                const attached = Boolean(template.mediaId || template.imageId);
                return (
                  <tr key={template.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{template.name}</p>
                      <p className="line-clamp-1 max-w-md text-xs text-muted">{template.content}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">{typeLabel(template.type)}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {attached ? (mime?.startsWith("video/") ? "🎬 Video" : "🖼️ Foto") : "—"}
                    </td>
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
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={close}>
          <form
            onSubmit={submit}
            onClick={(event) => event.stopPropagation()}
            className="grid max-h-[92vh] w-full max-w-4xl grid-cols-1 gap-5 overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl lg:grid-cols-2"
          >
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{editing === "new" ? "Nueva plantilla" : "Editar plantilla"}</h2>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Nombre</span>
                <input required minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Tipo</span>
                <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as TemplateType })} className={inputClass}>
                  {templateTypes.map((type) => <option key={type.id} value={type.slug}>{type.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted">Contenido</span>
                <textarea
                  required
                  rows={12}
                  maxLength={4000}
                  value={form.content}
                  onChange={(event) => setForm({ ...form, content: event.target.value })}
                  className={`${inputClass} h-auto min-h-[220px] resize-y py-2 leading-relaxed`}
                />
                <span className="text-[11px] text-muted">{form.content.length} / 4000 caracteres · se permiten emojis y texto plano (sin HTML).</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm({ ...form, content: form.content + emoji })}
                    className="h-8 w-8 rounded-lg border border-border bg-background text-base hover:bg-surface-soft"
                    title={`Añadir ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted">Imagen o video propio</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void uploadFile(file);
                  }}
                  className="block w-full text-xs text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
                />
                {uploading ? <p className="text-[11px] text-muted">Subiendo a Drive…</p> : null}
                {form.mediaUrl ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <span className="min-w-0 truncate text-xs">
                      {form.mediaMimeType.startsWith("video/") ? "🎬" : "🖼️"} {form.mediaFileName || "Adjunto"}
                    </span>
                    <button type="button" onClick={() => void removeMedia()} className="shrink-0 text-xs font-medium text-red-700 hover:underline">
                      Quitar
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted">JPEG, PNG, WebP o MP4/WebM/MOV · hasta 5 MB (foto) o 50 MB (video). Se guarda en Drive.</p>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                Activa
              </label>
              {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Vista previa en WhatsApp</p>
              <div className="flex-1 rounded-xl border border-border bg-[#e5ddd5] p-4">
                <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-[#dcf8c6] p-3 text-sm text-slate-900 shadow-sm">
                  {form.mediaUrl ? (
                    <div className="mb-2 overflow-hidden rounded-lg bg-black">
                      {form.mediaMimeType.startsWith("video/") ? (
                        <video src={form.mediaUrl} controls preload="metadata" className="max-h-56 w-full" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.mediaUrl} alt="Adjunto de la plantilla" className="max-h-56 w-full object-cover" />
                      )}
                    </div>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words">{form.content || "Escribe el contenido de la plantilla…"}</p>
                  <p className="mt-1 text-right text-[10px] text-slate-500">{time} ✓✓</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={close} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
                <button type="submit" disabled={saving || uploading} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
