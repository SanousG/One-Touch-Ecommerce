import "server-only";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const ROOT_FOLDER = "OneTouch";
const APP_FOLDER = "One-Touch-Ecommerce";

let cachedToken: { value: string; expiresAt: number } | null = null;
const folderCache = new Map<string, string>();

export class DriveError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
    this.name = "DriveError";
  }
}

function driveConfig() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const refreshToken = (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || "").trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new DriveError("Google Drive no está configurado (faltan variables GOOGLE_*)", 500);
  }
  return { clientId, clientSecret, refreshToken };
}

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { clientId, clientSecret, refreshToken } = driveConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as { access_token?: string; error?: string } | null;
  if (!response.ok || !payload?.access_token) {
    if (payload?.error === "invalid_grant") throw new DriveError("La conexión con Google Drive caducó o fue revocada", 401);
    throw new DriveError("No se pudo autenticar Google Drive", 502);
  }
  cachedToken = { value: payload.access_token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return payload.access_token;
}

function quote(value: string) {
  return `'${value.replace(/'/g, "\\'")}'`;
}

async function findFolder(token: string, name: string, parentId: string | null): Promise<string | null> {
  const q = [
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `name = ${quote(name)}`,
    `${quote(parentId ?? "root")} in parents`,
  ].join(" and ");
  const params = new URLSearchParams({ q, fields: "files(id)", pageSize: "1" });
  const response = await fetch(`${DRIVE_API}/files?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new DriveError("No se pudo buscar una carpeta en Google Drive");
  const payload = (await response.json().catch(() => null)) as { files?: Array<{ id: string }> } | null;
  return payload?.files?.[0]?.id ?? null;
}

async function createFolder(token: string, name: string, parentId: string | null): Promise<string> {
  const response = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  });
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  if (!response.ok || !payload?.id) throw new DriveError("No se pudo crear una carpeta en Google Drive");
  return payload.id;
}

/** Asegura la cadena OneTouch/One-Touch-Ecommerce/<...> y devuelve el ID final. */
export async function ensureDriveFolder(segments: string[]): Promise<string> {
  const token = await accessToken();
  const chain = [ROOT_FOLDER, APP_FOLDER, ...segments.map((s) => s.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "item")];
  let parent: string | null = null;
  for (const name of chain) {
    const key = `${parent ?? "root"}/${name}`;
    let id = folderCache.get(key);
    if (!id) {
      id = (await findFolder(token, name, parent)) ?? (await createFolder(token, name, parent));
      folderCache.set(key, id);
    }
    parent = id;
  }
  return parent!;
}

/** Sube bytes a Drive y devuelve el fileId (referencia que se guarda en la BD). */
export async function uploadToDrive(input: {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  folderSegments: string[];
  makePublic?: boolean;
}): Promise<{ fileId: string; publicUrl: string | null }> {
  const token = await accessToken();
  const folderId = await ensureDriveFolder(input.folderSegments);
  const metadata = { name: input.fileName.slice(0, 180), parents: [folderId] };
  const form = new FormData();
  form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.set("file", new Blob([new Uint8Array(input.bytes)], { type: input.mimeType }), input.fileName.slice(0, 180));
  const response = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,mimeType`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  if (!response.ok || !payload?.id) throw new DriveError("No se pudo subir el archivo a Google Drive");
  if (input.makePublic) await makeDriveFilePublic(payload.id);
  return {
    fileId: payload.id,
    publicUrl: input.makePublic ? `https://drive.google.com/uc?export=download&id=${payload.id}` : null,
  };
}

export async function downloadFromDrive(fileId: string): Promise<{ bytes: Buffer; mimeType: string }> {
  const token = await accessToken();
  const metaResponse = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,mimeType`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const meta = (await metaResponse.json().catch(() => null)) as { mimeType?: string } | null;
  if (!metaResponse.ok) throw new DriveError("No se encontró el archivo en Google Drive", 404);
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new DriveError("No se pudo descargar el archivo de Google Drive");
  return { bytes: Buffer.from(await response.arrayBuffer()), mimeType: meta?.mimeType || "application/octet-stream" };
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  const token = await accessToken();
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) throw new DriveError("No se pudo eliminar el archivo de Google Drive");
}

export async function makeDriveFilePublic(fileId: string): Promise<void> {
  const token = await accessToken();
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  if (!response.ok) throw new DriveError("No se pudo crear el enlace público de Google Drive");
}

export function isDriveKey(storageKey: string | null | undefined): boolean {
  return typeof storageKey === "string" && storageKey.startsWith("drive:");
}

export function driveFileId(storageKey: string): string {
  return storageKey.slice("drive:".length);
}
