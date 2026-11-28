/** Sirve bytes con soporte de rangos para que los videos se reproduzcan en el navegador. */
export function fileResponse(request: Request, bytes: Buffer, mimeType: string): Response {
  const range = request.headers.get("range");
  const total = bytes.length;
  const headers = new Headers({
    "Content-Type": mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : total - 1;
      if (!Number.isNaN(start) && !Number.isNaN(end) && start >= 0 && start <= end && start < total) {
        const safeEnd = Math.min(end, total - 1);
        headers.set("Content-Range", `bytes ${start}-${safeEnd}/${total}`);
        headers.set("Content-Length", String(safeEnd - start + 1));
        return new Response(new Uint8Array(bytes.subarray(start, safeEnd + 1)), { status: 206, headers });
      }
    }
  }

  headers.set("Content-Length", String(total));
  return new Response(new Uint8Array(bytes), { headers });
}
