"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { ProductDTO, ProductImageDTO } from "@/lib/catalog/service";

type Props = { product: ProductDTO; onUpdated: (product: ProductDTO) => void };

export function ImageManager({ product, onUpdated }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(url: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, init);
      const data = (await response.json()) as { product?: ProductDTO; error?: string };
      if (!response.ok || !data.product) {
        setError(data.error ?? "No se pudo actualizar la galería");
        return;
      }
      onUpdated(data.product);
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    const form = new FormData();
    form.set("file", file);
    await request(`/api/admin/products/${product.id}/images`, { method: "POST", body: form });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= product.images.length) return;
    const ids = product.images.map((image) => image.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    request(`/api/admin/products/${product.id}/images/${product.images[index].id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: ids }),
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <Icon name="image" size={20} className="text-primary" />
        <h2 className="text-sm font-semibold">Fotos y videos del catálogo</h2>
      </div>
      <p className="mb-4 text-xs text-muted">
        La portada se elige entre las fotos. Fotos JPG/PNG/WebP hasta 5 MB; videos MP4/WebM/MOV hasta 50 MB.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {product.images.map((image, index) => (
          <ImageCard
            key={image.id}
            image={image}
            busy={busy}
            onCover={() =>
              request(`/api/admin/products/${product.id}/images/${image.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isCover: true }),
              })
            }
            onMoveLeft={() => move(index, -1)}
            onMoveRight={() => move(index, 1)}
            onRemove={() =>
              request(`/api/admin/products/${product.id}/images/${image.id}`, { method: "DELETE" })
            }
          />
        ))}
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background text-center hover:bg-surface-soft">
          <Icon name="upload" size={22} className="mb-2 text-primary" />
          <span className="text-sm font-semibold">Añadir foto</span>
          <span className="mt-1 text-[11px] text-muted">JPG / PNG / WebP · máx. 5 MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
              event.target.value = "";
            }}
          />
        </label>
        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background text-center hover:bg-surface-soft">
          <span className="mb-2 text-2xl text-primary">▶</span>
          <span className="text-sm font-semibold">Añadir video</span>
          <span className="mt-1 text-[11px] text-muted">MP4 / WebM / MOV · máx. 50 MB</span>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {error ? <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </section>
  );
}

function ImageCard({
  image,
  busy,
  onCover,
  onMoveLeft,
  onMoveRight,
  onRemove,
}: {
  image: ProductImageDTO;
  busy: boolean;
  onCover: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
}) {
  const isVideo = image.mimeType.startsWith("video/");
  const source = `/api/admin/products/images/${image.id}/file`;
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className={`relative aspect-square ${isVideo ? "bg-slate-900" : "bg-surface-soft"}`}>
        {isVideo ? (
          <>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-xl text-white ring-1 ring-white/30">▶</span>
            </span>
            <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white">VIDEO</span>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source} alt={image.fileName} className="h-full w-full object-cover" />
        )}
        {image.isCover ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
            <Icon name="star" size={13} /> Portada
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-1 p-2">
        <span className="truncate text-[11px] text-muted" title={image.fileName}>{image.fileName}</span>
        <span className="shrink-0 font-mono text-[10px] text-slate-400">{Math.round(image.sizeBytes / 1024)} KB</span>
      </div>
      <div className="flex items-center justify-center gap-1 border-t border-border p-1.5">
        {!image.isCover && !isVideo ? (
          <button type="button" disabled={busy} onClick={onCover} title="Hacer portada" className="rounded p-1.5 text-muted hover:bg-surface hover:text-primary">
            <Icon name="star" size={15} />
          </button>
        ) : null}
        <button type="button" disabled={busy} onClick={onMoveLeft} title="Mover a la izquierda" className="rounded p-1.5 text-muted hover:bg-surface">
          <Icon name="moveLeft" size={15} />
        </button>
        <button type="button" disabled={busy} onClick={onMoveRight} title="Mover a la derecha" className="rounded p-1.5 text-muted hover:bg-surface">
          <Icon name="moveRight" size={15} />
        </button>
        <button type="button" disabled={busy} onClick={onRemove} title="Quitar imagen" className="rounded p-1.5 text-red-500 hover:bg-red-50">
          <Icon name="trash" size={15} />
        </button>
      </div>
    </div>
  );
}
