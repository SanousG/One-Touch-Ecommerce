"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { inputClass } from "@/components/catalog/products-view";
import type { ConversationDTO, ConversationDetailDTO } from "@/lib/whatsapp/conversations";

type ContextProduct = { sku: string; variantId: string; productName: string; variantName: string; price: string };

type TemplateOption = {
  id: string;
  name: string;
  type: string;
  content: string;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFileName: string | null;
  imageUrl: string | null;
  imageMimeType: string | null;
};

type Props = {
  conversations: ConversationDTO[];
  detail: ConversationDetailDTO | null;
  connection: { hasConfiguredConnection: boolean; status: string; verified: boolean };
  templates: TemplateOption[];
  users: Array<{ id: string; name: string }>;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Por atender",
  HUMAN: "En atención humana",
  RESOLVED: "Resuelta",
};

export function InboxView({ conversations, detail, connection, templates, users }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [attachMenu, setAttachMenu] = useState(false);
  const [fileKind, setFileKind] = useState<"image" | "video">("image");
  const [templatePanel, setTemplatePanel] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const sendingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelRef = useRef(false);

  const acceptByKind: Record<typeof fileKind, string> = {
    image: "image/jpeg,image/png,image/webp,image/gif",
    video: "video/mp4,video/3gpp",
  };

  function chooseFile(kind: typeof fileKind) {
    setAttachMenu(false);
    setTemplatePanel(false);
    setRecordedAudio(null);
    setFileKind(kind);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function chooseTemplate() {
    setAttachMenu(false);
    setAttachment(null);
    setRecordedAudio(null);
    setTemplatePanel(true);
  }

  async function loadTemplate(template: TemplateOption) {
    setTemplatePanel(false);
    setError(null);
    setRecordedAudio(null);
    setDraft(template.content);
    const url = template.mediaUrl ?? (template.imageMimeType ? template.imageUrl : null);
    const mime = template.mediaMimeType ?? template.imageMimeType;
    if (!url || !mime) {
      setAttachment(null);
      return;
    }
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error("No se pudo descargar el adjunto");
      const blob = await response.blob();
      setAttachment(new File([blob], template.mediaFileName ?? "plantilla", { type: mime }));
    } catch {
      setAttachment(null);
      setError("No se pudo cargar el adjunto de la plantilla");
    }
  }

  async function startRecording() {
    setAttachMenu(false);
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Tu navegador no permite grabar audio desde el micrófono");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ["audio/ogg;codecs=opus", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      chunksRef.current = [];
      cancelRef.current = false;
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const rawMime = recorder.mimeType || preferred || "audio/webm";
        const mimeType = rawMime.split(";")[0].trim().toLowerCase();
        const extension = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
        if (!cancelRef.current) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setRecordedAudio(new File([blob], `nota-de-voz.${extension}`, { type: mimeType }));
          setAttachment(null);
        }
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setRecording(false);
        setRecordingSeconds(0);
      };
      recorder.start();
      recorderRef.current = recorder;
      streamRef.current = stream;
      setAttachment(null);
      setRecordedAudio(null);
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    } catch {
      setError("No se pudo acceder al micrófono");
    }
  }

  function stopRecording(cancel = false) {
    cancelRef.current = cancel;
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    else if (cancel) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setRecordedAudio(null);
      setRecording(false);
    }
  }

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  async function post(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) { setError(data.error ?? "Acción no permitida"); return; }
      setStatus("Acción registrada.");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!detail || sendingRef.current || recording) return;
    const text = draft;
    const file = attachment;
    const audio = recordedAudio;
    if (!text.trim() && !file && !audio) return;

    sendingRef.current = true;
    setBusy(true);
    setError(null);
    setStatus(null);
    let sent = false;
    try {
      if (audio) {
        const form = new FormData();
        form.set("file", audio);
        const response = await fetch(`/api/admin/conversations/${detail.id}/audio`, { method: "POST", body: form });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) { setError(data.error ?? "No se pudo enviar el audio"); return; }
        setRecordedAudio(null);
        setStatus("Audio encolado para envío.");
        sent = true;
      } else if (file) {
        const isVideo = file.type.startsWith("video/");
        const form = new FormData();
        form.set("file", file);
        form.set("caption", text);
        const response = await fetch(`/api/admin/conversations/${detail.id}/${isVideo ? "video" : "image"}`, { method: "POST", body: form });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) { setError(data.error ?? "No se pudo enviar el mensaje"); return; }
        setAttachment(null);
        setDraft("");
        setStatus(`${isVideo ? "Video" : "Imagen"} con texto encolado para envío.`);
        sent = true;
      } else {
        const response = await fetch(`/api/admin/conversations/${detail.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) { setError(data.error ?? "No se pudo encolar el mensaje"); return; }
        setDraft("");
        setStatus("Mensaje encolado para envío.");
        sent = true;
      }
      if (sent) router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  }

  const products = (detail?.context?.products ?? []) as ContextProduct[];

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] w-full max-w-[1600px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conversaciones</h1>
          <p className="text-xs text-muted">Bandeja de atención humana. Actualización automática cada 6 segundos.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${connection.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {connection.hasConfiguredConnection
            ? `${connection.verified ? "WhatsApp conectado" : "WhatsApp " + connection.status.toLowerCase()}`
            : "Sin conexión WasenderAPI"}
        </span>
      </div>

      {error ? <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p> : null}
      {status ? <p role="status" className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{status}</p> : null}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <aside className="flex w-[290px] shrink-0 flex-col border-r border-border">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Icon name="search" size={17} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Buscar cliente o chat" className={`${inputClass} pl-8`} onChange={(event) => {
                const q = event.target.value;
                router.replace(q ? `/dashboard/conversations?q=${encodeURIComponent(q)}` : "/dashboard/conversations");
              }} />
            </div>
            <div className="mt-2 flex gap-1 text-xs">
              {[["", "Todas"], ["PENDING", "Por atender"], ["HUMAN", "En atención"]].map(([value, label]) => (
                <button key={value} type="button" onClick={() => router.replace(value ? `/dashboard/conversations?status=${value}` : "/dashboard/conversations")} className="rounded-lg bg-background px-2 py-1 text-muted hover:text-primary">
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-4 text-xs text-muted">No hay conversaciones. Aparecerán cuando un cliente escriba al WhatsApp conectado.</p>
            ) : conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/dashboard/conversations?conversation=${conversation.id}`}
                className={`block border-b border-border p-3 text-sm ${detail?.id === conversation.id ? "bg-primary-soft" : "hover:bg-background"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold">{conversation.contactName}</span>
                  <span className="shrink-0 text-[10px] text-muted">{new Date(conversation.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <p className="truncate text-xs text-muted">{conversation.lastMessage ?? "Sin mensajes"}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted">{STATUS_LABELS[conversation.status] ?? conversation.status}</span>
                  {conversation.unreadCount > 0 ? <span className="rounded-full bg-primary px-1.5 text-[10px] text-white">{conversation.unreadCount}</span> : null}
                </div>
              </Link>
            ))}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-background/40">
          {!detail ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">Seleccione una conversación para ver el historial.</div>
          ) : (
            <>
              <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{detail.contactName}</p>
                  <p className="truncate text-xs text-muted">
                    {detail.contactPhone ?? detail.contactLid ?? "Identidad externa"} · {STATUS_LABELS[detail.status] ?? detail.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.status === "PENDING" || !detail.assignedTo ? (
                    <button type="button" disabled={busy} onClick={() => post(`/api/admin/conversations/${detail.id}/action`, { action: "TAKE" })} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Tomar</button>
                  ) : null}
                  {detail.status !== "RESOLVED" ? (
                    <button type="button" disabled={busy} onClick={() => post(`/api/admin/conversations/${detail.id}/action`, { action: "RESOLVE" })} className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50">Resolver</button>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => post(`/api/admin/conversations/${detail.id}/action`, { action: "REOPEN" })} className="rounded-lg border border-border px-3 py-1.5 text-xs disabled:opacity-50">Reabrir</button>
                  )}
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {detail.messages.length === 0 ? <p className="text-xs text-muted">Aún no hay mensajes en esta conversación.</p> : detail.messages.map((message) => (
                  <div key={message.id} className={`flex ${message.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm shadow-sm ${message.direction === "OUTBOUND" ? "rounded-br-none bg-primary text-white" : "rounded-bl-none border border-border bg-surface"}`}>
                      <p className="mb-1 text-[10px] opacity-70">{message.author ?? (message.direction === "OUTBOUND" ? "Vendedor" : "Cliente")} · {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      {message.kind === "IMAGE" ? (
                        message.media?.status === "ready" && message.media.path ? (
                          <ImageBubble
                            src={`/api/admin/conversations/${detail.id}/media/${message.id}`}
                            fileName={message.media.fileName ?? "Foto del mensaje"}
                            onOpen={(alt) => setLightbox({ src: `/api/admin/conversations/${detail.id}/media/${message.id}`, alt })}
                          />
                        ) : (
                          <p className="mb-1 italic opacity-70">[Foto no disponible]</p>
                        )
                      ) : null}
                      {message.kind === "VIDEO" ? (
                        message.media?.status === "ready" && message.media.path ? (
                          <video
                            src={`/api/admin/conversations/${detail.id}/media/${message.id}`}
                            controls
                            preload="metadata"
                            className="mb-1 max-h-64 w-full rounded-lg bg-black"
                          />
                        ) : (
                          <p className="mb-1 italic opacity-70">[Video no disponible]</p>
                        )
                      ) : null}
                      {message.kind === "AUDIO" ? (
                        message.media?.status === "ready" && message.media.path ? (
                          <audio
                            src={`/api/admin/conversations/${detail.id}/media/${message.id}`}
                            controls
                            preload="metadata"
                            className="mb-1 w-full max-w-[240px]"
                          />
                        ) : (
                          <p className="mb-1 italic opacity-70">[Audio no disponible]</p>
                        )
                      ) : null}
                      {message.content ? <p className="whitespace-pre-wrap">{message.content}</p> : null}
                      {!message.content && !["IMAGE", "VIDEO", "AUDIO"].includes(message.kind) ? <p className="whitespace-pre-wrap">(sin texto)</p> : null}
                      <p className="mt-1 text-[10px] opacity-70">{message.status}</p>
                    </div>
                  </div>
                ))}
                {detail.events.map((event) => (
                  <div key={event.id} className="flex justify-center">
                    <span className="rounded-full bg-surface px-3 py-1 text-[10px] text-muted">{event.description}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border bg-surface p-3">
                <div className="rounded-lg border border-border bg-background p-2">
                  {(attachment || recordedAudio || recording) ? (
                    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-xs">
                      {recording ? (
                        <>
                          <span className="text-red-700">🎤 Grabando {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</span>
                          <button type="button" onClick={() => stopRecording()} className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white">Detener</button>
                          <button type="button" onClick={() => stopRecording(true)} className="rounded-lg border border-border px-3 py-1 text-xs">Cancelar</button>
                        </>
                      ) : recordedAudio ? (
                        <>
                          <span className="truncate">🎤 Nota de voz · {(recordedAudio.size / 1024 / 1024).toFixed(2)} MB</span>
                          <button type="button" onClick={() => setRecordedAudio(null)} className="ml-auto text-muted hover:text-red-700" title="Quitar audio">×</button>
                        </>
                      ) : (
                        <>
                          <span className="truncate">
                            {attachment?.type.startsWith("video/") ? "🎬" : "🖼️"} {attachment?.name} ({((attachment?.size ?? 0) / 1024 / 1024).toFixed(2)} MB)
                          </span>
                          <button type="button" onClick={() => setAttachment(null)} className="ml-auto text-muted hover:text-red-700" title="Quitar archivo">×</button>
                        </>
                      )}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        title="Añadir imagen, video, audio o plantilla"
                        disabled={busy || !connection.verified || recording}
                        onClick={() => setAttachMenu((open) => !open)}
                        className="rounded-lg border border-border p-2 text-muted hover:bg-surface hover:text-primary disabled:opacity-50"
                      >
                        <Icon name="plus" size={18} />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={acceptByKind[fileKind]}
                        className="hidden"
                        disabled={busy || !connection.verified}
                        onChange={(event) => {
                          setAttachment(event.target.files?.[0] ?? null);
                          setRecordedAudio(null);
                          event.currentTarget.value = "";
                        }}
                      />
                      {attachMenu ? (
                        <>
                          <button type="button" aria-label="Cerrar menú" className="fixed inset-0 z-10 cursor-default" onClick={() => setAttachMenu(false)} />
                          <div className="absolute bottom-full left-0 z-20 mb-2 w-44 rounded-lg border border-border bg-surface p-1 shadow-lg">
                            <button type="button" onClick={() => chooseFile("image")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-background">
                              <span>🖼️</span> Imagen
                            </button>
                            <button type="button" onClick={() => chooseFile("video")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-background">
                              <span>🎬</span> Video
                            </button>
                            <button type="button" onClick={() => void startRecording()} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-background">
                              <span>🎤</span> Audio (micrófono)
                            </button>
                            <button type="button" onClick={chooseTemplate} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-background">
                              <span>💬</span> Plantilla
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                    <input
                      value={draft}
                      disabled={busy || recording || Boolean(recordedAudio)}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void send();
                        }
                      }}
                      placeholder={recordedAudio ? "La nota de voz se envía sin texto" : "Escribe un mensaje..."}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => void send()}
                      disabled={busy || recording || !connection.verified || (!draft.trim() && !attachment && !recordedAudio)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Enviar <Icon name="arrow" size={15} />
                    </button>
                  </div>
                  {templatePanel ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-2 text-xs">
                      <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className={`${inputClass} max-w-xs`}>
                        <option value="">Elegir plantilla…</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} · {template.mediaMimeType?.startsWith("video/") ? "🎬" : template.mediaMimeType ? "🖼️" : "💬"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!templateId}
                        onClick={() => {
                          const template = templates.find((item) => item.id === templateId);
                          if (template) void loadTemplate(template);
                        }}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Cargar en el mensaje
                      </button>
                      <button type="button" onClick={() => setTemplatePanel(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cerrar</button>
                      <span className="text-muted">El texto y el adjunto quedan listos para enviar con «Enviar».</span>
                    </div>
                  ) : null}
                </div>
              </div>
              {!connection.verified ? <p className="px-3 pb-3 text-[11px] text-amber-700">La conexión no está verificada; no se pueden encolar mensajes.</p> : null}
            </>
          )}
        </section>

        <aside className="flex w-[330px] shrink-0 flex-col overflow-y-auto border-l border-border p-4">
          <h2 className="text-sm font-semibold">Contexto de venta</h2>
          {!detail ? <p className="mt-2 text-xs text-muted">Sin datos.</p> : (
            <>
              <p className="mt-1 text-xs text-muted">Datos reales detectados en el mensaje.</p>
              <div className="mt-4 space-y-2">
                {products.length === 0 ? (
                  <p className="rounded-lg bg-background p-3 text-xs text-muted">No se identificaron SKUs del catálogo en los mensajes.</p>
                ) : products.map((product) => (
                  <div key={product.sku} className="rounded-lg border border-border p-3 text-xs">
                    <p className="font-semibold">{product.productName}</p>
                    <p className="text-muted">{product.variantName} · {product.sku}</p>
                    <p className="text-primary">S/ {product.price} (catálogo vigente)</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-background p-3 text-xs text-muted">
                <p className="font-semibold text-foreground">Pedidos vinculados: {detail.orders.length}</p>
                {detail.orders.map((order) => (
                  <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="mt-1 block text-primary hover:underline">#{order.orderNumber} · S/ {order.total}</Link>
                ))}
                <p className="mt-2">Atender la conversación no crea pedidos ni reserva stock.</p>
              </div>
              <div className="mt-4">
                <label className="text-xs font-medium text-muted">Transferir a</label>
                <select
                  className={inputClass}
                  defaultValue=""
                  onChange={(event) => event.target.value && post(`/api/admin/conversations/${detail.id}/action`, { action: "ASSIGN", userId: event.target.value })}
                >
                  <option value="">Seleccionar usuario…</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </div>
              {products.length > 0 ? (
                <button type="button" onClick={() => setShowOrder((value) => !value)} className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
                  Crear pedido manual
                </button>
              ) : null}
              {showOrder ? <OrderPrefill conversationId={detail.id} products={products} phone={detail.contactPhone ?? ""} name={detail.contactName} onDone={() => { setShowOrder(false); router.refresh(); }} /> : null}
            </>
          )}
        </aside>
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setLightbox(null)}
          role="presentation"
        >
          <button
            type="button"
            aria-label="Cerrar imagen"
            onClick={() => setLightbox(null)}
            className="absolute right-5 top-5 rounded-full bg-white/90 px-3 py-1 text-lg font-semibold text-slate-800 hover:bg-white"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[92vh] max-w-[92vw] rounded-lg bg-white object-contain shadow-2xl"
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/80">{lightbox.alt} · clic fuera o Esc para cerrar</p>
        </div>
      ) : null}
    </div>
  );
}

function ImageBubble({ src, fileName, onOpen }: { src: string; fileName: string; onOpen: (fileName: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(fileName)} className="mb-1 block cursor-zoom-in" title="Ver imagen en grande">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={fileName} className="max-h-64 max-w-full rounded-lg border border-border object-contain" />
    </button>
  );
}

function OrderPrefill({
  conversationId,
  products,
  phone,
  name,
  onDone,
}: {
  conversationId: string;
  products: ContextProduct[];
  phone: string;
  name: string;
  onDone: () => void;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(products.map((product) => [product.variantId, 1])),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/conversations/${conversationId}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          deliveryMode: "LOCAL",
          shippingCost: "0",
          paymentMethod: "CASH_ON_DELIVERY",
          requiresAdvance: false,
          items: products.map((product) => ({ variantId: product.variantId, quantity: quantities[product.variantId] })),
        }),
      });
      const data = (await response.json()) as { error?: string; order?: { id: string } };
      if (!response.ok || !data.order) { setError(data.error ?? "No se pudo crear el pedido"); return; }
      onDone();
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-border p-3">
      <p className="text-xs font-semibold">Datos precargados para revisión</p>
      {products.map((product) => (
        <label key={product.variantId} className="flex items-center justify-between text-xs">
          <span className="truncate">{product.productName}</span>
          <input
            type="number"
            min={1}
            value={quantities[product.variantId]}
            onChange={(event) => setQuantities({ ...quantities, [product.variantId]: Number(event.target.value) })}
            className="w-16 rounded border border-border px-2 py-1"
          />
        </label>
      ))}
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
      <button type="submit" disabled={busy} className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
        {busy ? "Creando…" : "Confirmar pedido"}
      </button>
    </form>
  );
}
